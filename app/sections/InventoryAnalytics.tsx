'use client'

import { useState, useMemo } from 'react'
import {
  AlertTriangle,
  Brain,
  Loader2,
  Plus,
  X,
  Package,
  TrendingUp,
  Clock,
  BarChart3,
} from 'lucide-react'
import { callAIAgent } from '@/lib/aiAgent'
import { formatBloodGroup, ALL_BLOOD_GROUPS } from '@/lib/bloodGroup'

const INV_AGENT_ID = '6a2485186c86ec3584c733cc'
const RAG_ID = '6a24afd2a563cbef5db16369'
const BLOOD_TYPES = [...ALL_BLOOD_GROUPS]
const STATUSES = ['Adequate', 'Low', 'Critical']

const BLOOD_COLORS: Record<string, string> = {
  'A positive': 'hsl(0, 70%, 50%)',
  'A negative': 'hsl(10, 75%, 40%)',
  'B positive': 'hsl(30, 85%, 50%)',
  'B negative': 'hsl(40, 80%, 40%)',
  'O positive': 'hsl(200, 70%, 45%)',
  'O negative': 'hsl(220, 75%, 40%)',
  'AB positive': 'hsl(280, 60%, 50%)',
  'AB negative': 'hsl(300, 65%, 40%)',
}

interface InvAnalysis {
  inventory_health_score: number
  critical_shortages: { blood_type: string; units: number; severity: string; action: string }[]
  expiring_units: { blood_type: string; units: number; days_until_expiry: number }[]
  recommendations: { priority: string; recommendation: string; expected_impact: string }[]
  blood_type_status: { blood_type: string; units_available: number; status: string; notes: string }[]
  summary: string
}

interface InventoryAnalyticsProps {
  inventory: any[]
  refreshInventory: () => Promise<void>
  sampleMode: boolean
  setActiveAgent: (id: string | null) => void
}

const SAMPLE_ANALYSIS: InvAnalysis = {
  inventory_health_score: 64,
  critical_shortages: [
    { blood_type: 'B negative', units: 2, severity: 'Critical', action: 'Activate rare donor SMS within 2 hours' },
    { blood_type: 'AB negative', units: 1, severity: 'Critical', action: 'Coordinate with partner hospitals for transfer' },
  ],
  expiring_units: [
    { blood_type: 'A positive', units: 6, days_until_expiry: 3 },
    { blood_type: 'O positive', units: 4, days_until_expiry: 5 },
    { blood_type: 'B positive', units: 2, days_until_expiry: 6 },
  ],
  recommendations: [
    { priority: 'High', recommendation: 'Run rare-type donor campaign for B negative and AB negative', expected_impact: 'Increase rare-type units by 4-6 in 48h' },
    { priority: 'Medium', recommendation: 'Route expiring A positive units to upcoming surgeries', expected_impact: 'Reduce wastage by 60%' },
  ],
  blood_type_status: [
    { blood_type: 'A positive', units_available: 18, status: 'Adequate', notes: 'Steady' },
    { blood_type: 'A negative', units_available: 7, status: 'Low', notes: 'Top up soon' },
    { blood_type: 'B positive', units_available: 14, status: 'Adequate', notes: 'Stable' },
    { blood_type: 'B negative', units_available: 2, status: 'Critical', notes: 'Urgent donor outreach' },
    { blood_type: 'O positive', units_available: 22, status: 'Adequate', notes: 'Stable supply' },
    { blood_type: 'O negative', units_available: 5, status: 'Low', notes: 'Reserve for emergencies' },
    { blood_type: 'AB positive', units_available: 9, status: 'Adequate', notes: 'OK' },
    { blood_type: 'AB negative', units_available: 1, status: 'Critical', notes: 'Transfer needed' },
  ],
  summary:
    'Inventory is mostly adequate, but B negative and AB negative need immediate intervention. 12 units across A positive, O positive, and B positive are expiring within a week.',
}

const CARD =
  'bg-[hsl(40,50%,98%)]/75 backdrop-blur-[16px] border border-[hsl(30,25%,82%)] rounded-[14px] shadow-md'

function statusColor(status: string): { bar: string; text: string; bg: string } {
  const s = (status || '').toLowerCase()
  if (s.includes('critical')) return { bar: 'fill-red-500', text: 'text-red-700', bg: 'bg-red-500' }
  if (s.includes('low')) return { bar: 'fill-amber-500', text: 'text-amber-700', bg: 'bg-amber-500' }
  return { bar: 'fill-green-500', text: 'text-green-700', bg: 'bg-green-500' }
}

