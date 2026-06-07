'use client'

import { useState, useMemo } from 'react'
import {
  GitBranch,
  User,
  Phone,
  Calendar,
  Activity,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Loader2,
  Database,
} from 'lucide-react'

import { formatBloodGroup, ALL_BLOOD_GROUPS } from '@/lib/bloodGroup'

const HERO_SVG =
  'https://db.bloodwarriors.in/storage/v1/object/public/portal-static-assets/illustrations/hero-section.svg'

const BLOOD_TYPES = [...ALL_BLOOD_GROUPS]

const CARD =
  'bg-[hsl(40,50%,98%)]/75 backdrop-blur-[16px] border border-[hsl(30,25%,82%)] rounded-[14px] shadow-md'

function readName(b: any): string {
  return b?.bridge_name ?? b?.bridgeName ?? 'Unnamed bridge'
}
function readPatient(b: any): string {
  return b?.patient_name ?? b?.patientName ?? '—'
}
function readBlood(b: any): string {
  return b?.blood_type ?? b?.bloodType ?? '—'
}
function readStatus(b: any): string {
  return (b?.status ?? 'healthy') as string
}
function readPrimary(b: any): number {
  return Number(b?.primary_donors ?? b?.primaryDonors ?? 0)
}
function readBackup(b: any): number {
  return Number(b?.backup_donors ?? b?.backupDonors ?? 0)
}
function readReliability(b: any): number {
  return Math.max(0, Math.min(100, Number(b?.reliability ?? 0)))
}
function readCoordinator(b: any): string {
  return b?.coordinator ?? '—'
}
function readCoordinatorPhone(b: any): string {
  return b?.coordinator_phone ?? b?.coordinatorPhone ?? '—'
}
function readNextTransfusion(b: any): string {
  return b?.next_transfusion ?? b?.nextTransfusion ?? ''
}
function readDonorHealth(b: any): any[] {
  const arr = b?.donor_health ?? b?.donorHealth
  return Array.isArray(arr) ? arr : []
}
function readDh(d: any) {
  return {
    name: d?.name ?? '—',
    healthPercent: Number(d?.health_percent ?? d?.healthPercent ?? 0),
    status: (d?.status ?? 'healthy') as string,
    sensors: Number(d?.sensors ?? 0),
    nextDate: d?.next_date ?? d?.nextDate ?? '',
  }
}

function statusBadgeClass(status: string) {
  if (status === 'critical') return 'bg-red-100 text-red-700 border-red-200'
  if (status === 'at-risk') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-green-100 text-green-700 border-green-200'
}

function statusLabel(status: string) {
  if (status === 'critical') return 'Critical'
  if (status === 'at-risk') return 'At Risk'
  return 'Healthy'
}

function reliabilityColor(rel: number) {
  if (rel >= 80) return 'text-green-700'
  if (rel >= 60) return 'text-amber-700'
  return 'text-red-700'
}

function healthBarColor(status: string) {
  if (status === 'critical') return 'bg-red-500'
  if (status === 'at-risk') return 'bg-amber-500'
  return 'bg-green-500'
}

function healthTextColor(status: string) {
  if (status === 'critical') return 'text-red-700'
  if (status === 'at-risk') return 'text-amber-700'
  return 'text-green-700'
}

type FilterKey = 'all' | 'critical' | 'at-risk' | 'healthy'

interface BloodBridgesProps {
  bridges: any[]
  refreshBridges: () => Promise<void>
  patients: any[]
  donors: any[]
}

