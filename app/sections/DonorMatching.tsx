'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Heart, Loader2, Search, Phone, MapPin, Clock, Droplet } from 'lucide-react'
import { callAIAgent } from '@/lib/aiAgent'
import { formatBloodGroup, ALL_BLOOD_GROUPS } from '@/lib/bloodGroup'

const DONOR_AGENT_ID = '6a2484c16c86ec3584c733c4'
const RAG_ID = '6a24afd2a563cbef5db16369'
const BLOOD_TYPES = [...ALL_BLOOD_GROUPS]

/** Show the raw name from the agent, or a fallback */
function formatDonorName(raw: string, index: number): string {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') return `Donor ${index + 1}`
  return raw.trim()
}

/** Show the raw location from the dataset */
function formatLocation(loc: string): string {
  if (!loc) return '—'
  return loc
}

/** Return a display-safe contact string */
function formatContact(contact: string): string {
  if (!contact || contact.trim() === '') return 'Not available'
  return contact
}

interface Match {
  name: string
  blood_type: string
  compatibility_score: number
  last_donation_days_ago: number
  location: string
  contact: string
  availability_status: string
  match_reason: string
}

interface DonorResult {
  matches: Match[]
  summary: string
  compatibility_notes: string
}

interface DonorMatchingProps {
  donors: any[]
  sampleMode: boolean
  setActiveAgent: (id: string | null) => void
}

const SAMPLE_RESULT: DonorResult = {
  matches: [
    {
      name: 'Priya Sharma',
      blood_type: 'O negative',
      compatibility_score: 98,
      last_donation_days_ago: 92,
      location: 'Mumbai, Andheri',
      contact: '+91 98765 43210',
      availability_status: 'Available',
      match_reason: 'Universal donor, recent health check, lives within 5km',
    },
    {
      name: 'Rajesh Kumar',
      blood_type: 'O positive',
      compatibility_score: 91,
      last_donation_days_ago: 130,
      location: 'Mumbai, Bandra',
      contact: '+91 98123 45678',
      availability_status: 'Available',
      match_reason: 'Compatible donor, eligible by recency window',
    },
    {
      name: 'Anita Desai',
      blood_type: 'O negative',
      compatibility_score: 88,
      last_donation_days_ago: 75,
      location: 'Mumbai, Powai',
      contact: '+91 99999 11111',
      availability_status: 'On Standby',
      match_reason: 'Universal donor with confirmed availability this week',
    },
  ],
  summary: 'Found 3 strong matches within 10km radius. Top match Priya Sharma has 98% compatibility.',
  compatibility_notes: 'O negative is the universal donor and is suitable for all recipients. Prioritize donors with >90 days since last donation.',
}

const CARD_BASE =
  'bg-[hsl(40,50%,98%)]/75 backdrop-blur-[16px] border border-[hsl(0,30%,80%)]/30 shadow-md rounded-[14px]'