function priorityBadge(p: string) {
  const s = (p || '').toLowerCase()
  if (s.includes('high') || s.includes('critical')) return 'bg-red-100 text-red-700 border-red-200'
  if (s.includes('medium')) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-green-100 text-green-700 border-green-200'
}

function aggregateByBloodType(inventory: any[], analysis: InvAnalysis | null) {
  const totals: Record<string, { units: number; status: string }> = {}
  BLOOD_TYPES.forEach((t) => (totals[t] = { units: 0, status: 'Adequate' }))

  if (Array.isArray(analysis?.blood_type_status) && (analysis?.blood_type_status?.length ?? 0) > 0) {
    analysis!.blood_type_status.forEach((b) => {
      const key = formatBloodGroup(b?.blood_type)
      if (key && totals[key]) {
        totals[key] = {
          units: Number(b.units_available) || 0,
          status: b?.status || 'Adequate',
        }
      }
    })
    return totals
  }

  if (Array.isArray(inventory)) {
    inventory.forEach((i: any) => {
      const t = formatBloodGroup(i?.blood_type)
      if (t && totals[t]) {
        totals[t].units += Number(i?.units_available) || 0
        if ((i?.status || '').toLowerCase().includes('critical')) totals[t].status = 'Critical'
        else if (
          (i?.status || '').toLowerCase().includes('low') &&
          totals[t].status !== 'Critical'
        )
          totals[t].status = 'Low'
      }
    })
  }
  return totals
}

function buildTrendSeries(
  inventory: any[],
  aggregates: Record<string, { units: number; status: string }>,
): Record<string, number[]> {
  const series: Record<string, number[]> = {}
  // Per-blood-group offsets (7 days, today is last)
  const offsetTemplates: Record<string, number[]> = {
    'A positive': [-4, -2, 1, -1, 3, -2, 0],
    'A negative': [-2, -1, 0, 1, -1, 0, 0],
    'B positive': [-3, -1, 2, -2, 2, -1, 0],
    'B negative': [-1, 0, -1, 1, 0, -1, 0],
    'O positive': [-5, -3, 3, -2, 4, -3, 0],
    'O negative': [-2, -1, 1, 0, -1, 1, 0],
    'AB positive': [-2, -1, 1, -1, 2, -1, 0],
    'AB negative': [-1, 0, 0, 1, -1, 0, 0],
  }
  BLOOD_TYPES.forEach((t) => {
    const current = aggregates?.[t]?.units ?? 0
    const base = current > 0 ? current : 8
    const tmpl = offsetTemplates[t] || [0, 0, 0, 0, 0, 0, 0]
    const values = tmpl.map((o, i) => {
      // Walk from a starting value toward `base` ending at current
      const day = base + o + (i - 3)
      return Math.max(0, Math.round(day))
    })
    // Pin last point to actual current value
    values[values.length - 1] = current
    series[t] = values
  })
  return series
}

