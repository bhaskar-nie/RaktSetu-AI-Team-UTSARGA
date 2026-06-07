'use client'

import React, { useMemo, useState } from 'react'
import {
  Trophy,
  Award,
  Heart,
  Sparkles,
  Shield,
  Star,
  Zap,
  Users,
  Droplet,
  Medal,
} from 'lucide-react'
import { formatBloodGroup } from '@/lib/bloodGroup'

interface HallOfFameProps {
  donors: any[]
}

const CARD =
  'bg-[hsl(40,50%,98%)]/75 backdrop-blur-[16px] border border-[hsl(30,25%,82%)] rounded-[14px] shadow-md'
const SUBCARD =
  'bg-[hsl(40,50%,98%)]/60 border border-[hsl(30,30%,85%)]/60 rounded-[10px]'

type BadgeKey =
  | 'lifesaver'
  | 'bridge'
  | 'universal'
  | 'rare'
  | 'veteran'
  | 'first'

interface BadgeDef {
  key: BadgeKey
  label: string
  description: string
  icon: any
  chipClass: string
  iconClass: string
}

const BADGES: BadgeDef[] = [
  {
    key: 'lifesaver',
    label: 'Lifesaver',
    description: '5+ donations',
    icon: Award,
    chipClass: 'bg-red-100 text-red-800 border-red-200',
    iconClass: 'text-red-700',
  },
  {
    key: 'bridge',
    label: 'Bridge Builder',
    description: 'Registered as a bridge donor',
    icon: Heart,
    chipClass: 'bg-rose-100 text-rose-800 border-rose-200',
    iconClass: 'text-rose-700',
  },
  {
    key: 'universal',
    label: 'Universal Donor',
    description: 'O negative blood type',
    icon: Sparkles,
    chipClass: 'bg-amber-100 text-amber-800 border-amber-200',
    iconClass: 'text-amber-700',
  },
  {
    key: 'rare',
    label: 'Rare Hero',
    description: 'AB negative, B negative, or A negative blood type',
    icon: Shield,
    chipClass: 'bg-violet-100 text-violet-800 border-violet-200',
    iconClass: 'text-violet-700',
  },
  {
    key: 'veteran',
    label: 'Veteran',
    description: '10+ donations',
    icon: Star,
    chipClass: 'bg-orange-100 text-orange-800 border-orange-200',
    iconClass: 'text-orange-700',
  },
  {
    key: 'first',
    label: 'First Response',
    description: '1+ donation',
    icon: Zap,
    chipClass: 'bg-green-100 text-green-800 border-green-200',
    iconClass: 'text-green-700',
  },
]

const BADGE_MAP: Record<BadgeKey, BadgeDef> = BADGES.reduce((acc, b) => {
  acc[b.key] = b
  return acc
}, {} as Record<BadgeKey, BadgeDef>)

function computeBadges(donor: any): BadgeKey[] {
  const donations = Number(donor?.donations_till_date) || 0
  const bloodType = formatBloodGroup(donor?.blood_type || donor?.bloodType)
  const donorType = String(donor?.donor_type || donor?.donorType || '').toLowerCase()
  const badges: BadgeKey[] = []
  if (donations >= 1) badges.push('first')
  if (donations >= 5) badges.push('lifesaver')
  if (donations >= 10) badges.push('veteran')
  if (donorType === 'bridge') badges.push('bridge')
  if (bloodType === 'O negative') badges.push('universal')
  if (['AB negative', 'B negative', 'A negative'].includes(bloodType)) badges.push('rare')
  return badges
}

