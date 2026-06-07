'use client'

import { useMemo, useState } from 'react'
import {
  MapPin,
  Search,
  Loader2,
  Compass,
  Layers,
  Filter,
  Droplet,
  Grid3x3,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { formatBloodGroup } from '@/lib/bloodGroup'

interface DonorMapProps {
  donors: any[]
}

interface MappedDonor {
  id: string
  name: string
  bloodType: string
  status: string
  lat: number
  lng: number
  donations: number
}

interface Cluster {
  key: string
  cellLat: number
  cellLng: number
  centerLat: number
  centerLng: number
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  donors: MappedDonor[]
  groupCounts: Record<string, number>
  dominantGroup: string
  regionLabel: string
}

const CARD =
  'bg-[hsl(40,50%,98%)]/75 backdrop-blur-[16px] border border-[hsl(30,25%,82%)] rounded-[14px] shadow-md'

const BLOOD_GROUPS = [
  'O positive',
  'O negative',
  'A positive',
  'A negative',
  'B positive',
  'B negative',
  'AB positive',
  'AB negative',
] as const
type BloodGroup = (typeof BLOOD_GROUPS)[number] | 'OTHER'

const BLOOD_COLORS: Record<string, string> = {
  'O positive': '#dc2626',
  'O negative': '#991b1b',
  'A positive': '#ea580c',
  'A negative': '#9a3412',
  'B positive': '#d97706',
  'B negative': '#92400e',
  'AB positive': '#7c3aed',
  'AB negative': '#5b21b6',
  OTHER: '#6b7280',
}

const CELL_SIZE_OPTIONS = [
  { label: 'Fine (0.5°)', value: 0.5 },
  { label: 'Medium (1°)', value: 1 },
  { label: 'Coarse (2°)', value: 2 },
] as const

function normalizeBloodGroup(bt: string): BloodGroup {
  const v = formatBloodGroup(bt)
  if ((BLOOD_GROUPS as readonly string[]).includes(v)) return v as BloodGroup
  return 'OTHER'
}

function parseLatLng(donor: any): { lat: number; lng: number } | null {
  const numLat = Number(donor?.latitude)
  const numLng = Number(donor?.longitude)
  if (Number.isFinite(numLat) && Number.isFinite(numLng) && numLat !== 0 && numLng !== 0) {
    return { lat: numLat, lng: numLng }
  }
  const loc = String(donor?.location || '')
  if (loc.includes(',')) {
    const parts = loc.split(',').map((s) => s.trim())
    const lat = Number(parts[0])
    const lng = Number(parts[1])
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      return { lat, lng }
    }
  }
  return null
}

