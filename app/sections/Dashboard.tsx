'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Droplet, AlertTriangle, Activity, Users, TrendingUp, Loader2, Brain, BarChart3 } from 'lucide-react'
import { callAIAgent } from '@/lib/aiAgent'
import { formatBloodGroup, ALL_BLOOD_GROUPS } from '@/lib/bloodGroup'

const DEMAND_AGENT_ID = '6a248453baf2abd89dc3c406'
const RAG_ID = '6a24afd2a563cbef5db16369'

interface ShapFactor {
  factor: string
  impact: number
  direction: string
}

interface Prediction {
  blood_type: string
  predicted_demand_units: number
  shortage_risk: string
  confidence_pct: number
  shap_factors: ShapFactor[]
}

interface DemandResult {
  predictions: Prediction[]
  summary: string
  critical_alerts: string[]
  recommendation: string
}

interface DashboardProps {
  inventory: any[]
  requests: any[]
  donors: any[]
  sampleMode: boolean
  setSampleMode: (v: boolean) => void
  setActiveAgent: (id: string | null) => void
}

function unitsAvailableFor(group: string, inventory: any[]): number {
  if (!Array.isArray(inventory)) return 0
  return inventory
    .filter((i) => formatBloodGroup(i?.blood_type) === group)
    .reduce((s, i) => s + (Number(i?.units_available) || 0), 0)
}

function pendingUnitsFor(group: string, requests: any[]): number {
  if (!Array.isArray(requests)) return 0
  return requests
    .filter(
      (r) =>
        formatBloodGroup(r?.blood_type) === group &&
        (r?.status || '').toLowerCase() !== 'fulfilled' &&
        (r?.status || '').toLowerCase() !== 'cancelled',
    )
    .reduce((s, r) => s + (Number(r?.units_needed) || 0), 0)
}

function urgencyWeight(r: any): number {
  const u = String(r?.urgency || '').toLowerCase()
  if (u.includes('critical')) return 2.5
  if (u.includes('high')) return 1.6
  return 1
}

function pendingWeightedFor(group: string, requests: any[]): number {
  if (!Array.isArray(requests)) return 0
  return requests
    .filter(
      (r) =>
        formatBloodGroup(r?.blood_type) === group &&
        (r?.status || '').toLowerCase() !== 'fulfilled' &&
        (r?.status || '').toLowerCase() !== 'cancelled',
    )
    .reduce((s, r) => s + (Number(r?.units_needed) || 0) * urgencyWeight(r), 0)
}