type FilterKey = 'all' | 'universal' | 'bridge' | 'five' | 'ten'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All donors' },
  { key: 'universal', label: 'O negative (Universal)' },
  { key: 'bridge', label: 'Bridge donors' },
  { key: 'five', label: '5+ donations' },
  { key: 'ten', label: '10+ donations' },
]

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: any
}) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md">
          <Icon className="w-5 h-5 text-[hsl(40,50%,98%)]" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[hsl(20,15%,40%)] font-semibold">
            {label}
          </p>
          <p className="text-xl font-bold text-[hsl(20,25%,12%)] leading-tight">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function BadgeChip({ keyName }: { keyName: BadgeKey }) {
  const def = BADGE_MAP[keyName]
  if (!def) return null
  const Icon = def.icon
  return (
    <span
      title={def.description}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${def.chipClass}`}
    >
      <Icon className="w-3 h-3" />
      <span>{def.label}</span>
    </span>
  )
}

function RankCell({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 text-amber-900 text-xs font-bold border border-amber-400 shadow-sm">
        <Trophy className="w-3 h-3" /> #1
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[hsl(40,30%,90%)] text-[hsl(20,25%,12%)] text-xs font-bold border border-[hsl(30,25%,82%)]">
        <Medal className="w-3 h-3" /> #2
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200">
        <Medal className="w-3 h-3" /> #3
      </div>
    )
  }
  return (
    <span className="text-xs text-[hsl(20,15%,40%)] font-medium">#{rank}</span>
  )
}

export default function HallOfFame({ donors }: HallOfFameProps) {
  const [filter, setFilter] = useState<FilterKey>('all')

  const donorList = Array.isArray(donors) ? donors : []

  const enriched = useMemo(() => {
    return donorList.map((d) => {
      const donations = Number(d?.donations_till_date) || 0
      const bloodType = formatBloodGroup(d?.blood_type || d?.bloodType) || '—'
      const name = String(d?.name || 'Unnamed donor')
      const badges = computeBadges(d)
      return { raw: d, name, bloodType, donations, badges }
    })
  }, [donorList])

  const filtered = useMemo(() => {
    if (filter === 'all') return enriched
    if (filter === 'universal') return enriched.filter((d) => d.bloodType === 'O negative')
    if (filter === 'bridge')
      return enriched.filter((d) => d.badges.includes('bridge'))
    if (filter === 'five') return enriched.filter((d) => d.donations >= 5)
    if (filter === 'ten') return enriched.filter((d) => d.donations >= 10)
    return enriched
  }, [enriched, filter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => b.donations - a.donations)
  }, [filtered])

  const totalDonors = enriched.length
  const totalDonations = enriched.reduce((sum, d) => sum + d.donations, 0)
  const bridgeCount = enriched.filter((d) => d.badges.includes('bridge')).length

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md">
          <Trophy className="w-5 h-5 text-[hsl(40,50%,98%)]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[hsl(20,25%,12%)]">
            Donor Hall of Fame
          </h2>
          <p className="text-xs text-[hsl(20,15%,40%)]">
            Recognizing the heroes who keep RaktSetu alive.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total donors" value={totalDonors} icon={Users} />
        <StatCard
          label="Total donations"
          value={totalDonations}
          icon={Heart}
        />
        <StatCard label="Bridge donors" value={bridgeCount} icon={Shield} />
      </div>

      <div className={`${CARD} p-4`}>
        <p className="text-[11px] uppercase tracking-wider text-[hsl(20,25%,12%)]/70 font-semibold mb-3">
          Badge legend
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {BADGES.map((b) => {
            const Icon = b.icon
            return (
              <div
                key={b.key}
                className={`${SUBCARD} px-3 py-2 flex items-center gap-2.5`}
              >
                <div
                  className={`w-8 h-8 rounded-[8px] bg-[hsl(40,30%,90%)] border border-[hsl(30,25%,82%)] flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-4 h-4 ${b.iconClass}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[hsl(20,25%,12%)] truncate">
                    {b.label}
                  </p>
                  <p className="text-[10px] text-[hsl(20,15%,40%)] truncate">
                    {b.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <p className="text-[11px] uppercase tracking-wider text-[hsl(20,25%,12%)]/70 font-semibold">
            Leaderboard ({sorted.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all ${
                    active
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-[hsl(40,50%,98%)] border-red-700 shadow-sm'
                      : 'bg-[hsl(40,50%,98%)]/70 text-[hsl(20,25%,12%)] border-[hsl(30,30%,82%)] hover:bg-[hsl(40,30%,90%)]'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="py-12 text-center text-[hsl(20,15%,40%)] text-sm">
            <Droplet className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No donor records yet. Add donors in the Donors section.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-[hsl(20,15%,40%)] border-b border-[hsl(30,30%,85%)]">
                  <th className="px-2 py-2 font-semibold w-16">Rank</th>
                  <th className="px-2 py-2 font-semibold">Name</th>
                  <th className="px-2 py-2 font-semibold w-24">Blood type</th>
                  <th className="px-2 py-2 font-semibold w-28">Donations</th>
                  <th className="px-2 py-2 font-semibold">Badges</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((d, i) => {
                  const rank = i + 1
                  const isTop = rank <= 3
                  const rowClass =
                    rank === 1
                      ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
                      : rank === 2
                      ? 'bg-[hsl(40,30%,93%)] border-[hsl(30,25%,82%)]'
                      : rank === 3
                      ? 'bg-orange-50/60 border-orange-200'
                      : 'bg-[hsl(40,50%,98%)]/70 border-[hsl(30,30%,85%)]'
                  return (
                    <tr
                      key={`${d.name}-${i}`}
                      className={`border-b last:border-0 ${rowClass}`}
                    >
                      <td className={`px-2 ${isTop ? 'py-3' : 'py-2'}`}>
                        <RankCell rank={rank} />
                      </td>
                      <td className={`px-2 ${isTop ? 'py-3' : 'py-2'}`}>
                        <p
                          className={`font-semibold text-[hsl(20,25%,12%)] truncate ${
                            isTop ? 'text-sm' : 'text-xs'
                          }`}
                        >
                          {d.name}
                        </p>
                      </td>
                      <td className={`px-2 ${isTop ? 'py-3' : 'py-2'}`}>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold">
                          {d.bloodType}
                        </span>
                      </td>
                      <td className={`px-2 ${isTop ? 'py-3' : 'py-2'}`}>
                        <span
                          className={`font-bold ${
                            isTop ? 'text-base' : 'text-sm'
                          } text-[hsl(20,25%,12%)]`}
                        >
                          {d.donations}
                        </span>
                      </td>
                      <td className={`px-2 ${isTop ? 'py-3' : 'py-2'}`}>
                        {d.badges.length === 0 ? (
                          <span className="text-[10px] text-[hsl(20,15%,40%)]">
                            —
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {d.badges.map((b) => (
                              <BadgeChip key={b} keyName={b} />
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