function regionLabel(lat: number, lng: number): string {
  const latBand = lat >= 28 ? 'North' : lat >= 22 ? 'Central' : lat >= 16 ? 'Deccan' : 'South'
  const lngBand = lng >= 85 ? 'East' : lng >= 78 ? 'Central' : 'West'
  const latStr = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`
  const lngStr = `${Math.abs(lng).toFixed(1)}°${lng >= 0 ? 'E' : 'W'}`
  return `${latBand} ${lngBand} • ${latStr}, ${lngStr}`
}

function projectToSvg(lat: number, lng: number, width = 800, height = 600) {
  const minLat = 8
  const maxLat = 37
  const minLng = 68
  const maxLng = 97
  const x = ((lng - minLng) / (maxLng - minLng)) * width
  const y = ((maxLat - lat) / (maxLat - minLat)) * height
  return { x, y }
}

function clusterByGrid(donors: MappedDonor[], cellSize: number): Cluster[] {
  const buckets: Record<string, MappedDonor[]> = {}
  donors.forEach((d) => {
    const cellLat = Math.floor(d.lat / cellSize) * cellSize
    const cellLng = Math.floor(d.lng / cellSize) * cellSize
    const key = `${cellLat.toFixed(2)}_${cellLng.toFixed(2)}`
    if (!buckets[key]) buckets[key] = []
    buckets[key].push(d)
  })

  const out: Cluster[] = []
  Object.entries(buckets).forEach(([key, list]) => {
    const cellLat = Number(key.split('_')[0])
    const cellLng = Number(key.split('_')[1])
    const sumLat = list.reduce((s, m) => s + m.lat, 0)
    const sumLng = list.reduce((s, m) => s + m.lng, 0)
    const centerLat = sumLat / list.length
    const centerLng = sumLng / list.length
    const groupCounts: Record<string, number> = {}
    list.forEach((m) => {
      const g = normalizeBloodGroup(m.bloodType)
      groupCounts[g] = (groupCounts[g] || 0) + 1
    })
    const dominantGroup = Object.entries(groupCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'OTHER'
    out.push({
      key,
      cellLat,
      cellLng,
      centerLat,
      centerLng,
      minLat: cellLat,
      maxLat: cellLat + cellSize,
      minLng: cellLng,
      maxLng: cellLng + cellSize,
      donors: list,
      groupCounts,
      dominantGroup,
      regionLabel: regionLabel(centerLat, centerLng),
    })
  })
  return out.sort((a, b) => b.donors.length - a.donors.length)
}

export default function DonorMap({ donors }: DonorMapProps) {
  const safeDonors = Array.isArray(donors) ? donors : []

  const mapped: MappedDonor[] = useMemo(() => {
    const out: MappedDonor[] = []
    safeDonors.forEach((d, i) => {
      const coord = parseLatLng(d)
      if (!coord) return
      if (coord.lat < 6 || coord.lat > 38 || coord.lng < 66 || coord.lng > 99) return
      out.push({
        id: String(d?._id ?? d?.id ?? i),
        name: String(d?.name ?? 'Donor'),
        bloodType: formatBloodGroup(d?.blood_type) || '—',
        status: String(d?.status ?? 'Available'),
        lat: coord.lat,
        lng: coord.lng,
        donations: Number(d?.donations_till_date ?? 0),
      })
    })
    return out
  }, [safeDonors])

  const byGroupCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    mapped.forEach((m) => {
      const g = normalizeBloodGroup(m.bloodType)
      counts[g] = (counts[g] || 0) + 1
    })
    return counts
  }, [mapped])

  const [activeGroup, setActiveGroup] = useState<'ALL' | BloodGroup>('ALL')
  const [cellSize, setCellSize] = useState<number>(1)
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return mapped.filter((m) => {
      const g = normalizeBloodGroup(m.bloodType)
      return activeGroup === 'ALL' || g === activeGroup
    })
  }, [mapped, activeGroup])

  const clusters = useMemo(() => clusterByGrid(filtered, cellSize), [filtered, cellSize])

  const stats = useMemo(() => {
    const total = filtered.length
    const clusterCount = clusters.length
    const largest = clusters[0]?.donors.length || 0
    const avgPerCluster = clusterCount ? Math.round(total / clusterCount) : 0
    return { total, clusterCount, largest, avgPerCluster }
  }, [filtered, clusters])

  const maxClusterSize = clusters[0]?.donors.length || 1

  const [query, setQuery] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeResults, setGeocodeResults] = useState<
    { label: string; point: number[]; country: string; region: string }[]
  >([])
  const [geocodeError, setGeocodeError] = useState<string | null>(null)

  const handleGeocode = async () => {
    if (!query.trim()) return
    setGeocoding(true)
    setGeocodeError(null)
    setGeocodeResults([])
    try {
      const res = await fetch('/api/aws/location', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'geocode', text: query.trim() }),
      })
      const json = await res.json()
      if (json?.success) {
        const arr = Array.isArray(json?.data?.results) ? json.data.results : []
        setGeocodeResults(arr.slice(0, 3))
      } else {
        setGeocodeError(json?.error || 'Geocode failed.')
      }
    } catch (e: any) {
      setGeocodeError(e?.message || 'Network error during geocode.')
    } finally {
      setGeocoding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md shrink-0">
          <MapPin className="w-5 h-5 text-[hsl(40,50%,98%)]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[hsl(20,25%,12%)]">Donor Map</h2>
          <p className="text-sm text-[hsl(20,15%,40%)] mt-0.5">
            Donors clustered by latitude/longitude grid cells across India. No city data required.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Mapped donors" value={String(stats.total)} icon={<MapPin className="w-4 h-4" />} />
        <StatCard
          label="Grid clusters"
          value={String(stats.clusterCount)}
          icon={<Grid3x3 className="w-4 h-4" />}
        />
        <StatCard
          label="Largest cluster"
          value={String(stats.largest)}
          icon={<Layers className="w-4 h-4" />}
        />
        <StatCard
          label="Avg per cluster"
          value={String(stats.avgPerCluster)}
          icon={<Compass className="w-4 h-4" />}
        />
      </div>

      <div className={`${CARD} p-4 space-y-3`}>
        <div className="flex items-start gap-2">
          <Filter className="w-4 h-4 text-red-700 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)]">Filter by blood group</h3>
            <p className="text-[11px] text-[hsl(20,15%,40%)]">
              {mapped.length} total mapped donors. Each chip shows count per group.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveGroup('ALL')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
              activeGroup === 'ALL'
                ? 'bg-red-600 text-[hsl(40,50%,98%)] border-red-600 shadow-sm'
                : 'bg-[hsl(40,50%,98%)] text-[hsl(20,25%,12%)] border-[hsl(30,25%,82%)] hover:bg-[hsl(40,40%,93%)]'
            }`}
          >
            All ({mapped.length})
          </button>
          {BLOOD_GROUPS.map((g) => {
            const count = byGroupCounts[g] || 0
            const isActive = activeGroup === g
            return (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                disabled={count === 0}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1.5 disabled:opacity-40 ${
                  isActive
                    ? 'text-[hsl(40,50%,98%)] shadow-sm'
                    : 'bg-[hsl(40,50%,98%)] text-[hsl(20,25%,12%)] border-[hsl(30,25%,82%)] hover:bg-[hsl(40,40%,93%)]'
                }`}
                style={
                  isActive
                    ? { background: BLOOD_COLORS[g], borderColor: BLOOD_COLORS[g] }
                    : undefined
                }
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: isActive ? '#fff' : BLOOD_COLORS[g] }}
                />
                {g} ({count})
              </button>
            )
          })}
          {byGroupCounts.OTHER ? (
            <button
              onClick={() => setActiveGroup('OTHER')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                activeGroup === 'OTHER'
                  ? 'bg-gray-600 text-[hsl(40,50%,98%)] border-gray-600 shadow-sm'
                  : 'bg-[hsl(40,50%,98%)] text-[hsl(20,25%,12%)] border-[hsl(30,25%,82%)] hover:bg-[hsl(40,40%,93%)]'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: BLOOD_COLORS.OTHER }} />
              Other ({byGroupCounts.OTHER})
            </button>
          ) : null}
        </div>

        <div className="pt-2 border-t border-[hsl(30,25%,82%)]">
          <div className="flex items-center gap-2 mb-2">
            <Grid3x3 className="w-3.5 h-3.5 text-red-700" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(20,25%,12%)]">
              Cluster granularity
            </span>
            <span className="text-[10px] text-[hsl(20,15%,40%)]">
              Smaller cells → more, tighter clusters. ~111 km per degree.
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CELL_SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCellSize(opt.value)}
                className={`px-3 py-1.5 rounded-[10px] text-[11px] font-medium border transition-all ${
                  cellSize === opt.value
                    ? 'bg-red-600 text-[hsl(40,50%,98%)] border-red-600 shadow-sm'
                    : 'bg-[hsl(40,50%,98%)] text-[hsl(20,25%,12%)] border-[hsl(30,25%,82%)] hover:bg-[hsl(40,40%,93%)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)]">India cluster distribution</h3>
          <span className="text-[11px] text-[hsl(20,15%,40%)]">
            {clusters.length} cluster{clusters.length === 1 ? '' : 's'} covering {stats.total} donors
          </span>
        </div>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 800 600"
            className="w-full h-auto max-w-full"
            style={{ background: 'linear-gradient(135deg, hsl(40,55%,96%) 0%, hsl(30,50%,94%) 100%)' }}
          >
            <defs>
              <linearGradient id="indiaFill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fecaca" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f87171" stopOpacity="0.18" />
              </linearGradient>
              <radialGradient id="clusterGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect
              x="40"
              y="40"
              width="720"
              height="520"
              rx="36"
              fill="url(#indiaFill)"
              stroke="#dc2626"
              strokeOpacity="0.35"
              strokeWidth="2"
            />

            <g stroke="#dc2626" strokeOpacity="0.08" strokeWidth="1">
              {[10, 15, 20, 25, 30, 35].map((lat) => {
                const { y } = projectToSvg(lat, 80)
                return <line key={`lat${lat}`} x1="40" y1={y} x2="760" y2={y} />
              })}
              {[70, 75, 80, 85, 90, 95].map((lng) => {
                const { x } = projectToSvg(20, lng)
                return <line key={`lng${lng}`} x1={x} y1="40" x2={x} y2="560" />
              })}
            </g>

            <text x="400" y="30" textAnchor="middle" fontSize="12" fill="#7c2d12" fontWeight="600">
              North
            </text>
            <text x="400" y="590" textAnchor="middle" fontSize="12" fill="#7c2d12" fontWeight="600">
              South
            </text>
            <text
              x="20"
              y="305"
              textAnchor="middle"
              fontSize="12"
              fill="#7c2d12"
              fontWeight="600"
              transform="rotate(-90 20 305)"
            >
              West
            </text>
            <text
              x="780"
              y="305"
              textAnchor="middle"
              fontSize="12"
              fill="#7c2d12"
              fontWeight="600"
              transform="rotate(90 780 305)"
            >
              East
            </text>

            {clusters.map((c) => {
              const { x, y } = projectToSvg(c.centerLat, c.centerLng)
              const r = 8 + Math.sqrt(c.donors.length / maxClusterSize) * 28
              const color = BLOOD_COLORS[c.dominantGroup] || BLOOD_COLORS.OTHER
              const isExpanded = expandedCluster === c.key
              return (
                <g
                  key={c.key}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedCluster(isExpanded ? null : c.key)}
                >
                  <circle cx={x} cy={y} r={r + 6} fill="url(#clusterGlow)" />
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill={color}
                    fillOpacity={isExpanded ? 0.95 : 0.78}
                    stroke="#fff"
                    strokeWidth={isExpanded ? 3 : 2}
                  >
                    <title>{`${c.regionLabel} — ${c.donors.length} donors, dominant ${c.dominantGroup}`}</title>
                  </circle>
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    fontSize={Math.max(10, Math.min(r * 0.7, 16))}
                    fill="#fff"
                    fontWeight="700"
                    pointerEvents="none"
                  >
                    {c.donors.length}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-[hsl(20,15%,40%)]">
          <span className="font-semibold">Cluster color = dominant blood group:</span>
          {BLOOD_GROUPS.map((g) =>
            byGroupCounts[g] ? <LegendDot key={g} color={BLOOD_COLORS[g]} label={g} /> : null,
          )}
          {byGroupCounts.OTHER ? <LegendDot color={BLOOD_COLORS.OTHER} label="Other" /> : null}
        </div>
        <p className="text-[10px] text-[hsl(20,15%,40%)] mt-2">
          Click a cluster bubble on the map or list below to expand its donors.
        </p>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="flex items-start gap-2 mb-3">
          <Layers className="w-4 h-4 text-red-700 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)]">Donors by region cluster</h3>
            <p className="text-[11px] text-[hsl(20,15%,40%)]">
              {clusters.length} grid cell{clusters.length === 1 ? '' : 's'} at {cellSize}° resolution
              (~{Math.round(cellSize * 111)} km). Sorted by donor count.
            </p>
          </div>
        </div>
        {clusters.length === 0 && (
          <p className="text-xs text-[hsl(20,15%,40%)] text-center py-6">
            No donors with mappable coordinates yet.
          </p>
        )}
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {clusters.map((c) => {
            const isExpanded = expandedCluster === c.key
            const color = BLOOD_COLORS[c.dominantGroup] || BLOOD_COLORS.OTHER
            return (
              <div
                key={c.key}
                className="rounded-[10px] bg-[hsl(40,40%,93%)] border border-[hsl(30,25%,82%)] overflow-hidden"
              >
                <button
                  onClick={() => setExpandedCluster(isExpanded ? null : c.key)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-[hsl(40,40%,90%)] transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[hsl(40,50%,98%)] font-bold text-xs shrink-0 shadow-sm"
                    style={{ background: color }}
                  >
                    {c.donors.length}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-semibold text-[hsl(20,25%,12%)] truncate">
                        {c.regionLabel}
                      </h4>
                      <span className="text-[10px] text-[hsl(20,15%,40%)] shrink-0">
                        cell {c.cellLat.toFixed(1)}°–{c.maxLat.toFixed(1)}° × {c.cellLng.toFixed(1)}°–
                        {c.maxLng.toFixed(1)}°
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {Object.entries(c.groupCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([g, count]) => (
                          <span
                            key={g}
                            className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full text-[hsl(40,50%,98%)] font-semibold"
                            style={{ background: BLOOD_COLORS[g] || BLOOD_COLORS.OTHER }}
                          >
                            {g} {count}
                          </span>
                        ))}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[hsl(20,15%,40%)] shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[hsl(20,15%,40%)] shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="p-3 pt-0 border-t border-[hsl(30,25%,82%)] bg-[hsl(40,50%,98%)]/40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                      {c.donors.map((d) => {
                        const g = normalizeBloodGroup(d.bloodType)
                        return (
                          <div
                            key={d.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[hsl(40,50%,98%)] border border-[hsl(30,25%,82%)]"
                            title={`${d.name} • ${d.bloodType} • ${d.donations} donations • ${d.lat.toFixed(3)}, ${d.lng.toFixed(3)}`}
                          >
                            <Droplet className="w-3 h-3 shrink-0" style={{ color: BLOOD_COLORS[g] }} />
                            <span className="text-[11px] text-[hsl(20,25%,12%)] font-medium truncate flex-1">
                              {d.name}
                            </span>
                            <span className="text-[10px] text-[hsl(20,15%,40%)] shrink-0">
                              {d.bloodType}
                            </span>
                            <span className="text-[9px] text-[hsl(20,15%,40%)] shrink-0 font-mono">
                              {d.lat.toFixed(2)},{d.lng.toFixed(2)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className={`${CARD} p-4 space-y-3`}>
        <div className="flex items-start gap-2">
          <Search className="w-4 h-4 text-red-700 mt-1" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)]">Geocode lookup</h3>
            <p className="text-[11px] text-[hsl(20,15%,40%)]">
              Look up coordinates for a city or hospital using AWS Location Service.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleGeocode()
            }}
            placeholder="e.g., Apollo Hospital Bangalore"
            className="flex-1 px-3 py-2 bg-[hsl(40,50%,98%)] border border-[hsl(30,30%,82%)] rounded-[10px] text-sm text-[hsl(20,25%,12%)]"
          />
          <button
            onClick={handleGeocode}
            disabled={geocoding || !query.trim()}
            className="bg-gradient-to-r from-red-600 to-red-700 text-[hsl(40,50%,98%)] rounded-[10px] px-4 py-2 text-sm font-medium shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-60"
          >
            {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {geocoding ? 'Searching...' : 'Geocode'}
          </button>
        </div>

        {geocodeError && (
          <div className="p-3 rounded-[10px] bg-red-50 border border-red-200 text-sm text-red-700">
            {geocodeError}
          </div>
        )}
        {geocodeResults.length > 0 && (
          <div className="space-y-2">
            {geocodeResults.map((r, i) => (
              <div
                key={i}
                className="p-3 rounded-[10px] bg-[hsl(40,40%,93%)] border border-[hsl(30,25%,82%)] text-xs"
              >
                <div className="font-semibold text-[hsl(20,25%,12%)] mb-1">{r?.label || '—'}</div>
                <div className="text-[hsl(20,15%,40%)] flex flex-wrap gap-x-3">
                  <span>Lat: {r?.point?.[1]?.toFixed?.(4) ?? '—'}</span>
                  <span>Lng: {r?.point?.[0]?.toFixed?.(4) ?? '—'}</span>
                  <span>
                    {r?.region ?? ''} {r?.country ? `(${r.country})` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center justify-between mb-2 text-[hsl(20,15%,40%)]">
        <span className="text-[11px] uppercase tracking-wide font-semibold">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-[hsl(20,25%,12%)]">{value}</div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