function scoreColor(score: number) {
  if (score >= 90) return 'bg-red-100 text-red-800 border-red-200'
  if (score >= 75) return 'bg-amber-100 text-amber-800 border-amber-200'
  if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

export default function DonorMatching({ donors, sampleMode, setActiveAgent }: DonorMatchingProps) {
  const [bloodType, setBloodType] = useState('O positive')
  const [unitsNeeded, setUnitsNeeded] = useState('2')
  const [urgency, setUrgency] = useState('High')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DonorResult | null>(sampleMode ? SAMPLE_RESULT : null)

  const findMatches = async () => {
    setLoading(true)
    setError(null)
    setActiveAgent(DONOR_AGENT_ID)

    if (sampleMode) {
      setTimeout(() => {
        setResult(SAMPLE_RESULT)
        setLoading(false)
        setActiveAgent(null)
      }, 800)
      return
    }

    const payload = {
      task: 'Find best matching donors for blood request',
      blood_type: bloodType,
      units_needed: Number(unitsNeeded) || 1,
      urgency,
      available_donors: Array.isArray(donors)
        ? donors.slice(0, 50).map((d) => ({
            name: d?.name,
            blood_type: d?.blood_type,
            last_donation: d?.last_donation,
            contact: d?.contact,
            location: d?.location,
            status: d?.status,
          }))
        : [],
      rag_id: RAG_ID,
    }

    try {
      const res = await callAIAgent(JSON.stringify(payload), DONOR_AGENT_ID)
      const raw = res?.response?.result ?? res?.response?.message ?? res?.response

      // Unwrap { text: "..." } envelope that the server normalizer adds
      let parsed: any = raw
      const rawStr: string | null =
        typeof raw === 'string'
          ? raw
          : raw && typeof raw === 'object' && typeof (raw as any).text === 'string'
          ? (raw as any).text
          : null

      if (rawStr !== null) {
        // The agent sometimes emits \xNN hex escapes which are NOT valid JSON.
        // Sanitize them by escaping the backslash so JSON.parse sees a literal \x.
        const sanitize = (s: string) => s.replace(/\\x([0-9a-fA-F]+)/gi, '\\\\x$1')
        try {
          parsed = JSON.parse(rawStr)
        } catch {
          try {
            parsed = JSON.parse(sanitize(rawStr))
          } catch {
            parsed = { summary: rawStr, matches: [], compatibility_notes: '' }
          }
        }
      }

      const inner = parsed?.result ?? parsed
      const safe: DonorResult = {
        matches: Array.isArray(inner?.matches) ? inner.matches : [],
        summary: typeof inner?.summary === 'string' ? inner.summary : '',
        compatibility_notes:
          typeof inner?.compatibility_notes === 'string' ? inner.compatibility_notes : '',
      }
      setResult(safe)
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch donor matches')
    } finally {
      setLoading(false)
      setActiveAgent(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[hsl(20,25%,12%)]">Donor Matching</h2>
        <p className="text-sm text-[hsl(20,15%,40%)]">
          AI-powered compatibility matching across your donor network
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className={`lg:col-span-4 ${CARD_BASE} h-fit`}>
          <CardHeader>
            <CardTitle className="text-base text-[hsl(20,25%,12%)] flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-700" />
              Request Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1.5 block">Blood Type</Label>
              <Select value={bloodType} onValueChange={setBloodType}>
                <SelectTrigger className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPES.map((bt) => (
                    <SelectItem key={bt} value={bt}>
                      {bt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1.5 block">Units Needed</Label>
              <Input
                type="number"
                min={1}
                value={unitsNeeded}
                onChange={(e) => setUnitsNeeded(e.target.value)}
                className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]"
              />
            </div>

            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1.5 block">Urgency</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={findMatches}
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-[hsl(40,50%,98%)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Matching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" /> Find Matches
                </>
              )}
            </Button>

            <div className="text-[11px] text-[hsl(20,15%,40%)] pt-2 border-t border-[hsl(30,30%,85%)]">
              Available donors in DB: {Array.isArray(donors) ? donors.length : 0}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-8 space-y-4">
          {error && (
            <div className="p-3 rounded-[10px] bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {result?.summary && (
            <Card className={CARD_BASE}>
              <CardContent className="p-4">
                <p className="text-sm text-[hsl(20,25%,12%)]">{result.summary}</p>
                {result.compatibility_notes && (
                  <p className="text-[12px] text-[hsl(20,15%,40%)] mt-2 pt-2 border-t border-[hsl(30,30%,85%)]">
                    {result.compatibility_notes}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-[12px] animate-pulse bg-[hsl(40,30%,90%)]" />
              ))}
            </div>
          )}

          {!loading && !result && (
            <Card className={CARD_BASE}>
              <CardContent className="py-12 text-center text-[hsl(20,15%,40%)] text-sm">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                Configure your request on the left and click &quot;Find Matches&quot; to see ranked donor recommendations.
              </CardContent>
            </Card>
          )}

          {!loading && result && Array.isArray(result.matches) && result.matches.length > 0 && (
            <div className="space-y-3">
              {result.matches.map((m, i) => (
                <Card
                  key={i}
                  className={`${CARD_BASE} hover:shadow-lg transition-all`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {/* Rank badge */}
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-[hsl(40,50%,98%)] font-bold text-xs shrink-0">
                            #{i + 1}
                          </div>
                          {/* Blood group badge */}
                          <div className="px-2 h-10 min-w-[44px] rounded-[10px] bg-gradient-to-br from-red-100 to-red-200 border border-red-300 flex items-center justify-center text-red-800 font-bold text-[11px] text-center">
                            {formatBloodGroup(m?.blood_type) || '—'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-base font-semibold text-[hsl(20,25%,12%)] truncate">
                              {formatDonorName(m?.name, i)}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`mt-0.5 text-[10px] ${
                                (m?.availability_status || '').toLowerCase() === 'available'
                                  ? 'border-green-300 text-green-700 bg-green-50'
                                  : 'border-gray-300 text-gray-500'
                              }`}
                            >
                              {m?.availability_status ?? 'Unknown'}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-[12px] text-[hsl(20,25%,12%)]/80 mb-3">
                          {m?.match_reason ?? ''}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[hsl(20,15%,40%)]">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{formatLocation(m?.location)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span className="truncate">{formatContact(m?.contact)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>
                              {m?.last_donation_days_ago != null
                                ? `${m.last_donation_days_ago} days ago`
                                : 'No donation history'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <Badge
                          variant="outline"
                          className={`${scoreColor(Number(m?.compatibility_score) || 0)} text-sm px-3 py-1`}
                        >
                          {Number(m?.compatibility_score) || 0}%
                        </Badge>
                        <span className="text-[10px] text-[hsl(20,15%,40%)] mt-1">compatibility</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && result && (!Array.isArray(result.matches) || result.matches.length === 0) && (
            <Card className={CARD_BASE}>
              <CardContent className="py-10 text-center text-[hsl(20,15%,40%)] text-sm">
                <Droplet className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No matching donors found. Try a different blood type or add more donors to your database.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
