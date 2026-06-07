import { NextResponse } from 'next/server'
import { authMiddleware } from 'lyzr-architect'

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

function tally(rows: Record<string, string>[], field: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const v = String(r[field] || '').trim()
    if (!v) continue
    out[v] = (out[v] || 0) + 1
  }
  return out
}

export const GET = authMiddleware(async () => {
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
    const total_rows = rows.length

    // Trigger counts (normalize lowercased+trimmed)
    const triggerMap: Record<string, number> = {}
    for (const r of rows) {
      const raw = String(r['inactive_trigger_comment'] || '').trim().toLowerCase()
      if (!raw) continue
      triggerMap[raw] = (triggerMap[raw] || 0) + 1
    }
    const trigger_counts = Object.keys(triggerMap)
      .map((trigger) => ({ trigger, count: triggerMap[trigger] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const roles = tally(rows, 'role_status')
    const role_distribution = Object.keys(roles)
      .map((role) => ({ role, count: roles[role] }))
      .sort((a, b) => b.count - a.count)

    const bg = tally(rows, 'blood_group')
    const blood_group_distribution = Object.keys(bg)
      .map((type) => ({ type, count: bg[type] }))
      .sort((a, b) => b.count - a.count)

    const elig = tally(rows, 'eligibility_status')
    const eligibility_distribution = Object.keys(elig)
      .map((status) => ({ status, count: elig[status] }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      success: true,
      data: {
        trigger_counts,
        role_distribution,
        blood_group_distribution,
        eligibility_distribution,
        total_rows,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Dataset analytics failed' },
      { status: 500 }
    )
  }
})