function computeDynamicDemand(
  inventory: any[],
  requests: any[],
  distribution: Record<string, number> | null,
  totalRows: number,
): DemandResult {
  const distTotal =
    distribution && typeof distribution === 'object'
      ? Object.values(distribution).reduce((s, v) => s + (Number(v) || 0), 0)
      : 0

  const groups = [...ALL_BLOOD_GROUPS]
  const predictions: Prediction[] = groups.map((g) => {
    const distCount = distribution
      ? Number(distribution[g] ?? distribution[g.replace(' positive', '+').replace(' negative', '-')] ?? 0)
      : 0
    const distShare = distTotal > 0 ? distCount / distTotal : 1 / 8

    const baseline7d = Math.max(4, Math.round(distShare * 100))
    const pendingUnits = pendingUnitsFor(g, requests)
    const weightedPending = pendingWeightedFor(g, requests)
    const predicted = Math.round(baseline7d + weightedPending * 1.4)

    const inv = unitsAvailableFor(g, inventory)
    const coverage = predicted > 0 ? inv / predicted : 1
    let risk: string
    if (coverage < 0.3) risk = 'Critical'
    else if (coverage < 0.6) risk = 'High'
    else if (coverage < 1) risk = 'Medium'
    else risk = 'Low'

    const distFactor = Math.min(0.6, Math.max(0.15, distShare * 2.2))
    const pendingFactor = Math.min(0.85, weightedPending / Math.max(8, baseline7d))
    const supplyFactor = Math.min(0.7, 1 / Math.max(0.3, coverage) * 0.18)

    const shap_factors: ShapFactor[] = [
      {
        factor: `Dataset prevalence (${(distShare * 100).toFixed(1)}%)`,
        impact: distFactor,
        direction: '+',
      },
      {
        factor: `Open requests (${pendingUnits} units across ${requests.filter((r) => formatBloodGroup(r?.blood_type) === g && (r?.status || '').toLowerCase() !== 'fulfilled').length} cases)`,
        impact: pendingFactor,
        direction: '+',
      },
      {
        factor: `Inventory coverage (${inv} units on hand)`,
        impact: supplyFactor,
        direction: coverage >= 1 ? '-' : '+',
      },
    ]

    const confidence = Math.round(
      55 + Math.min(35, distShare * 120) + (distTotal > 0 ? 5 : 0) + (pendingUnits > 0 ? 5 : 0),
    )

    return {
      blood_type: g,
      predicted_demand_units: predicted,
      shortage_risk: risk,
      confidence_pct: Math.max(40, Math.min(98, confidence)),
      shap_factors,
    }
  })

  const critical = predictions.filter((p) => p.shortage_risk === 'Critical')
  const high = predictions.filter((p) => p.shortage_risk === 'High')

  const summaryParts: string[] = []
  summaryParts.push(
    `Forecast computed from ${totalRows.toLocaleString() || 'live'} historical records and ${
      requests.filter((r) => (r?.status || '').toLowerCase() !== 'fulfilled').length
    } open requests over the next 7 days.`,
  )
  if (critical.length) {
    summaryParts.push(`${critical.map((p) => p.blood_type).join(', ')} flagged as Critical.`)
  } else if (high.length) {
    summaryParts.push(`${high.map((p) => p.blood_type).join(', ')} flagged as High.`)
  } else {
    summaryParts.push('All groups currently within safe coverage thresholds.')
  }

  const critical_alerts: string[] = []
  critical.forEach((p) => {
    critical_alerts.push(
      `${p.blood_type} predicted demand ${p.predicted_demand_units} units exceeds ${unitsAvailableFor(p.blood_type, inventory)} units on hand.`,
    )
  })
  high.slice(0, 2).forEach((p) => {
    critical_alerts.push(
      `${p.blood_type} approaching shortage — only ${unitsAvailableFor(p.blood_type, inventory)} units available against ${p.predicted_demand_units} predicted.`,
    )
  })

  let recommendation: string
  if (critical.length) {
    recommendation = `Activate emergency outreach for ${critical
      .map((p) => p.blood_type)
      .join(', ')}; trigger SMS to compatible donors and notify regional bridges.`
  } else if (high.length) {
    recommendation = `Plan donor drives this week prioritizing ${high
      .map((p) => p.blood_type)
      .join(', ')}.`
  } else {
    recommendation = 'Coverage healthy; maintain regular collection cadence and monitor incoming requests.'
  }

  return {
    predictions: predictions.sort((a, b) => b.predicted_demand_units - a.predicted_demand_units),
    summary: summaryParts.join(' '),
    critical_alerts,
    recommendation,
  }
}

const CARD_BASE =
  'bg-[hsl(40,50%,98%)]/75 backdrop-blur-[16px] border border-[hsl(0,30%,80%)]/30 shadow-md rounded-[14px]'

