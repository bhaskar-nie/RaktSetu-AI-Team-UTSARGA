'use client'

import { useState, useMemo } from 'react'
import {
  Users,
  MapPin,
  Building2,
  Heart,
  Search,
  Plus,
  X,
  Activity,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

import { formatBloodGroup, ALL_BLOOD_GROUPS } from '@/lib/bloodGroup'

const HERO_SVG =
  'https://db.bloodwarriors.in/storage/v1/object/public/portal-static-assets/illustrations/hero-section.svg'

const BLOOD_TYPES = [...ALL_BLOOD_GROUPS]

const CARD =
  'bg-[hsl(40,50%,98%)]/75 backdrop-blur-[16px] border border-[hsl(30,25%,82%)] rounded-[14px] shadow-md'

const TODAY = new Date('2026-06-06')

function readBlood(p: any): string {
  return p?.blood_type ?? p?.bloodType ?? ''
}
function readIron(p: any): string {
  return (p?.iron_level ?? p?.ironLevel ?? 'low') as string
}
function readFreq(p: any): number {
  const v = p?.frequency_days ?? p?.frequency
  if (typeof v === 'number') return v
  const m = /(\d+)/.exec(String(v || ''))
  return m ? Number(m[1]) : 21
}
function readLast(p: any): string {
  return p?.last_transfusion ?? p?.lastTransfusion ?? ''
}

function daysUntilNext(p: any): number {
  const lastStr = readLast(p)
  if (!lastStr) return 999
  const last = new Date(lastStr)
  if (isNaN(last.getTime())) return 999
  const days = readFreq(p)
  const next = new Date(last)
  next.setDate(next.getDate() + days)
  const diff = Math.ceil((next.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

function ironBadgeClass(level: string) {
  if (level === 'high') return 'bg-red-100 text-red-700 border-red-200'
  if (level === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-green-100 text-green-700 border-green-200'
}

function nextDueClass(days: number) {
  if (days < 3) return 'text-red-700'
  if (days <= 7) return 'text-amber-700'
  return 'text-green-700'
}

type FilterKey = 'all' | 'high' | 'medium' | 'low' | 'due'

interface PatientsProps {
  patients: any[]
  refreshPatients: () => Promise<void>
  transfusions?: any[]
}

export default function Patients({ patients, refreshPatients, transfusions }: PatientsProps) {
  const safePatients = Array.isArray(patients) ? patients : []
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    age: '',
    blood_type: 'O positive',
    location: '',
    hospital: '',
    caregiver: '',
    caregiver_phone: '',
    transfusions: '0',
    frequency_days: '21',
    iron_level: 'low' as 'high' | 'medium' | 'low',
    last_transfusion: '',
    notes: '',
  })
  const [banner, setBanner] = useState<{ tone: 'green' | 'amber' | 'red'; text: string } | null>(null)

  const stats = useMemo(() => {
    const total = safePatients.length
    const highIron = safePatients.filter((p) => readIron(p) === 'high').length
    const avg =
      total === 0
        ? 0
        : Math.round(safePatients.reduce((s, p) => s + (Number(p?.transfusions) || 0), 0) / total)
    const dueWeek = safePatients.filter((p) => {
      const d = daysUntilNext(p)
      return d >= 0 && d <= 7
    }).length
    return { total, highIron, avg, dueWeek }
  }, [safePatients])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return safePatients.filter((p) => {
      const iron = readIron(p)
      if (filter === 'high' && iron !== 'high') return false
      if (filter === 'medium' && iron !== 'medium') return false
      if (filter === 'low' && iron !== 'low') return false
      if (filter === 'due') {
        const d = daysUntilNext(p)
        if (!(d >= 0 && d <= 7)) return false
      }
      if (q) {
        const name = String(p?.name ?? '').toLowerCase()
        const hosp = String(p?.hospital ?? '').toLowerCase()
        return name.includes(q) || hosp.includes(q)
      }
      return true
    })
  }, [safePatients, filter, search])

  const upcomingForPatient = (pid: string) => {
    const list = Array.isArray(transfusions) ? transfusions : []
    return list.filter((t) => String(t?.patient_id) === String(pid) && t?.status !== 'completed').length
  }

  const handleAdd = async () => {
    if (!form.name.trim() || !form.hospital.trim() || !form.last_transfusion) {
      setBanner({ tone: 'amber', text: 'Name, hospital and last transfusion date are required.' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          age: form.age.trim(),
          blood_type: form.blood_type,
          location: form.location.trim(),
          hospital: form.hospital.trim(),
          caregiver: form.caregiver.trim(),
          caregiver_phone: form.caregiver_phone.trim(),
          transfusions: Number(form.transfusions) || 0,
          frequency_days: Number(form.frequency_days) || 21,
          iron_level: form.iron_level,
          last_transfusion: form.last_transfusion,
          notes: form.notes.trim(),
        }),
      })
      const json = await res.json()
      if (!json?.success) {
        setBanner({ tone: 'red', text: json?.error || 'Failed to save patient.' })
        return
      }
      await refreshPatients()
      setShowForm(false)
      setForm({
        name: '',
        age: '',
        blood_type: 'O positive',
        location: '',
        hospital: '',
        caregiver: '',
        caregiver_phone: '',
        transfusions: '0',
        frequency_days: '21',
        iron_level: 'low',
        last_transfusion: '',
        notes: '',
      })
      setBanner({ tone: 'green', text: `${form.name} added to the patient registry.` })
    } catch (err: any) {
      setBanner({ tone: 'red', text: err?.message || 'Network error saving patient.' })
    } finally {
      setSaving(false)
    }
  }

  const chips: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'high', label: 'High Iron' },
    { key: 'medium', label: 'Medium Iron' },
    { key: 'low', label: 'Low Iron' },
    { key: 'due', label: 'Due This Week' },
  ]

  return (
    <div className="relative space-y-6">
      <img
        src={HERO_SVG}
        alt=""
        className="absolute top-0 right-0 max-w-md w-[40vw] opacity-10 pointer-events-none select-none -z-0"
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md shrink-0">
            <Users className="w-5 h-5 text-[hsl(40,50%,98%)]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[hsl(20,25%,12%)]">Thalassemia Patients</h2>
            <p className="text-sm text-[hsl(20,15%,40%)] mt-0.5">
              Care coordination for every blood warrior under our network.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-[hsl(40,50%,98%)] px-4 py-2 rounded-[10px] shadow-md hover:shadow-lg text-sm font-medium flex items-center gap-2 transition-all"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Patient'}
        </button>
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

      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total patients" value={stats.total} icon={<Users className="w-4 h-4" />} />
        <StatCard
          label="High iron"
          value={stats.highIron}
          icon={<AlertTriangle className="w-4 h-4" />}
          accent="red"
        />
        <StatCard
          label="Avg transfusions"
          value={stats.avg}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Due this week"
          value={stats.dueWeek}
          icon={<Calendar className="w-4 h-4" />}
          accent="amber"
        />
      </div>

      {showForm && (
        <div className={`relative z-10 ${CARD} p-4 space-y-3`}>
          <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)]">New patient</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField label="Name *">
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Full name"
              />
            </FormField>
            <FormField label="Age">
              <input
                className="form-input"
                value={form.age}
                onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
                placeholder="e.g., 8y"
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
            <FormField label="Location">
              <input
                className="form-input"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="City"
              />
            </FormField>
            <FormField label="Hospital *">
              <input
                className="form-input"
                value={form.hospital}
                onChange={(e) => setForm((p) => ({ ...p, hospital: e.target.value }))}
                placeholder="Hospital name"
              />
            </FormField>
            <FormField label="Caregiver">
              <input
                className="form-input"
                value={form.caregiver}
                onChange={(e) => setForm((p) => ({ ...p, caregiver: e.target.value }))}
                placeholder="Caregiver name"
              />
            </FormField>
            <FormField label="Caregiver phone">
              <input
                className="form-input"
                value={form.caregiver_phone}
                onChange={(e) => setForm((p) => ({ ...p, caregiver_phone: e.target.value }))}
                placeholder="+91 ..."
              />
            </FormField>
            <FormField label="Lifetime transfusions">
              <input
                type="number"
                min={0}
                className="form-input"
                value={form.transfusions}
                onChange={(e) => setForm((p) => ({ ...p, transfusions: e.target.value }))}
              />
            </FormField>
            <FormField label="Frequency (days)">
              <input
                type="number"
                min={1}
                className="form-input"
                value={form.frequency_days}
                onChange={(e) => setForm((p) => ({ ...p, frequency_days: e.target.value }))}
              />
            </FormField>
            <FormField label="Iron level">
              <select
                className="form-input"
                value={form.iron_level}
                onChange={(e) =>
                  setForm((p) => ({ ...p, iron_level: e.target.value as 'high' | 'medium' | 'low' }))
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </FormField>
            <FormField label="Last transfusion *">
              <input
                type="date"
                className="form-input"
                value={form.last_transfusion}
                onChange={(e) => setForm((p) => ({ ...p, last_transfusion: e.target.value }))}
              />
            </FormField>
            <FormField label="Notes">
              <input
                className="form-input"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional"
              />
            </FormField>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="bg-gradient-to-r from-red-600 to-red-700 text-[hsl(40,50%,98%)] px-4 py-2 rounded-[10px] shadow-md text-sm font-medium flex items-center gap-2 disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save patient'}
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

      <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex flex-wrap gap-2 flex-1">
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
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(20,15%,40%)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or hospital..."
            className="w-full pl-9 pr-3 py-2 bg-[hsl(40,50%,98%)] border border-[hsl(30,25%,82%)] rounded-[10px] text-sm text-[hsl(20,25%,12%)]"
          />
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {safePatients.length === 0 ? (
          <div className={`${CARD} col-span-full p-10 text-center`}>
            <Users className="w-10 h-10 text-[hsl(20,15%,40%)]/40 mx-auto mb-2" />
            <p className="text-sm text-[hsl(20,15%,40%)] mb-3">
              No patients registered yet. Build your warrior network.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-red-600 to-red-700 text-[hsl(40,50%,98%)] px-4 py-2 rounded-[10px] shadow-md text-sm font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add your first patient
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${CARD} col-span-full p-10 text-center`}>
            <Users className="w-10 h-10 text-[hsl(20,15%,40%)]/40 mx-auto mb-2" />
            <p className="text-sm text-[hsl(20,15%,40%)]">No patients match your filters.</p>
          </div>
        ) : (
          filtered.map((p) => {
            const next = daysUntilNext(p)
            const pid = String(p?._id ?? p?.id ?? '')
            const iron = readIron(p)
            const lastStr = readLast(p)
            const lastDisplay = lastStr ? new Date(lastStr).toLocaleDateString() : '—'
            const upcoming = upcomingForPatient(pid)
            return (
              <div key={pid || (p?.name ?? Math.random())} className={`${CARD} p-5 flex flex-col gap-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-[hsl(20,25%,12%)] leading-tight">
                      {p?.name ?? 'Unnamed'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[hsl(20,15%,40%)]">
                      <span>{p?.age || '—'}</span>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 font-semibold text-[10px]">
                        {formatBloodGroup(readBlood(p)) || '—'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {p?.location || '—'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${ironBadgeClass(
                      iron,
                    )}`}
                  >
                    Iron {iron}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[hsl(20,25%,12%)]">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-[hsl(20,15%,40%)]" />
                    <span>{p?.hospital || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-red-600" />
                    <span>Caregiver: {p?.caregiver || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[hsl(20,15%,40%)]" />
                    <span>Last: {lastDisplay}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[hsl(30,25%,82%)]">
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-700 leading-tight">
                      {Number(p?.transfusions) || 0}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-[hsl(20,15%,40%)] mt-0.5">
                      Transfusions
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-[hsl(20,25%,12%)] leading-tight">
                      {readFreq(p)}d
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-[hsl(20,15%,40%)] mt-0.5">
                      Frequency
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-amber-700 leading-tight">{upcoming}</div>
                    <div className="text-[10px] uppercase tracking-wide text-[hsl(20,15%,40%)] mt-0.5">
                      Upcoming
                    </div>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-2 text-[11px] font-medium ${nextDueClass(next)}`}
                >
                  <Activity className="w-3 h-3" />
                  {next < 0
                    ? `Overdue by ${Math.abs(next)}d`
                    : next === 0
                    ? 'Due today'
                    : `Next due in ${next}d`}
                </div>

                {p?.notes && (
                  <p className="text-[11px] text-[hsl(20,15%,40%)] italic border-t border-[hsl(30,25%,82%)] pt-2">
                    {p.notes}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>
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

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent?: 'red' | 'amber'
}) {
  const accentClass =
    accent === 'red' ? 'text-red-700' : accent === 'amber' ? 'text-amber-700' : 'text-[hsl(20,25%,12%)]'
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