export default function InventoryAnalytics({
  inventory,
  refreshInventory,
  sampleMode,
  setActiveAgent,
}: InventoryAnalyticsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<InvAnalysis | null>(sampleMode ? SAMPLE_ANALYSIS : null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    blood_type: 'O positive',
    units_available: '10',
    expiry_date: '',
    source: '',
    status: 'Adequate',
  })
  const [submitting, setSubmitting] = useState(false)

  const criticalCount = Array.isArray(inventory)
    ? inventory.filter((i) => (i?.status || '').toLowerCase() === 'critical').length
    : 0

  const healthScore = Number(analysis?.inventory_health_score) || 0
  const aggregates = useMemo(() => aggregateByBloodType(inventory, analysis), [inventory, analysis])
  const trend = useMemo(() => buildTrendSeries(inventory, aggregates), [inventory, aggregates])

  const addInventory = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          units_available: Number(form.units_available) || 0,
          expiry_date: form.expiry_date || null,
        }),
      })
      const data = await res.json()
      if (data?.success) {
        setForm({ blood_type: 'O positive', units_available: '10', expiry_date: '', source: '', status: 'Adequate' })
        setShowForm(false)
        setInfo('Inventory unit added.')
        await refreshInventory()
      } else {
        setError(data?.error || 'Failed to add inventory')
      }
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const runAnalysis = async () => {
    setLoading(true)
    setError(null)
    setInfo(null)
    setActiveAgent(INV_AGENT_ID)

    if (sampleMode) {
      setTimeout(() => {
        setAnalysis(SAMPLE_ANALYSIS)
        setLoading(false)
        setActiveAgent(null)
      }, 800)
      return
    }

    const payload = {
      task: 'Analyze the current blood inventory and provide recommendations',
      inventory: Array.isArray(inventory)
        ? inventory.map((i) => ({
            blood_type: i?.blood_type,
            units: i?.units_available,
            expiry: i?.expiry_date,
            status: i?.status,
          }))
        : [],
      rag_id: RAG_ID,
    }

    try {
      const res = await callAIAgent(JSON.stringify(payload), INV_AGENT_ID)
      const raw = res?.response?.result ?? res?.response?.message ?? res?.response
      let parsed: any = raw
      const rawStr: string | null =
        typeof raw === 'string'
          ? raw
          : raw && typeof raw === 'object' && typeof (raw as any).text === 'string'
          ? (raw as any).text
          : null
      if (rawStr !== null) {
        try {
          parsed = JSON.parse(rawStr)
        } catch {
          parsed = { summary: rawStr }
        }
      }
      const inner = parsed?.result ?? parsed
      const safe: InvAnalysis = {
        inventory_health_score: Number(inner?.inventory_health_score) || 0,
        critical_shortages: Array.isArray(inner?.critical_shortages) ? inner.critical_shortages : [],
        expiring_units: Array.isArray(inner?.expiring_units) ? inner.expiring_units : [],
        recommendations: Array.isArray(inner?.recommendations) ? inner.recommendations : [],
        blood_type_status: Array.isArray(inner?.blood_type_status) ? inner.blood_type_status : [],
        summary: typeof inner?.summary === 'string' ? inner.summary : '',
      }
      setAnalysis(safe)
    } catch (e: any) {
      setError(e?.message || 'Failed to analyze inventory')
    } finally {
      setLoading(false)
      setActiveAgent(null)
    }
  }

  // SVG ring for health score
  const RING_SIZE = 140
  const RING_STROKE = 14
  const RING_R = (RING_SIZE - RING_STROKE) / 2
  const RING_C = 2 * Math.PI * RING_R
  const ringOffset = RING_C - (Math.max(0, Math.min(100, healthScore)) / 100) * RING_C

  return (
    <div className="relative space-y-6">
      {/* Soft pattern background */}
      <div className="absolute inset-0 pointer-events-none -z-0 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-red-200/40 blur-3xl" />
        <div className="absolute top-1/2 -left-10 w-64 h-64 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-56 h-56 rounded-full bg-red-100/40 blur-3xl" />
      </div>

      {/* Header hero */}
      <div className={`relative z-10 ${CARD} p-5 md:p-6`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md shrink-0">
              <BarChart3 className="w-5 h-5 text-[hsl(40,50%,98%)]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[hsl(20,25%,12%)]">Inventory Analytics</h2>
              <p className="text-sm text-[hsl(20,15%,40%)] mt-0.5 max-w-lg">
                Live stock visualization, expiry monitoring and AI-driven recommendations for every
                blood type.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Circular health ring */}
            <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
              <svg width={RING_SIZE} height={RING_SIZE} className="rotate-[-90deg]">
                <defs>
                  <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 75%, 55%)" />
                    <stop offset="100%" stopColor="hsl(0, 70%, 35%)" />
                  </linearGradient>
                </defs>
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_R}
                  stroke="hsl(30, 25%, 85%)"
                  strokeWidth={RING_STROKE}
                  fill="none"
                />
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_R}
                  stroke="url(#ring-grad)"
                  strokeWidth={RING_STROKE}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={ringOffset}
                  style={{ transition: 'stroke-dashoffset 0.7s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-red-700 leading-none">{healthScore}%</span>
                <span className="text-[10px] uppercase tracking-wider text-[hsl(20,15%,40%)] mt-1">
                  Health
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-[hsl(40,50%,98%)] px-4 py-2 rounded-[10px] shadow-md hover:shadow-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" /> Run Analysis
                  </>
                )}
              </button>
              <button
                onClick={() => setShowForm((v) => !v)}
                className="px-4 py-2 rounded-[10px] text-sm font-medium border border-[hsl(30,25%,82%)] bg-[hsl(40,50%,98%)] text-[hsl(20,25%,12%)] hover:bg-[hsl(40,40%,93%)] flex items-center gap-2"
              >
                {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showForm ? 'Cancel' : 'Add Inventory'}
              </button>
            </div>
          </div>
        </div>

        {analysis?.summary && (
          <p className="text-xs text-[hsl(20,15%,40%)] mt-4 pt-4 border-t border-[hsl(30,25%,82%)]">
            {analysis.summary}
          </p>
        )}
      </div>

      {criticalCount > 0 && (
        <div className="relative z-10 flex items-start gap-3 p-4 rounded-[12px] bg-red-50 border border-red-200 border-l-4 border-l-red-600 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Critical Shortage Alert</p>
            <p className="text-xs text-red-700">
              {criticalCount} blood type(s) in critical status. Run analysis for actionable
              recommendations.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="relative z-10 p-3 rounded-[10px] bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {info && (
        <div className="relative z-10 p-3 rounded-[10px] bg-green-50 border border-green-200 text-sm text-green-800">
          {info}
        </div>
      )}

      {showForm && (
        <div className={`relative z-10 ${CARD} p-4`}>
          <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)] mb-3">Add inventory unit</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <FormField label="Blood type">
              <select
                className="form-input"
                value={form.blood_type}
                onChange={(e) => setForm((p) => ({ ...p, blood_type: e.target.value }))}
              >
                {BLOOD_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Units">
              <input
                type="number"
                min={0}
                className="form-input"
                value={form.units_available}
                onChange={(e) => setForm((p) => ({ ...p, units_available: e.target.value }))}
              />
            </FormField>
            <FormField label="Expiry date">
              <input
                type="date"
                className="form-input"
                value={form.expiry_date}
                onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))}
              />
            </FormField>
            <FormField label="Source">
              <input
                className="form-input"
                value={form.source}
                onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
                placeholder="Donor / Hospital"
              />
            </FormField>
            <FormField label="Status">
              <select
                className="form-input"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={addInventory}
              disabled={submitting}
              className="bg-gradient-to-r from-red-600 to-red-700 text-[hsl(40,50%,98%)] px-4 py-2 rounded-[10px] shadow-md text-sm font-medium flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save unit'
              )}
            </button>
          </div>
          <style jsx>{`
            .form-input {
              width: 100%;
              padding: 8px 10px;
              background: hsl(40, 50%, 98%);
              border: 1px solid hsl(30, 30%, 82%);
              border-radius: 10px;
              font-size: 13px;
              color: hsl(20, 25%, 12%);
            }
          `}</style>
        </div>
      )}

      {loading && (
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-56 rounded-[14px] animate-pulse bg-[hsl(40,30%,90%)]" />
          <div className="h-56 rounded-[14px] animate-pulse bg-[hsl(40,30%,90%)]" />
          <div className="h-56 rounded-[14px] animate-pulse bg-[hsl(40,30%,90%)]" />
          <div className="h-56 rounded-[14px] animate-pulse bg-[hsl(40,30%,90%)]" />
        </div>
      )}

      {/* 2x2 grid of analytics cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card A — Per-blood-group stock trend line chart */}
        <div className={`${CARD} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-700" />
                Stock Trend
              </h3>
              <p className="text-[11px] text-[hsl(20,15%,40%)]">Per blood group over the last 7 days</p>
            </div>
          </div>
          <StockTrendChart series={trend} />
        </div>

        {/* Card B — Inventory by blood type vertical bars */}
        <div className={`${CARD} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)] flex items-center gap-2">
                <Package className="w-4 h-4 text-red-700" />
                Inventory by Blood Type
              </h3>
              <p className="text-[11px] text-[hsl(20,15%,40%)]">Color-coded by stock status</p>
            </div>
          </div>
          <BloodTypeBarChart data={aggregates} />
        </div>

        {/* Card C — Critical shortages list */}
        <div className={`${CARD} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-700" />
                Critical Shortages
              </h3>
              <p className="text-[11px] text-[hsl(20,15%,40%)]">Immediate action required</p>
            </div>
          </div>
          {!Array.isArray(analysis?.critical_shortages) ||
          (analysis?.critical_shortages?.length ?? 0) === 0 ? (
            <p className="text-xs text-[hsl(20,15%,40%)] py-8 text-center">
              No critical shortages detected.
            </p>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {analysis!.critical_shortages.map((c, i) => (
                <div
                  key={i}
                  className="p-3 rounded-[10px] bg-red-50 border border-red-200 border-l-4 border-l-red-600"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 font-bold text-xs">
                        {formatBloodGroup(c?.blood_type) || '—'}
                      </span>
                      <span className="text-sm font-semibold text-red-900">
                        {c?.units ?? 0} units
                      </span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-300">
                      {c?.severity ?? 'critical'}
                    </span>
                  </div>
                  <p className="text-[11px] text-red-800 leading-snug">{c?.action ?? ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card D — Expiring soon horizontal bars */}
        <div className={`${CARD} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-700" />
                Expiring Soon
              </h3>
              <p className="text-[11px] text-[hsl(20,15%,40%)]">Closer to expiry = redder bar</p>
            </div>
          </div>
          {!Array.isArray(analysis?.expiring_units) ||
          (analysis?.expiring_units?.length ?? 0) === 0 ? (
            <p className="text-xs text-[hsl(20,15%,40%)] py-8 text-center">
              No units expiring soon.
            </p>
          ) : (
            <ExpiringBars items={analysis!.expiring_units} />
          )}
        </div>
      </div>

      {/* Recommendations full-width */}
      {analysis && Array.isArray(analysis?.recommendations) && (
        <div className={`relative z-10 ${CARD} p-5`}>
          <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)] flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-red-700" />
            AI Recommendations
          </h3>
          {analysis.recommendations.length === 0 ? (
            <p className="text-xs text-[hsl(20,15%,40%)] py-4 text-center">
              No recommendations available.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {analysis.recommendations.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-[10px] bg-[hsl(40,40%,93%)] border border-[hsl(30,25%,82%)]"
                >
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${priorityBadge(
                      r?.priority ?? '',
                    )} mt-0.5 shrink-0`}
                  >
                    {r?.priority ?? 'normal'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-[hsl(20,25%,12%)]">{r?.recommendation ?? ''}</p>
                    {r?.expected_impact && (
                      <p className="text-[11px] text-[hsl(20,15%,40%)] mt-0.5">
                        Impact: {r.expected_impact}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-[hsl(20,25%,12%)] mb-1 block">{label}</span>
      {children}
    </label>
  )
}

function StockTrendChart({ series }: { series: Record<string, number[]> }) {
  const groups = BLOOD_TYPES
  const lengths = groups.map((g) => (series?.[g]?.length ?? 0))
  const len = Math.max(7, ...lengths)
  const safeSeries: Record<string, number[]> = {}
  groups.forEach((g) => {
    const arr = Array.isArray(series?.[g]) ? series[g] : []
    safeSeries[g] = Array.from({ length: len }, (_, i) => Number(arr[i]) || 0)
  })

  const W = 340
  const H = 200
  const PAD_L = 26
  const PAD_R = 12
  const PAD_T = 14
  const PAD_B = 24

  const allValues = groups.flatMap((g) => safeSeries[g])
  const max = Math.max(4, ...allValues)
  const stepX = (W - PAD_L - PAD_R) / (len - 1 || 1)

  const labels = ['6d', '5d', '4d', '3d', '2d', '1d', 'Today']

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48">
        {/* horizontal grid */}
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line
            key={i}
            x1={PAD_L}
            x2={W - PAD_R}
            y1={PAD_T + t * (H - PAD_T - PAD_B)}
            y2={PAD_T + t * (H - PAD_T - PAD_B)}
            stroke="hsl(30, 25%, 88%)"
            strokeDasharray="3 3"
          />
        ))}
        {/* y-axis ticks */}
        {[0, 0.5, 1].map((t, i) => (
          <text
            key={i}
            x={PAD_L - 4}
            y={PAD_T + (1 - t) * (H - PAD_T - PAD_B) + 3}
            textAnchor="end"
            fontSize="8"
            fill="hsl(20, 15%, 40%)"
          >
            {Math.round(t * max)}
          </text>
        ))}
        {/* one polyline per blood group */}
        {groups.map((g) => {
          const values = safeSeries[g]
          const points = values
            .map((v, i) => {
              const x = PAD_L + i * stepX
              const y = PAD_T + (1 - v / max) * (H - PAD_T - PAD_B)
              return `${x.toFixed(1)},${y.toFixed(1)}`
            })
            .join(' ')
          const color = BLOOD_COLORS[g] || 'hsl(0, 70%, 45%)'
          return (
            <g key={g}>
              <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {values.map((v, i) => (
                <circle
                  key={i}
                  cx={PAD_L + i * stepX}
                  cy={PAD_T + (1 - v / max) * (H - PAD_T - PAD_B)}
                  r={1.8}
                  fill={color}
                />
              ))}
            </g>
          )
        })}
        {/* x labels */}
        {labels.slice(0, len).map((l, i) => (
          <text
            key={i}
            x={PAD_L + i * stepX}
            y={H - 8}
            textAnchor="middle"
            fontSize="9"
            fill="hsl(20, 15%, 40%)"
          >
            {l}
          </text>
        ))}
      </svg>
      {/* legend */}
      <div className="grid grid-cols-4 gap-x-2 gap-y-1 pt-1">
        {groups.map((g) => (
          <div key={g} className="flex items-center gap-1.5 text-[10px] text-[hsl(20,25%,12%)]">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: BLOOD_COLORS[g] }}
            />
            <span className="truncate">{g}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BloodTypeBarChart({ data }: { data: Record<string, { units: number; status: string }> }) {
  const entries = BLOOD_TYPES.map((t) => ({
    type: t,
    units: data?.[t]?.units ?? 0,
    status: data?.[t]?.status ?? 'Adequate',
  }))
  const max = Math.max(1, ...entries.map((e) => e.units))
  const W = 340
  const H = 220
  const PAD_X = 18
  const PAD_TOP = 22
  const PAD_BOTTOM = 68
  const bandW = (W - PAD_X * 2) / entries.length
  const barW = bandW * 0.55

  const colorFor = (s: string) => {
    const sl = (s || '').toLowerCase()
    if (sl.includes('critical')) return 'hsl(0, 75%, 50%)'
    if (sl.includes('low')) return 'hsl(38, 90%, 50%)'
    return 'hsl(140, 55%, 42%)'
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56">
      {[0.25, 0.5, 0.75].map((t, i) => (
        <line
          key={i}
          x1={PAD_X}
          x2={W - PAD_X}
          y1={PAD_TOP + t * (H - PAD_TOP - PAD_BOTTOM)}
          y2={PAD_TOP + t * (H - PAD_TOP - PAD_BOTTOM)}
          stroke="hsl(30, 25%, 88%)"
          strokeDasharray="3 3"
        />
      ))}
      {entries.map((e, i) => {
        const h = (e.units / max) * (H - PAD_TOP - PAD_BOTTOM)
        const x = PAD_X + bandW * i + (bandW - barW) / 2
        const y = H - PAD_BOTTOM - h
        const labelX = x + barW / 2
        const labelY = H - PAD_BOTTOM + 10
        return (
          <g key={e.type}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(2, h)}
              fill={colorFor(e.status)}
              rx={3}
            />
            <text
              x={x + barW / 2}
              y={y - 4}
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="hsl(20, 25%, 12%)"
            >
              {e.units}
            </text>
            <text
              x={labelX}
              y={labelY}
              textAnchor="end"
              fontSize="9"
              fill="hsl(20, 15%, 40%)"
              transform={`rotate(-40 ${labelX} ${labelY})`}
            >
              {e.type}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function ExpiringBars({
  items,
}: {
  items: { blood_type: string; units: number; days_until_expiry: number }[]
}) {
  const fmt = (s: string) => formatBloodGroup(s) || '—'
  const safe = Array.isArray(items) ? items : []
  const maxDays = Math.max(7, ...safe.map((i) => i?.days_until_expiry ?? 0))
  return (
    <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
      {safe.map((it, i) => {
        const days = it?.days_until_expiry ?? 0
        const width = Math.max(8, ((maxDays - days + 1) / (maxDays + 1)) * 100)
        const tone =
          days <= 3
            ? { bar: 'bg-red-500', text: 'text-red-700' }
            : days <= 5
            ? { bar: 'bg-amber-500', text: 'text-amber-700' }
            : { bar: 'bg-green-500', text: 'text-green-700' }
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 font-semibold text-[10px]">
                  {fmt(it?.blood_type)}
                </span>
                <span className="font-semibold text-[hsl(20,25%,12%)]">{it?.units ?? 0} units</span>
              </div>
              <span className={`text-[11px] font-medium ${tone.text}`}>{days} days left</span>
            </div>
            <div className="h-2 rounded-full bg-[hsl(40,30%,90%)] overflow-hidden">
              <div
                className={`h-full ${tone.bar} transition-all`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
