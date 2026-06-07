import { NextResponse } from 'next/server'
import { authMiddleware, getCurrentUserId } from 'lyzr-architect'
import getBridgeModel from '@/models/Bridge'

export const dynamic = 'force-dynamic'

const DATASET_URL = 'https://asset.lyzr.app/3ULfWARD'

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out
}

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.trim())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] ?? '').trim()
    })
    rows.push(row)
  }
  return rows
}

function mostCommon(values: string[]): string {
  const counts: Record<string, number> = {}
  for (const v of values) {
    if (!v) continue
    counts[v] = (counts[v] || 0) + 1
  }
  let best = ''
  let max = 0
  for (const k of Object.keys(counts)) {
    if (counts[k] > max) {
      max = counts[k]
      best = k
    }
  }
  return best || 'O+'
}

function mapBridgeStatus(s: string): 'healthy' | 'at-risk' | 'critical' {
  const v = (s || '').trim()
  if (v === 'At Risk') return 'at-risk'
  if (v === 'Critical') return 'critical'
  return 'healthy'
}

function deriveDonorStatus(healthPct: number): 'healthy' | 'at-risk' | 'critical' {
  if (healthPct < 40) return 'critical'
  if (healthPct < 70) return 'at-risk'
  return 'healthy'
}

function safeDateStr(s: string): string | null {
  if (!s) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

export const POST = authMiddleware(async () => {
  try {
    const res = await fetch(DATASET_URL, { cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch dataset (${res.status})` },
        { status: 500 }
      )
    }
    const csv = await res.text()
    const rows = parseCsv(csv)
    const total = rows.length

    // Group by bridge_id
    const groups: Record<string, Record<string, string>[]> = {}
    for (const r of rows) {
      const bid = String(r['bridge_id'] || '').trim()
      if (!bid) continue
      if (!groups[bid]) groups[bid] = []
      groups[bid].push(r)
    }
    const uniqueBridgeIds = Object.keys(groups).slice(0, 20)

    const Bridge = await getBridgeModel()
    let imported = 0
    let skipped = 0

    for (const bid of uniqueBridgeIds) {
      const group = groups[bid]
      const bridgeName = `Bridge ${bid.slice(0, 8)}`

      const existing = await Bridge.findOne({ bridge_name: bridgeName }).lean()
      if (existing) {
        skipped++
        continue
      }

      const bloodType = mostCommon(group.map((r) => r['blood_group'] || ''))
      const status = mapBridgeStatus(group[0]?.['bridge_status'] || '')
      const primaryDonors = group.filter(
        (r) => (r['role_status'] || '').trim() === 'Bridge Donor'
      ).length
      const backupDonors = group.filter(
        (r) => (r['role_status'] || '').trim() === 'Emergency Donor'
      ).length

      const sumDonations = group.reduce(
        (s, r) => s + (Number(r['donations_till_date']) || 0),
        0
      )
      const sumCalls = group.reduce(
        (s, r) => s + (Number(r['total_calls']) || 0),
        0
      )
      let reliability = 75
      if (sumCalls > 0) {
        const ratio = (sumDonations / sumCalls) * 100
        reliability = Math.max(0, Math.min(100, Math.round(ratio)))
      }

      const donorHealth = group.slice(0, 5).map((r) => {
        const dt = Number(r['donations_till_date']) || 0
        const healthPct = 50 + (dt % 50)
        return {
          name: 'Donor ' + String(r['user_id'] || '').slice(0, 6),
          health_percent: healthPct,
          status: deriveDonorStatus(healthPct),
          sensors: 1,
          next_date: safeDateStr(r['next_eligible_date'] || ''),
        }
      })

      try {
        await Bridge.create({
          bridge_name: bridgeName,
          patient_id: '',
          patient_name: '',
          blood_type: bloodType,
          status,
          primary_donors: primaryDonors,
          backup_donors: backupDonors,
          reliability,
          coordinator: '',
          coordinator_phone: '',
          next_transfusion: null,
          donor_health: donorHealth,
          owner_user_id: getCurrentUserId(),
        })
        imported++
      } catch {
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      data: { imported, skipped, total },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Bridge dataset import failed' },
      { status: 500 }
    )
  }
})