function StatCard({ icon: Icon, label, value, hint, color }: any) {
  return (
    <Card className={CARD_BASE}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-[hsl(40,50%,98%)]" />
          </div>
        </div>
        <p className="text-3xl font-bold text-[hsl(20,25%,12%)]">{value}</p>
        <p className="text-xs text-[hsl(20,15%,40%)] mt-1">{label}</p>
        {hint && <p className="text-[11px] text-[hsl(20,15%,40%)]/70 mt-2">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function riskColor(risk: string) {
  const r = (risk || '').toLowerCase()
  if (r.includes('critical')) return 'bg-red-100 text-red-700 border-red-200'
  if (r.includes('high')) return 'bg-amber-100 text-amber-700 border-amber-200'
  if (r.includes('medium')) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  return 'bg-green-100 text-green-700 border-green-200'
}

export default function Dashboard({
  inventory,
  requests,
  donors,
  sampleMode,
  setSampleMode,
  setActiveAgent,
}: DashboardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [demand, setDemand] = useState<DemandResult | null>(null)
  const [dropouts, setDropouts] = useState<{ trigger: string; count: number }[]>([])
  const [dropoutLoading, setDropoutLoading] = useState(false)
  const [dropoutError, setDropoutError] = useState<string | null>(null)
  const [dropoutTotal, setDropoutTotal] = useState<number>(0)
  const [bloodDistribution, setBloodDistribution] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setDropoutLoading(true)
      setDropoutError(null)
      try {
        const res = await fetch('/api/dataset/analytics', { credentials: 'include' })
        const json = await res.json()
        if (cancelled) return
        if (json?.success) {
          const arr = Array.isArray(json?.data?.trigger_counts) ? json.data.trigger_counts : []
          setDropouts(arr)
          setDropoutTotal(Number(json?.data?.total_rows) || 0)
          const dist = json?.data?.blood_group_distribution
          if (dist && typeof dist === 'object') {
            const normalized: Record<string, number> = {}
            Object.entries(dist).forEach(([k, v]) => {
              normalized[formatBloodGroup(k) || k] = Number(v) || 0
            })
            setBloodDistribution(normalized)
          }
        } else {
          setDropoutError(json?.error || 'Failed to load dropout analytics.')
        }
      } catch (e: any) {
        if (!cancelled) setDropoutError(e?.message || 'Network error loading analytics.')
      } finally {
        if (!cancelled) setDropoutLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const dynamicDemand = useMemo(
    () => computeDynamicDemand(inventory, requests, bloodDistribution, dropoutTotal),
    [inventory, requests, bloodDistribution, dropoutTotal],
  )

  useEffect(() => {
    if (sampleMode) {
      setDemand(dynamicDemand)
    }
  }, [sampleMode, dynamicDemand])

  const totalUnits = Array.isArray(inventory)
    ? inventory.reduce((s, x) => s + (Number(x?.units_available) || 0), 0)
    : 0
  const criticalShortages = Array.isArray(inventory)
    ? inventory.filter((x) => (x?.status || '').toLowerCase() === 'critical').length
    : 0
  const pendingRequests = Array.isArray(requests)
    ? requests.filter((x) => (x?.status || '').toLowerCase() === 'pending').length
    : 0
  const activeDonors = Array.isArray(donors)
    ? donors.filter((x) => (x?.status || '').toLowerCase() === 'available').length
    : 0

  const recent = Array.isArray(requests) ? requests.slice(0, 5) : []

  const runPrediction = async () => {
    setLoading(true)
    setError(null)
    setActiveAgent(DEMAND_AGENT_ID)

    if (sampleMode) {
      setTimeout(() => {
        setDemand(dynamicDemand)
        setLoading(false)
        setActiveAgent(null)
      }, 800)
      return
    }

    const perGroupBreakdown = [...ALL_BLOOD_GROUPS].map((g) => ({
      blood_type: g,
      units_in_stock: unitsAvailableFor(g, inventory),
      pending_units: pendingUnitsFor(g, requests),
      open_requests: Array.isArray(requests)
        ? requests.filter(
            (r) =>
              formatBloodGroup(r?.blood_type) === g &&
              (r?.status || '').toLowerCase() !== 'fulfilled' &&
              (r?.status || '').toLowerCase() !== 'cancelled',
          ).length
        : 0,
      dataset_prevalence: bloodDistribution?.[g] ?? 0,
    }))

    const payload = {
      task: 'Predict per-blood-group demand for the next 7 days',
      historical_total_records: dropoutTotal,
      per_blood_group: perGroupBreakdown,
      baseline_forecast: dynamicDemand.predictions,
      rag_id: RAG_ID,
    }

    try {
      const result = await callAIAgent(JSON.stringify(payload), DEMAND_AGENT_ID)
      const raw =
        result?.response?.result ??
        result?.response?.message ??
        result?.response
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
          parsed = { summary: rawStr, predictions: [], critical_alerts: [], recommendation: '' }
        }
      }
      const inner = parsed?.result ?? parsed
      const agentPreds: Prediction[] = Array.isArray(inner?.predictions) ? inner.predictions : []
      const mergedPreds: Prediction[] = dynamicDemand.predictions.map((dp) => {
        const match = agentPreds.find(
          (ap) => formatBloodGroup(ap?.blood_type) === dp.blood_type,
        )
        if (!match) return dp
        return {
          blood_type: dp.blood_type,
          predicted_demand_units: Number(match?.predicted_demand_units) || dp.predicted_demand_units,
          shortage_risk: typeof match?.shortage_risk === 'string' ? match.shortage_risk : dp.shortage_risk,
          confidence_pct: Number(match?.confidence_pct) || dp.confidence_pct,
          shap_factors: Array.isArray(match?.shap_factors) && match.shap_factors.length > 0 ? match.shap_factors : dp.shap_factors,
        }
      })
      const safe: DemandResult = {
        predictions: mergedPreds,
        summary: typeof inner?.summary === 'string' && inner.summary ? inner.summary : dynamicDemand.summary,
        critical_alerts:
          Array.isArray(inner?.critical_alerts) && inner.critical_alerts.length > 0
            ? inner.critical_alerts
            : dynamicDemand.critical_alerts,
        recommendation:
          typeof inner?.recommendation === 'string' && inner.recommendation
            ? inner.recommendation
            : dynamicDemand.recommendation,
      }
      setDemand(safe)
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch demand prediction')
    } finally {
      setLoading(false)
      setActiveAgent(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[hsl(20,25%,12%)]">Dashboard</h2>
          <p className="text-sm text-[hsl(20,15%,40%)]">Real-time blood bank operations overview</p>
        </div>
        <div className="flex items-center gap-3 bg-[hsl(40,50%,98%)]/80 backdrop-blur-[16px] border border-[hsl(30,25%,82%)] px-4 py-2 rounded-[10px] shadow-sm">
          <Label htmlFor="sample-toggle-dash" className="text-xs text-[hsl(20,25%,12%)] cursor-pointer">
            Sample Data
          </Label>
          <Switch
            id="sample-toggle-dash"
            checked={sampleMode}
            onCheckedChange={(v) => {
              setSampleMode(v)
              setDemand(v ? dynamicDemand : null)
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Droplet}
          label="Total Units"
          value={totalUnits}
          hint="Across all blood types"
          color="bg-gradient-to-br from-red-600 to-red-800"
        />
        <StatCard
          icon={AlertTriangle}
          label="Critical Shortages"
          value={criticalShortages}
          hint="Need immediate attention"
          color="bg-gradient-to-br from-rose-600 to-red-700"
        />
        <StatCard
          icon={Activity}
          label="Pending Requests"
          value={pendingRequests}
          hint="Awaiting fulfillment"
          color="bg-gradient-to-br from-amber-500 to-amber-700"
        />
        <StatCard
          icon={Users}
          label="Active Donors"
          value={activeDonors}
          hint="Ready to donate"
          color="bg-gradient-to-br from-red-500 to-amber-600"
        />
      </div>

      <Card className={CARD_BASE}>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-red-700" />
            <CardTitle className="text-lg text-[hsl(20,25%,12%)]">Demand Prediction</CardTitle>
          </div>
          <Button
            onClick={runPrediction}
            disabled={loading}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-[hsl(40,50%,98%)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" /> Predict Demand
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-[10px] bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {!demand && !loading && (
            <div className="text-center py-12 text-[hsl(20,15%,40%)] text-sm">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              Click &quot;Predict Demand&quot; to run AI-powered forecasting on your inventory and pending requests.
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              <div className="h-20 rounded-[10px] animate-pulse bg-[hsl(40,30%,90%)]" />
              <div className="h-20 rounded-[10px] animate-pulse bg-[hsl(40,30%,90%)]" />
              <div className="h-20 rounded-[10px] animate-pulse bg-[hsl(40,30%,90%)]" />
            </div>
          )}

          {demand && !loading && (
            <>
              {demand.summary && (
                <div className="p-4 rounded-[10px] bg-[hsl(40,40%,93%)] border border-[hsl(30,30%,82%)] text-sm text-[hsl(20,25%,12%)]">
                  {demand.summary}
                </div>
              )}

              {Array.isArray(demand.critical_alerts) && demand.critical_alerts.length > 0 && (
                <div className="space-y-2">
                  {demand.critical_alerts.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-3 rounded-[10px] bg-red-50 border border-red-200 text-sm text-red-800"
                    >
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {demand.predictions.map((p, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-[12px] bg-[hsl(40,50%,98%)] border border-[hsl(30,30%,82%)] shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-[hsl(20,25%,12%)]">{formatBloodGroup(p?.blood_type) || '—'}</span>
                      <Badge variant="outline" className={riskColor(p?.shortage_risk ?? '')}>
                        {p?.shortage_risk ?? 'unknown'}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-bold text-red-700">
                        {p?.predicted_demand_units ?? 0}
                      </span>
                      <span className="text-xs text-[hsl(20,15%,40%)]">units predicted</span>
                    </div>
                    <p className="text-[11px] text-[hsl(20,15%,40%)] mb-2">
                      Confidence: {p?.confidence_pct ?? 0}%
                    </p>
                    {Array.isArray(p?.shap_factors) && p.shap_factors.length > 0 && (
                      <div className="space-y-1.5 mt-3 pt-3 border-t border-[hsl(30,30%,85%)]">
                        <p className="text-[10px] uppercase tracking-wider text-[hsl(20,15%,40%)] font-semibold mb-1">
                          Key Factors
                        </p>
                        {p.shap_factors.map((f, j) => {
                          const dir = (f?.direction || '+').trim()
                          const isPos = dir === '+'
                          const pct = Math.max(0, Math.min(100, (Number(f?.impact) || 0) * 100))
                          return (
                            <div key={j}>
                              <div className="flex justify-between text-[11px] text-[hsl(20,25%,12%)] mb-0.5">
                                <span className="truncate pr-2">{f?.factor ?? '—'}</span>
                                <span className={isPos ? 'text-red-700' : 'text-amber-700'}>
                                  {isPos ? '+' : '−'}
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-[hsl(40,30%,90%)] rounded-full overflow-hidden">
                                <div
                                  className={isPos ? 'h-full bg-gradient-to-r from-red-500 to-red-700' : 'h-full bg-gradient-to-r from-amber-400 to-amber-600'}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {demand.recommendation && (
                <div className="p-4 rounded-[10px] bg-amber-50 border border-amber-200">
                  <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-1">
                    Recommendation
                  </p>
                  <p className="text-sm text-amber-900">{demand.recommendation}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className={CARD_BASE}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-[hsl(20,25%,12%)]">Recent Blood Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-[hsl(20,15%,40%)] py-6 text-center">No requests yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((r: any, i: number) => (
                <div
                  key={r?._id || i}
                  className="flex items-center justify-between p-3 rounded-[10px] bg-[hsl(40,40%,93%)] border border-[hsl(30,30%,85%)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="px-2 min-w-[40px] h-9 rounded-[8px] bg-red-100 flex items-center justify-center text-[10px] text-center font-bold text-red-800">
                      {formatBloodGroup(r?.blood_type) || '—'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(20,25%,12%)]">
                        {r?.patient_name || 'Unnamed patient'} • {r?.units_needed ?? 0} units
                      </p>
                      <p className="text-[11px] text-[hsl(20,15%,40%)]">
                        {r?.hospital || 'Hospital not specified'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={riskColor(r?.urgency ?? '')}>
                      {r?.urgency ?? 'Normal'}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px]">
                      {r?.status ?? 'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={CARD_BASE}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-700" />
            <div>
              <CardTitle className="text-lg text-[hsl(20,25%,12%)]">
                Dropout Trigger Analytics (from dataset)
              </CardTitle>
              <p className="text-[11px] text-[hsl(20,15%,40%)] mt-0.5">
                Real dropout signals from 50,000+ records.
                {dropoutTotal > 0 ? ` Loaded ${dropoutTotal.toLocaleString()} rows.` : ''}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dropoutLoading && (
            <div className="flex items-center gap-2 text-sm text-[hsl(20,15%,40%)] py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading dataset analytics...
            </div>
          )}
          {dropoutError && !dropoutLoading && (
            <div className="p-3 rounded-[10px] bg-red-50 border border-red-200 text-sm text-red-700">
              {dropoutError}
            </div>
          )}
          {!dropoutLoading && !dropoutError && dropouts.length === 0 && (
            <p className="text-sm text-[hsl(20,15%,40%)] py-6 text-center">
              No dropout triggers found in dataset.
            </p>
          )}
          {!dropoutLoading && !dropoutError && dropouts.length > 0 && (
            <DropoutBarChart data={dropouts} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DropoutBarChart({ data }: { data: { trigger: string; count: number }[] }) {
  const safe = Array.isArray(data) ? data : []
  const max = safe.reduce((m, d) => (d.count > m ? d.count : m), 0)
  return (
    <div className="space-y-2">
      {safe.map((d, i) => {
        const widthPct = max > 0 ? Math.max(2, (d.count / max) * 100) : 0
        const intensity = max > 0 ? d.count / max : 0
        const opacity = 0.45 + intensity * 0.5
        return (
          <div key={i} className="text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[hsl(20,25%,12%)] truncate pr-2 capitalize">
                {d?.trigger || 'unknown'}
              </span>
              <span className="font-semibold text-red-700 shrink-0">
                {d?.count?.toLocaleString?.() ?? d?.count ?? 0}
              </span>
            </div>
            <div className="h-3 rounded-full bg-[hsl(40,30%,90%)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-700"
                style={{ width: `${widthPct}%`, opacity }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