export default function BloodBridges({ bridges, refreshBridges, patients, donors }: BloodBridgesProps) {
  const safeBridges = Array.isArray(bridges) ? bridges : []
  const safePatients = Array.isArray(patients) ? patients : []
  const safeDonors = Array.isArray(donors) ? donors : []
  const [filter, setFilter] = useState<FilterKey>('all')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [banner, setBanner] = useState<{ tone: 'green' | 'amber' | 'red'; text: string } | null>(null)

  const handleImportBridges = async () => {
    setImporting(true)
    setBanner(null)
    try {
      const res = await fetch('/api/bridges/import-dataset', {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json()
      if (json?.success) {
        await refreshBridges()
        setBanner({
          tone: 'green',
          text: `Imported ${json?.data?.imported ?? 0}, skipped ${json?.data?.skipped ?? 0} (of ${json?.data?.total ?? 0} rows).`,
        })
      } else {
        setBanner({ tone: 'red', text: json?.error || 'Dataset import failed.' })
      }
    } catch (e: any) {
      setBanner({ tone: 'red', text: e?.message || 'Network error during import.' })
    } finally {
      setImporting(false)
    }
  }
  const [form, setForm] = useState({
    bridge_name: '',
    patient_id: '',
    patient_name: '',
    blood_type: 'O positive',
    status: 'healthy' as 'critical' | 'at-risk' | 'healthy',
    primary_donors: '4',
    backup_donors: '2',
    reliability: '80',
    coordinator: '',
    coordinator_phone: '',
    next_transfusion: '',
  })

  const stats = useMemo(() => {
    const total = safeBridges.length
    const critical = safeBridges.filter((b) => readStatus(b) === 'critical').length
    const avg =
      total === 0
        ? 0
        : Math.round(safeBridges.reduce((s, b) => s + readReliability(b), 0) / total)
    return { total, critical, avg }
  }, [safeBridges])

  const filtered = useMemo(() => {
    if (filter === 'all') return safeBridges
    return safeBridges.filter((b) => readStatus(b) === filter)
  }, [safeBridges, filter])

  const allDonors = useMemo(() => {
    const arr: any[] = []
    safeBridges.forEach((b) => {
      const list = readDonorHealth(b)
      list.forEach((d) => arr.push({ ...readDh(d), bridgeName: readName(b) }))
    })
    return arr
  }, [safeBridges])

  // Auto-fill bloodType + name when patient selected
  const onPatientSelect = (pid: string) => {
    const p = safePatients.find((x) => String(x?._id ?? x?.id) === pid)
    if (p) {
      setForm((prev) => ({
        ...prev,
        patient_id: pid,
        patient_name: String(p?.name ?? ''),
        blood_type: String(p?.blood_type ?? prev.blood_type),
      }))
    } else {
      setForm((prev) => ({ ...prev, patient_id: pid }))
    }
  }

  const handleCreate = async () => {
    if (!form.bridge_name.trim() || !form.patient_name.trim() || !form.coordinator.trim()) {
      setBanner({ tone: 'amber', text: 'Bridge name, patient name and coordinator are required.' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/bridges', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bridge_name: form.bridge_name.trim(),
          patient_id: form.patient_id,
          patient_name: form.patient_name.trim(),
          blood_type: form.blood_type,
          status: form.status,
          primary_donors: Number(form.primary_donors) || 0,
          backup_donors: Number(form.backup_donors) || 0,
          reliability: Math.max(0, Math.min(100, Number(form.reliability) || 0)),
          coordinator: form.coordinator.trim(),
          coordinator_phone: form.coordinator_phone.trim(),
          next_transfusion: form.next_transfusion || null,
          donor_health: [],
        }),
      })
      const json = await res.json()
      if (!json?.success) {
        setBanner({ tone: 'red', text: json?.error || 'Failed to create bridge.' })
        return
      }
      await refreshBridges()
      setShowForm(false)
      setForm({
        bridge_name: '',
        patient_id: '',
        patient_name: '',
        blood_type: 'O positive',
        status: 'healthy',
        primary_donors: '4',
        backup_donors: '2',
        reliability: '80',
        coordinator: '',
        coordinator_phone: '',
        next_transfusion: '',
      })
      setBanner({ tone: 'green', text: 'Bridge created and synced.' })
    } catch (err: any) {
      setBanner({ tone: 'red', text: err?.message || 'Network error creating bridge.' })
    } finally {
      setSaving(false)
    }
  }

  const chips: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'at-risk', label: 'At Risk' },
    { key: 'healthy', label: 'Healthy' },
  ]

  return (
    <div className="relative space-y-6">
      <img
        src={HERO_SVG}
        alt=""
        className="absolute bottom-0 left-0 max-w-md w-[40vw] opacity-10 pointer-events-none select-none -z-0"
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md shrink-0">
            <GitBranch className="w-5 h-5 text-[hsl(40,50%,98%)]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[hsl(20,25%,12%)]">Blood Bridges</h2>
            <p className="text-sm text-[hsl(20,15%,40%)] mt-0.5">
              Committed-donor networks keeping recurring transfusion patients alive.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImportBridges}
            disabled={importing}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-[hsl(40,50%,98%)] px-4 py-2 rounded-[10px] shadow-md hover:shadow-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-60"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {importing ? 'Importing...' : 'Import from Dataset'}
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-[hsl(40,50%,98%)] px-4 py-2 rounded-[10px] shadow-md hover:shadow-lg text-sm font-medium flex items-center gap-2 transition-all"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Create Bridge'}
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`relative z-10 flex items-start gap-3 p-3 rounded-[12px] border ${
            banner.tone === 'green'
              ? 'bg-green-50 border-green-200 text-green-800'
              : banner.tone === 'amber'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm flex-1">{banner.text}</p>
          <button onClick={() => setBanner(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Total bridges" value={`${stats.total}`} icon={<GitBranch className="w-4 h-4" />} />
        <StatCard
          label="Critical bridges"
          value={`${stats.critical}`}
          icon={<AlertTriangle className="w-4 h-4" />}
          accent="red"
        />
        <StatCard
          label="Avg reliability"
          value={`${stats.avg}%`}
          icon={<TrendingUp className="w-4 h-4" />}
          accent={stats.avg >= 80 ? 'green' : stats.avg >= 60 ? 'amber' : 'red'}
        />
        <StatCard
          label="Donors in network"
          value={`${safeDonors.length}`}
          icon={<User className="w-4 h-4" />}
        />
      </div>

      {showForm && (
        <div className={`relative z-10 ${CARD} p-4 space-y-3`}>
          <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)]">New bridge</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField label="Bridge name *">
              <input
                className="form-input"
                value={form.bridge_name}
                onChange={(e) => setForm((p) => ({ ...p, bridge_name: e.target.value }))}
                placeholder="e.g., Bangalore Bridge #7"
              />
            </FormField>
            <FormField label="Link patient">
              <select
                className="form-input"
                value={form.patient_id}
                onChange={(e) => onPatientSelect(e.target.value)}
              >
                <option value="">— Select patient —</option>
                {safePatients.map((p) => {
                  const pid = String(p?._id ?? p?.id ?? '')
                  return (
                    <option key={pid} value={pid}>
                      {p?.name ?? 'Unnamed'} ({formatBloodGroup(p?.blood_type) || '—'})
                    </option>
                  )
                })}
              </select>
            </FormField>
            <FormField label="Patient name *">
              <input
                className="form-input"
                value={form.patient_name}
                onChange={(e) => setForm((p) => ({ ...p, patient_name: e.target.value }))}
              />
            </FormField>
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
            <FormField label="Status">
              <select
                className="form-input"
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    status: e.target.value as 'critical' | 'at-risk' | 'healthy',
                  }))
                }
              >
                <option value="healthy">Healthy</option>
                <option value="at-risk">At Risk</option>
                <option value="critical">Critical</option>
              </select>
            </FormField>
            <FormField label="Primary donors">
              <input
                type="number"
                min={0}
                className="form-input"
                value={form.primary_donors}
                onChange={(e) => setForm((p) => ({ ...p, primary_donors: e.target.value }))}
              />
            </FormField>
            <FormField label="Backup donors">
              <input
                type="number"
                min={0}
                className="form-input"
                value={form.backup_donors}
                onChange={(e) => setForm((p) => ({ ...p, backup_donors: e.target.value }))}
              />
            </FormField>
            <FormField label={`Reliability: ${form.reliability}%`}>
              <input
                type="range"
                min={0}
                max={100}
                className="w-full accent-red-600"
                value={form.reliability}
                onChange={(e) => setForm((p) => ({ ...p, reliability: e.target.value }))}
              />
            </FormField>
            <FormField label="Coordinator *">
              <input
                className="form-input"
                value={form.coordinator}
                onChange={(e) => setForm((p) => ({ ...p, coordinator: e.target.value }))}
              />
            </FormField>
            <FormField label="Coordinator phone">
              <input
                className="form-input"
                value={form.coordinator_phone}
                onChange={(e) => setForm((p) => ({ ...p, coordinator_phone: e.target.value }))}
                placeholder="+91 ..."
              />
            </FormField>
            <FormField label="Next transfusion date">
              <input
                type="date"
                className="form-input"
                value={form.next_transfusion}
                onChange={(e) => setForm((p) => ({ ...p, next_transfusion: e.target.value }))}
              />
            </FormField>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-gradient-to-r from-red-600 to-red-700 text-[hsl(40,50%,98%)] px-4 py-2 rounded-[10px] shadow-md text-sm font-medium flex items-center gap-2 disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Creating...' : 'Create bridge'}
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

      <div className="relative z-10 flex flex-wrap gap-2">
        {chips.map((c) => {
          const isActive = filter === c.key
          return (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                isActive
                  ? 'bg-red-600 text-[hsl(40,50%,98%)] border-red-600 shadow-sm'
                  : 'bg-[hsl(40,50%,98%)] text-[hsl(20,25%,12%)] border-[hsl(30,25%,82%)] hover:bg-[hsl(40,40%,93%)]'
              }`}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      <div className="relative z-10">
        <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)] mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-red-700" />
          Bridge cards
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {safeBridges.length === 0 ? (
            <div className={`${CARD} col-span-full p-10 text-center`}>
              <GitBranch className="w-10 h-10 text-[hsl(20,15%,40%)]/40 mx-auto mb-2" />
              <p className="text-sm text-[hsl(20,15%,40%)] mb-3">
                No bridges yet. Set up your first donor network.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-red-600 to-red-700 text-[hsl(40,50%,98%)] px-4 py-2 rounded-[10px] shadow-md text-sm font-medium inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create your first bridge
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className={`${CARD} col-span-full p-10 text-center`}>
              <p className="text-sm text-[hsl(20,15%,40%)]">No bridges match this filter.</p>
            </div>
          ) : (
            filtered.map((b) => {
              const bid = String(b?._id ?? b?.id ?? Math.random())
              const open = !!expanded[bid]
              const status = readStatus(b)
              const reliability = readReliability(b)
              const nextDate = readNextTransfusion(b)
              const dh = readDonorHealth(b)
              return (
                <div key={bid} className={`${CARD} p-5 flex flex-col gap-4`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-lg font-bold text-[hsl(20,25%,12%)] leading-tight">
                        {readName(b)}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[hsl(20,15%,40%)]">
                        <span>{readPatient(b)}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 font-semibold text-[10px]">
                          {formatBloodGroup(readBlood(b)) || '—'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(
                        status,
                      )}`}
                    >
                      {statusLabel(status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[hsl(30,25%,82%)]">
                    <Metric label="Donors" value={`${readPrimary(b)}`} />
                    <Metric label="Backup" value={`${readBackup(b)}`} />
                    <Metric
                      label="Reliability"
                      value={`${reliability}%`}
                      valueClass={reliabilityColor(reliability)}
                    />
                  </div>

                  <div className="space-y-1.5 text-xs text-[hsl(20,25%,12%)]">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[hsl(20,15%,40%)]" />
                      <span>{readCoordinator(b)}</span>
                      <span className="flex items-center gap-1 ml-auto text-[hsl(20,15%,40%)]">
                        <Phone className="w-3 h-3" />
                        {readCoordinatorPhone(b)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-red-600" />
                      <span>
                        Next transfusion:{' '}
                        {nextDate ? new Date(nextDate).toLocaleDateString() : '—'}
                      </span>
                    </div>
                  </div>

                  {dh.length > 0 && (
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [bid]: !prev[bid] }))}
                      className="text-xs font-medium text-red-700 hover:text-red-800 flex items-center gap-1 self-start"
                    >
                      {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      View donor health
                    </button>
                  )}

                  {open && dh.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[hsl(30,25%,82%)]">
                      {dh.map((raw, i) => {
                        const d = readDh(raw)
                        return (
                          <div
                            key={i}
                            className="p-2.5 rounded-[10px] bg-[hsl(40,40%,93%)] border border-[hsl(30,25%,82%)]"
                          >
                            <div className="flex items-center justify-between text-xs font-semibold text-[hsl(20,25%,12%)]">
                              <span>{d.name}</span>
                              <span className={healthTextColor(d.status)}>{d.healthPercent}%</span>
                            </div>
                            <div className="mt-1.5 h-2 rounded-full bg-[hsl(40,30%,90%)] overflow-hidden">
                              <div
                                className={`h-full ${healthBarColor(d.status)}`}
                                style={{
                                  width: `${Math.max(0, Math.min(100, d.healthPercent))}%`,
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {allDonors.length > 0 && (
        <div className="relative z-10">
          <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)] mb-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-700" />
            Blood Bridge Health
          </h3>
          <p className="text-xs text-[hsl(20,15%,40%)] mb-3">
            Donor health monitoring across all bridges.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {allDonors.map((d, i) => (
              <div key={i} className={`${CARD} p-3.5 flex flex-col gap-2`}>
                <div className="text-sm font-semibold text-[hsl(20,25%,12%)] truncate">{d.name}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-[hsl(20,15%,40%)]">
                  <Activity className="w-3 h-3" />
                  {d.sensors} sensors
                </div>
                <div className="h-2 rounded-full bg-[hsl(40,30%,90%)] overflow-hidden">
                  <div
                    className={`h-full ${healthBarColor(d.status)}`}
                    style={{
                      width: `${Math.max(0, Math.min(100, Number(d.healthPercent) || 0))}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-semibold ${healthTextColor(d.status)}`}>
                    {d.healthPercent}%
                  </span>
                  <span className={healthTextColor(d.status)}>{statusLabel(d.status)}</span>
                </div>
                <div className="text-[10px] text-[hsl(20,15%,40%)] flex items-center gap-1 pt-1 border-t border-[hsl(30,25%,82%)]">
                  <Calendar className="w-2.5 h-2.5" />
                  Next: {d.nextDate ? new Date(d.nextDate).toLocaleDateString() : '—'}
                </div>
              </div>
            ))}
          </div>
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

function Metric({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold leading-tight ${valueClass || 'text-[hsl(20,25%,12%)]'}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-[hsl(20,15%,40%)] mt-0.5">
        {label}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent?: 'red' | 'amber' | 'green'
}) {
  const accentClass =
    accent === 'red'
      ? 'text-red-700'
      : accent === 'amber'
      ? 'text-amber-700'
      : accent === 'green'
      ? 'text-green-700'
      : 'text-[hsl(20,25%,12%)]'
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center justify-between mb-2 text-[hsl(20,15%,40%)]">
        <span className="text-[11px] uppercase tracking-wide font-semibold">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-bold ${accentClass}`}>{value}</div>
    </div>
  )
}
