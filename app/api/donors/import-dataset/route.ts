import { NextResponse } from 'next/server'
import { authMiddleware, getCurrentUserId } from 'lyzr-architect'
import getDonorModel from '@/models/Donor'

export const dynamic = 'force-dynamic'

const DATASET_URL = 'https://asset.lyzr.app/3ULfWARD'

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []
  const headers = splitCsvLine(lines[0])
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (cols[idx] ?? '').trim()
    })
    rows.push(row)
  }
  return rows
}

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

function safeDate(s: string): Date | null {
  if (!s) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d
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
    const allRows = parseCsv(csv)
    const totalRows = allRows.length
    const rows = allRows.slice(0, 80)

    const Donor = await getDonorModel()
    let imported = 0
    let skipped = 0

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const userId = String(r['user_id'] || '').trim()
      const bloodType = String(r['blood_group'] || '').trim() || 'O+'
      const lastDon = safeDate(String(r['last_donation_date'] || ''))
      const latitude = String(r['latitude'] || '').trim()
      const longitude = String(r['longitude'] || '').trim()
      const eligibility = String(r['eligibility_status'] || '').trim()
      const activeStatus = String(r['user_donation_active_status'] || '').trim()
      const roleStatus = String(r['role_status'] || '').trim()
      const freq = String(r['frequency_in_days'] || '').trim()
      const gender = String(r['gender'] || '').trim()
      const donationsTill = String(r['donations_till_date'] || '0').trim()
      const triggerComment = String(r['inactive_trigger_comment'] || '').trim()
      const bridgeId = String(r['bridge_id'] || '').trim()

      const synthName = `Donor ${userId.slice(0, 6) || String(i)}`
      const isActive =
        eligibility === 'Eligible' || activeStatus === 'Active'
          ? 'Available'
          : 'Inactive'

      // Dedupe by name + blood_type (since custom fields may be stripped by strict schema)
      const existing = await Donor.findOne({
        name: synthName,
        blood_type: bloodType,
      }).lean()
      if (existing) {
        skipped++
        continue
      }

      const locStr = latitude && longitude ? `${latitude},${longitude}` : ''

      try {
        await Donor.create({
          name: synthName,
          blood_type: bloodType,
          last_donation: lastDon,
          contact: '',
          location: locStr,
          status: isActive,
          email: '',
          owner_user_id: getCurrentUserId(),
          // Extras (may be stored if strict mode allows)
          donations_till_date: Number(donationsTill) || 0,
          donor_type: roleStatus,
          frequency_in_days: Number(freq) || 0,
          gender,
          latitude: Number(latitude) || 0,
          longitude: Number(longitude) || 0,
          inactive_trigger_comment: triggerComment,
          dataset_user_id: userId,
          dataset_bridge_id: bridgeId,
        })
        imported++
      } catch {
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      data: { imported, skipped, total: totalRows },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Donor dataset import failed' },
      { status: 500 }
    )
  }
})
