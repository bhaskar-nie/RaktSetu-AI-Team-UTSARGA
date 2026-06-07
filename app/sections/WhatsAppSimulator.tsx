'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  BellRing,
  Calendar,
  CheckCircle2,
  Clock,
  Droplet,
  GraduationCap,
  Heart,
  Loader2,
  MessageSquare,
  PhoneCall,
  PlayCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  Siren,
  Sparkles,
  Stethoscope,
  Users,
  XCircle,
  Mail,
  Volume2,
} from 'lucide-react'
import { callAIAgent } from '@/lib/aiAgent'

const CHAT_AGENT_ID = '6a2483ed8dd4e60c5ed289ea'

interface Props {
  sampleMode: boolean
  setActiveAgent: (id: string | null) => void
}

type StageKey = 'T-14' | 'T-7' | 'T-4' | 'T-1' | 'D+0' | 'D+5'
type IntentKey = 'CONFIRM' | 'DECLINE' | 'RESCHEDULE' | 'QUESTION' | 'AMBIGUOUS' | 'NO_RESPONSE'
type DonorStatus =
  | 'PENDING'
  | 'CONTACTED'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'RESCHEDULED'
  | 'ESCALATED'
  | 'COMPLETED'
type TabKey = 'cycle' | 'briefing' | 'family'

const STAGES: { key: StageKey; label: string; sub: string; icon: any }[] = [
  { key: 'T-14', label: 'T-14 Days', sub: 'Soft awareness', icon: BellRing },
  { key: 'T-7', label: 'T-7 Days', sub: 'Preparation nudge', icon: Calendar },
  { key: 'T-4', label: 'T-4 Days', sub: 'Formal confirmation', icon: ShieldAlert },
  { key: 'T-1', label: 'T-1 Day', sub: 'Logistics reminder', icon: Clock },
  { key: 'D+0', label: 'D+0', sub: 'Day-of check-in', icon: PhoneCall },
  { key: 'D+5', label: 'D+5', sub: 'Microlearning', icon: GraduationCap },
]

const PATIENT = {
  name: 'Priya',
  blood: 'B+',
  hospital: 'NIMS, Hyderabad',
  hospital_address: 'Punjagutta, Hyderabad',
  hospital_phone: '+91 40 2348 9000',
  caregiver: 'Sudha (mother)',
  caregiver_phone: '+91 98xxx xxx12',
  age: 11,
}

interface Donor {
  id: string
  name: string
  bloodType: string
  language: string
  rotationOrder: number
  isBackup: boolean
  status: DonorStatus
  riskScore: number
  streak: number
  totalDonations: number
  preferredTime: 'morning' | 'evening'
  personalNote?: string
}

const INITIAL_DONORS: Donor[] = [
  {
    id: 'd1',
    name: 'Rajan',
    bloodType: 'B+',
    language: 'English',
    rotationOrder: 1,
    isBackup: false,
    status: 'PENDING',
    riskScore: 12,
    streak: 20,
    totalDonations: 18,
    preferredTime: 'morning',
    personalNote: 'Software engineer, runs weekends.',
  },
  {
    id: 'd2',
    name: 'Aisha',
    bloodType: 'B+',
    language: 'Hindi',
    rotationOrder: 2,
    isBackup: false,
    status: 'PENDING',
    riskScore: 18,
    streak: 14,
    totalDonations: 11,
    preferredTime: 'evening',
    personalNote: 'Teacher; prefers evenings after class.',
  },
  {
    id: 'd3',
    name: 'Karthik',
    bloodType: 'B+',
    language: 'Telugu',
    rotationOrder: 3,
    isBackup: false,
    status: 'PENDING',
    riskScore: 9,
    streak: 32,
    totalDonations: 27,
    preferredTime: 'morning',
    personalNote: 'Gold Guardian streak.',
  },
  {
    id: 'd4',
    name: 'Meera',
    bloodType: 'B+',
    language: 'English',
    rotationOrder: 4,
    isBackup: false,
    status: 'PENDING',
    riskScore: 24,
    streak: 6,
    totalDonations: 5,
    preferredTime: 'evening',
  },
  {
    id: 'd5',
    name: 'Vikram',
    bloodType: 'B+',
    language: 'English',
    rotationOrder: 5,
    isBackup: false,
    status: 'PENDING',
    riskScore: 38,
    streak: 3,
    totalDonations: 9,
    preferredTime: 'morning',
    personalNote: 'Travels frequently for work.',
  },
  {
    id: 'b1',
    name: 'Suresh',
    bloodType: 'O+',
    language: 'Tamil',
    rotationOrder: 6,
    isBackup: true,
    status: 'PENDING',
    riskScore: 14,
    streak: 22,
    totalDonations: 19,
    preferredTime: 'morning',
  },
  {
    id: 'b2',
    name: 'Lakshmi',
    bloodType: 'B+',
    language: 'Kannada',
    rotationOrder: 7,
    isBackup: true,
    status: 'PENDING',
    riskScore: 19,
    streak: 10,
    totalDonations: 8,
    preferredTime: 'evening',
  },
  {
    id: 'b3',
    name: 'Imran',
    bloodType: 'B+',
    language: 'Hindi',
    rotationOrder: 8,
    isBackup: true,
    status: 'PENDING',
    riskScore: 16,
    streak: 17,
    totalDonations: 14,
    preferredTime: 'morning',
  },
]

const RESPONSE_TEMPLATES: Record<IntentKey, string[]> = {
  CONFIRM: [
    'Yes, I will be there. Thank you for letting me know.',
    'Haan, confirmed. I will reach by 9 AM.',
    'Confirmed for Thursday. Tell Priya not to worry.',
  ],
  DECLINE: [
    'Sorry, I am travelling that week. Cannot make it this time.',
    'Not possible this Thursday — family function. Apologies.',
    'I am unwell, cannot donate this cycle.',
  ],
  RESCHEDULE: [
    'Can we shift to Monday? Thursday I have a deadline.',
    'Friday morning would work much better for me.',
    'Could we move it by 2 days?',
  ],
  QUESTION: [
    'What time should I reach the hospital?',
    'Do I need to fast before donating?',
    'Which department in NIMS is the blood bank?',
  ],
  AMBIGUOUS: [
    'Maybe, let me check my schedule.',
    'Not sure yet, will get back to you.',
    'Possibly... I will try.',
  ],
  NO_RESPONSE: [],
}

const CARD =
  'bg-[hsl(40,50%,98%)]/85 backdrop-blur-[16px] border border-[hsl(30,25%,82%)] rounded-[14px] shadow-md'

function intentChip(intent: IntentKey | undefined): string {
  if (!intent) return 'bg-gray-100 text-gray-700 border-gray-200'
  if (intent === 'CONFIRM') return 'bg-green-100 text-green-800 border-green-300'
  if (intent === 'DECLINE') return 'bg-red-100 text-red-800 border-red-300'
  if (intent === 'RESCHEDULE') return 'bg-amber-100 text-amber-800 border-amber-300'
  if (intent === 'QUESTION') return 'bg-blue-100 text-blue-800 border-blue-300'
  if (intent === 'AMBIGUOUS') return 'bg-purple-100 text-purple-800 border-purple-300'
  return 'bg-gray-200 text-gray-800 border-gray-300'
}

function donorStatusChip(s: DonorStatus): { cls: string; label: string } {
  if (s === 'PENDING') return { cls: 'bg-gray-100 text-gray-700 border-gray-200', label: 'PENDING' }
  if (s === 'CONTACTED') return { cls: 'bg-blue-100 text-blue-800 border-blue-200', label: 'CONTACTED' }
  if (s === 'CONFIRMED') return { cls: 'bg-green-100 text-green-800 border-green-300', label: 'CONFIRMED' }
  if (s === 'DECLINED') return { cls: 'bg-red-100 text-red-800 border-red-300', label: 'DECLINED' }
  if (s === 'RESCHEDULED') return { cls: 'bg-amber-100 text-amber-800 border-amber-300', label: 'RESCHEDULED' }
  if (s === 'ESCALATED') return { cls: 'bg-red-200 text-red-900 border-red-400', label: 'ESCALATED' }
  return { cls: 'bg-green-200 text-green-900 border-green-400', label: 'COMPLETED' }
}

interface ChatBubble {
  id: string
  from: 'coordinator' | 'donor'
  text: string
  ts: number
  stage?: StageKey
  intent?: IntentKey
  confidence?: number
  sentiment?: string
  latencyHrs?: number
  audioUrl?: string
  audioLoading?: boolean
}

interface FamilyMsg {
  id: string
  ts: number
  type: 'DONOR_CONTACTED' | 'CONFIRMED' | 'BACKUP_ACTIVATED' | 'ESCALATED' | 'DONATION_COMPLETE'
  text: string
}

interface AnalyticsSnapshot {
  groupHealth: number
  escalationActive: boolean
  confirmedCount: number
  declinedCount: number
  lastEngagementDelta: number
  lastLatencyScore: 'excellent' | 'good' | 'poor' | 'critical' | null
  strategyAdjustments: string[]
}

export default function WhatsAppSimulator({ sampleMode, setActiveAgent }: Props) {
  const [tab, setTab] = useState<TabKey>('cycle')

  const [donors, setDonors] = useState<Donor[]>(INITIAL_DONORS)
  const [activeDonorId, setActiveDonorId] = useState<string>('d1')
  const [conversations, setConversations] = useState<Record<string, ChatBubble[]>>({})
  const [completedStages, setCompletedStages] = useState<Record<string, Set<StageKey>>>({})
  const [lastReminderTs, setLastReminderTs] = useState<Record<string, number>>({})

  const [analytics, setAnalytics] = useState<AnalyticsSnapshot>({
    groupHealth: 78,
    escalationActive: false,
    confirmedCount: 0,
    declinedCount: 0,
    lastEngagementDelta: 0,
    lastLatencyScore: null,
    strategyAdjustments: [],
  })

  const [familyMessages, setFamilyMessages] = useState<FamilyMsg[]>([])
  const [coordinatorBriefing, setCoordinatorBriefing] = useState<string>('')

  const [stageLoading, setStageLoading] = useState<StageKey | null>(null)
  const [responseLoading, setResponseLoading] = useState<IntentKey | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [escalationBanner, setEscalationBanner] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const activeDonor = donors.find((d) => d.id === activeDonorId) || donors[0]
  const activeMessages = conversations[activeDonor.id] || []

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [activeMessages, stageLoading, responseLoading])

  const updateDonor = (id: string, patch: Partial<Donor>) => {
    setDonors((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  const pushBubble = (donorId: string, bubble: Omit<ChatBubble, 'id' | 'ts'>) => {
    const full: ChatBubble = {
      ...bubble,
      id: `${bubble.from[0]}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
    }
    setConversations((prev) => ({
      ...prev,
      [donorId]: [...(prev[donorId] || []), full],
    }))
    return full
  }

  const updateBubble = (donorId: string, bubbleId: string, patch: Partial<ChatBubble>) => {
    setConversations((prev) => ({
      ...prev,
      [donorId]: (prev[donorId] || []).map((b) => (b.id === bubbleId ? { ...b, ...patch } : b)),
    }))
  }

  const pushFamily = (type: FamilyMsg['type'], text: string) => {
    setFamilyMessages((prev) => [
      ...prev,
      { id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts: Date.now(), type, text },
    ])
  }

  const markStageDone = (donorId: string, stage: StageKey) => {
    setCompletedStages((prev) => {
      const set = new Set(prev[donorId] || [])
      set.add(stage)
      return { ...prev, [donorId]: set }
    })
  }

  const recomputeAnalytics = (
    patch: Partial<AnalyticsSnapshot>,
    healthDelta = 0,
  ) => {
    setAnalytics((prev) => {
      const next = { ...prev, ...patch }
      next.groupHealth = Math.max(0, Math.min(100, prev.groupHealth + healthDelta))
      return next
    })
  }

  const buildStagePrompt = (stage: StageKey, donor: Donor): string => {
    const ctx = {
      donor_name: donor.name,
      donor_language: donor.language,
      donor_streak: donor.streak,
      donor_total_donations: donor.totalDonations,
      donor_preferred_time: donor.preferredTime,
      donor_personal_note: donor.personalNote || '',
      patient_name: PATIENT.name,
      patient_blood: PATIENT.blood,
      hospital: PATIENT.hospital,
      hospital_address: PATIENT.hospital_address,
      hospital_phone: PATIENT.hospital_phone,
      stage,
    }

    const taskByStage: Record<StageKey, string> = {
      'T-14':
        'Write a warm, soft awareness reminder (under 80 words) that the patient\'s next transfusion is in about 2 weeks. No action required. Use donor first name and patient first name only.',
      'T-7':
        'Write a preparation nudge (under 80 words) asking the donor if they have any known conflicts for the upcoming donation. Soft check, not the final confirmation. Mention tentative date.',
      'T-4':
        'Write the FORMAL confirmation request (under 100 words). Personalised: mention patient name, hospital, specific date (this Thursday), and time window (9-11 AM). Ask for clear yes/no.',
      'T-1':
        'Write a friendly logistics recap (under 80 words). Hospital name, address, phone, time. Confirm they are still good to come tomorrow.',
      'D+0':
        'Write a short morning check-in (under 60 words). Just checking if they are on their way to the hospital. Patient family has been informed.',
      'D+5':
        'Write a microlearning message (under 80 words) — one educational fact about Thalassemia or blood safety. NOT about the next donation. Warm, personal.',
    }

    return JSON.stringify({
      task: taskByStage[stage],
      personality:
        'You are Priya, the RaktSetu blood bridge coordinator. Warm, compassionate, never pressuring. Under 120 words. Use donor first name.',
      context: ctx,
      output_format:
        'Return JSON with keys: message (string), intent (always "coordinator_reminder"), suggested_actions (array of 0-3 quick reply hints).',
    })
  }

  const sendStage = async (stage: StageKey) => {
    if (stageLoading) return
    if (activeDonor.status === 'COMPLETED') {
      setError('Donor has already completed the cycle.')
      return
    }
    setStageLoading(stage)
    setError(null)
    setActiveAgent(CHAT_AGENT_ID)

    try {
      const message = buildStagePrompt(stage, activeDonor)
      const res = await callAIAgent(message, CHAT_AGENT_ID)
      const raw = res?.response?.result ?? res?.response?.message ?? res?.response
      let parsed: any = raw
      const rawStr1: string | null =
        typeof raw === 'string'
          ? raw
          : raw && typeof raw === 'object' && typeof (raw as any).text === 'string'
          ? (raw as any).text
          : null
      if (rawStr1 !== null) {
        try {
          parsed = JSON.parse(rawStr1)
        } catch {
          parsed = { message: rawStr1 }
        }
      }
      const inner = parsed?.result ?? parsed
      const text =
        typeof inner?.message === 'string'
          ? inner.message
          : typeof inner === 'string'
          ? inner
          : `Hi ${activeDonor.name}, this is a ${stage} reminder for ${PATIENT.name}'s transfusion at ${PATIENT.hospital}.`

      pushBubble(activeDonor.id, { from: 'coordinator', text, stage })
      markStageDone(activeDonor.id, stage)
      setLastReminderTs((prev) => ({ ...prev, [activeDonor.id]: Date.now() }))

      if (activeDonor.status === 'PENDING') {
        updateDonor(activeDonor.id, { status: 'CONTACTED' })
        pushFamily(
          'DONOR_CONTACTED',
          `Donor ${activeDonor.name} has been contacted for ${PATIENT.name}'s ${stage} reminder.`,
        )
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to generate reminder.')
    } finally {
      setStageLoading(null)
      setActiveAgent(null)
    }
  }

  const classifyWithComprehend = async (text: string): Promise<{
    intent: string
    confidence: number
    sentiment: string
  } | null> => {
    try {
      const res = await fetch('/api/aws/comprehend', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const json = await res.json()
      if (json?.success) {
        return {
          intent: String(json?.data?.intent || 'AMBIGUOUS').toUpperCase(),
          confidence: Number(json?.data?.confidence ?? 0.82),
          sentiment: String(json?.data?.sentiment || ''),
        }
      }
    } catch {
      /* silent */
    }
    return null
  }

  const playAudio = async (donorId: string, bubbleId: string, text: string, language: string) => {
    updateBubble(donorId, bubbleId, { audioLoading: true })
    try {
      const res = await fetch('/api/aws/polly', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: language.toLowerCase() }),
      })
      const json = await res.json()
      if (json?.success && json?.data?.audioUrl) {
        updateBubble(donorId, bubbleId, { audioUrl: String(json.data.audioUrl), audioLoading: false })
        const audio = new Audio(json.data.audioUrl)
        audio.play().catch(() => {})
      } else {
        updateBubble(donorId, bubbleId, { audioLoading: false })
      }
    } catch {
      updateBubble(donorId, bubbleId, { audioLoading: false })
    }
  }

  const activateBackup = (declinedDonorId: string) => {
    const declined = donors.find((d) => d.id === declinedDonorId)
    if (!declined) return
    const candidates = donors
      .filter((d) => d.id !== declinedDonorId && d.status !== 'DECLINED' && d.status !== 'CONFIRMED')
      .sort((a, b) => a.rotationOrder - b.rotationOrder)
    const next = candidates[0]
    if (!next) {
      setEscalationBanner(
        `CRITICAL: ${PATIENT.name}'s transfusion has no remaining donors. All rotation exhausted.`,
      )
      pushFamily(
        'ESCALATED',
        `Critical escalation: no donors available for ${PATIENT.name}. Coordinator alerted.`,
      )
      recomputeAnalytics({ escalationActive: true }, -15)
      return
    }
    setActiveDonorId(next.id)
    pushFamily(
      'BACKUP_ACTIVATED',
      `Backup donor ${next.name} is being contacted for ${PATIENT.name}.`,
    )
    pushBubble(next.id, {
      from: 'coordinator',
      text:
        `Hi ${next.name}, this is the RaktSetu coordinator. ${PATIENT.name} needs a B+ donor for her transfusion this Thursday at ${PATIENT.hospital}. ` +
        `Are you available between 9-11 AM? Thank you for being part of her Blood Bridge.`,
      stage: 'T-4',
    })
    updateDonor(next.id, { status: 'CONTACTED' })
  }

  const handleSimulatedResponse = async (intent: IntentKey) => {
    if (responseLoading) return
    if (intent === 'NO_RESPONSE') {
      setResponseLoading('NO_RESPONSE')
      const lastTs = lastReminderTs[activeDonor.id] || Date.now()
      const fakeLatency = 24
      pushBubble(activeDonor.id, {
        from: 'donor',
        text: '(no response after 24 hours)',
        intent: 'NO_RESPONSE',
        confidence: 1,
        sentiment: 'NEUTRAL',
        latencyHrs: fakeLatency,
      })
      pushBubble(activeDonor.id, {
        from: 'coordinator',
        text: `Hi ${activeDonor.name}, just checking in — can you make it on Thursday for ${PATIENT.name}? We will arrange an alternative if not.`,
      })
      updateDonor(activeDonor.id, { riskScore: Math.min(100, activeDonor.riskScore + 12) })
      recomputeAnalytics(
        {
          strategyAdjustments: [
            ...analytics.strategyAdjustments,
            `${activeDonor.name}: shifted contact preference after no-response`,
          ],
          lastLatencyScore: 'critical',
          lastEngagementDelta: -3,
        },
        -4,
      )
      void lastTs
      setTimeout(() => activateBackup(activeDonor.id), 600)
      setResponseLoading(null)
      return
    }

    const samples = RESPONSE_TEMPLATES[intent]
    const sample = samples[Math.floor(Math.random() * samples.length)] || 'OK'
    setResponseLoading(intent)
    setError(null)

    const lastTs = lastReminderTs[activeDonor.id] || Date.now()
    const latencyHrs = Math.max(0.2, (Date.now() - lastTs) / (1000 * 60 * 60))
    const latencyScore: AnalyticsSnapshot['lastLatencyScore'] =
      latencyHrs < 2 ? 'excellent' : latencyHrs < 12 ? 'good' : latencyHrs < 24 ? 'poor' : 'critical'

    const donorBubble = pushBubble(activeDonor.id, {
      from: 'donor',
      text: sample,
      latencyHrs,
    })

    const classified = await classifyWithComprehend(sample)
    const finalIntent = (classified?.intent as IntentKey) || intent
    updateBubble(activeDonor.id, donorBubble.id, {
      intent: finalIntent,
      confidence: classified?.confidence ?? 0.85,
      sentiment: classified?.sentiment || '',
    })

    let engagementDelta = 0
    let healthDelta = 0

    if (intent === 'CONFIRM') {
      updateDonor(activeDonor.id, {
        status: 'CONFIRMED',
        riskScore: Math.max(0, activeDonor.riskScore - 4),
      })
      pushBubble(activeDonor.id, {
        from: 'coordinator',
        text:
          `Wonderful, ${activeDonor.name}. ${PATIENT.name}'s family will be so relieved.\n\n` +
          `Hospital: ${PATIENT.hospital}\nAddress: ${PATIENT.hospital_address}\nPhone: ${PATIENT.hospital_phone}\nTime window: 9-11 AM\n\n` +
          `I will check in tomorrow morning. Thank you for being her Blood Warrior.`,
      })
      pushFamily(
        'CONFIRMED',
        `Great news — ${activeDonor.name} is confirmed for ${PATIENT.name}'s transfusion on Thursday at ${PATIENT.hospital}.`,
      )
      engagementDelta = 3
      healthDelta = 8
      recomputeAnalytics(
        {
          confirmedCount: analytics.confirmedCount + 1,
          escalationActive: false,
          lastEngagementDelta: engagementDelta,
          lastLatencyScore: latencyScore,
        },
        healthDelta,
      )
    } else if (intent === 'DECLINE') {
      updateDonor(activeDonor.id, {
        status: 'DECLINED',
        riskScore: Math.min(100, activeDonor.riskScore + 8),
      })
      pushBubble(activeDonor.id, {
        from: 'coordinator',
        text: `No worries ${activeDonor.name}, we completely understand. Rest well. Reaching out to a backup donor now.`,
      })
      engagementDelta = -2
      healthDelta = -6
      recomputeAnalytics(
        {
          declinedCount: analytics.declinedCount + 1,
          lastEngagementDelta: engagementDelta,
          lastLatencyScore: latencyScore,
        },
        healthDelta,
      )
      setTimeout(() => activateBackup(activeDonor.id), 500)
    } else if (intent === 'RESCHEDULE') {
      updateDonor(activeDonor.id, { status: 'RESCHEDULED' })
      pushBubble(activeDonor.id, {
        from: 'coordinator',
        text: `Sure ${activeDonor.name}. Would Wednesday 11th or Friday 13th work? The hospital can accommodate either date for ${PATIENT.name}.`,
      })
      engagementDelta = 1
      healthDelta = 2
      recomputeAnalytics(
        { lastEngagementDelta: engagementDelta, lastLatencyScore: latencyScore },
        healthDelta,
      )
    } else if (intent === 'QUESTION') {
      pushBubble(activeDonor.id, {
        from: 'coordinator',
        text:
          `Good question, ${activeDonor.name}. The blood bank at ${PATIENT.hospital} is open 9 AM to 12 PM. ` +
          `No fasting required. The whole process takes 30-40 minutes. ` +
          `Just show this message at the counter. Does that help — are you able to come on Thursday?`,
      })
      engagementDelta = 2
      healthDelta = 1
      recomputeAnalytics(
        { lastEngagementDelta: engagementDelta, lastLatencyScore: latencyScore },
        healthDelta,
      )
    } else {
      pushBubble(activeDonor.id, {
        from: 'coordinator',
        text: `Just to confirm — are you available this Thursday, yes or no? We need to arrange an alternative quickly if not.`,
      })
      engagementDelta = 0
      healthDelta = -1
      recomputeAnalytics(
        { lastEngagementDelta: engagementDelta, lastLatencyScore: latencyScore },
        healthDelta,
      )
    }

    setResponseLoading(null)
  }

  const markDonationComplete = () => {
    if (activeDonor.status !== 'CONFIRMED') return
    updateDonor(activeDonor.id, {
      status: 'COMPLETED',
      totalDonations: activeDonor.totalDonations + 1,
      streak: activeDonor.streak + 1,
    })
    pushBubble(activeDonor.id, {
      from: 'coordinator',
      text:
        `Thank you ${activeDonor.name}! You just made ${PATIENT.name}'s ${activeDonor.totalDonations + 1}th transfusion possible. ` +
        `That is ${activeDonor.totalDonations + 1} reasons her family is grateful for you. You are truly her Blood Warrior.`,
    })
    if ((activeDonor.streak + 1) % 10 === 0) {
      pushBubble(activeDonor.id, {
        from: 'coordinator',
        text: `Bonus — you have earned your Decade Warrior badge for hitting a streak milestone.`,
      })
    }
    pushFamily(
      'DONATION_COMPLETE',
      `Today's transfusion has been arranged. Please reach ${PATIENT.hospital} by 9:30 AM.`,
    )
    recomputeAnalytics({}, 6)
  }

  const resetCycle = () => {
    setDonors(INITIAL_DONORS)
    setConversations({})
    setCompletedStages({})
    setFamilyMessages([])
    setLastReminderTs({})
    setError(null)
    setEscalationBanner(null)
    setActiveDonorId('d1')
    setAnalytics({
      groupHealth: 78,
      escalationActive: false,
      confirmedCount: 0,
      declinedCount: 0,
      lastEngagementDelta: 0,
      lastLatencyScore: null,
      strategyAdjustments: [],
    })
  }

  const generateBriefing = async () => {
    if (briefingLoading) return
    setBriefingLoading(true)
    setError(null)
    setActiveAgent(CHAT_AGENT_ID)
    try {
      const confirmedNames = donors.filter((d) => d.status === 'CONFIRMED' || d.status === 'COMPLETED').map((d) => d.name)
      const declinedNames = donors.filter((d) => d.status === 'DECLINED').map((d) => d.name)
      const pendingCount = donors.filter((d) => d.status === 'PENDING' || d.status === 'CONTACTED').length
      const ctx = {
        coordinator_name: 'Anita',
        date: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
        critical_count: analytics.escalationActive ? 1 : 0,
        at_risk_count: donors.filter((d) => d.riskScore >= 30 && d.status !== 'CONFIRMED').length,
        confirmed_today: confirmedNames,
        declined_today: declinedNames,
        pending_confirmations: pendingCount,
        next_patient: PATIENT.name,
        next_hospital: PATIENT.hospital,
        next_days: 4,
        group_health_score: analytics.groupHealth,
        strategy_adjustments: analytics.strategyAdjustments,
      }
      const payload = JSON.stringify({
        task: 'Generate the RaktSetu daily morning briefing for the human coordinator. Use the exact structure provided. Keep it under 200 words.',
        context: ctx,
        structure: `"Good morning [name] - RaktSetu Daily Briefing - [date]\nCritical: [N] bridges - [patient names]\nAt Risk: [N] bridges\nConfirmed today: [N] donors - [names]\n[N] messages awaiting your approval\nNext transfusion in [X] days: [patient] at [hospital]\nSystem updates: [strategy adjustments summary]\nReply APPROVE ALL or open dashboard."`,
        output_format: 'Return JSON with key "briefing" (string).',
      })
      const res = await callAIAgent(payload, CHAT_AGENT_ID)
      const raw = res?.response?.result ?? res?.response?.message ?? res?.response
      let parsed: any = raw
      const rawStr2: string | null =
        typeof raw === 'string'
          ? raw
          : raw && typeof raw === 'object' && typeof (raw as any).text === 'string'
          ? (raw as any).text
          : null
      if (rawStr2 !== null) {
        try {
          parsed = JSON.parse(rawStr2)
        } catch {
          parsed = { briefing: rawStr2 }
        }
      }
      const inner = parsed?.result ?? parsed
      const text = typeof inner?.briefing === 'string' ? inner.briefing : typeof inner === 'string' ? inner : JSON.stringify(inner)
      setCoordinatorBriefing(text)
    } catch (e: any) {
      setError(e?.message || 'Failed to generate briefing.')
    } finally {
      setBriefingLoading(false)
      setActiveAgent(null)
    }
  }

  const headerHealthBadge = analytics.escalationActive
    ? 'bg-red-200 text-red-900 border-red-400'
    : analytics.groupHealth >= 70
    ? 'bg-green-100 text-green-800 border-green-300'
    : analytics.groupHealth >= 40
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : 'bg-red-100 text-red-800 border-red-300'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md shrink-0">
            <Users className="w-5 h-5 text-[hsl(40,50%,98%)]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[hsl(20,25%,12%)]">Blood Bridge Simulator</h2>
            <p className="text-sm text-[hsl(20,15%,40%)] mt-0.5">
              Walk through one full transfusion cycle: 8-donor rotation, AI reminders, intent classification, backup
              activation, coordinator briefing, and family channel.
            </p>
          </div>
        </div>
        <button
          onClick={resetCycle}
          className="text-xs px-3 py-2 rounded-[10px] bg-[hsl(40,50%,98%)] border border-[hsl(30,25%,82%)] text-[hsl(20,25%,12%)] hover:bg-[hsl(40,40%,93%)] flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset cycle
        </button>
      </div>

      <Card className={`${CARD} p-4`}>
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center border-2 border-red-300">
              <Stethoscope className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[hsl(20,25%,12%)]">
                Patient: <span className="text-red-700">{PATIENT.name}</span>
                <span className="ml-2 text-xs text-[hsl(20,15%,40%)]">age {PATIENT.age}</span>
              </p>
              <p className="text-[11px] text-[hsl(20,15%,40%)] flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="flex items-center gap-1">
                  <Droplet className="w-3 h-3 text-red-600" /> {PATIENT.blood}
                </span>
                <span>{PATIENT.hospital}</span>
                <span>Next transfusion: Thursday, 9-11 AM</span>
                <span>Caregiver: {PATIENT.caregiver}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full border text-[10px] uppercase font-semibold ${headerHealthBadge}`}>
              Group Health: {analytics.groupHealth}
            </span>
            <span className="px-2.5 py-1 rounded-full border border-green-300 bg-green-50 text-green-800 text-[10px] uppercase font-semibold">
              Confirmed: {analytics.confirmedCount}
            </span>
            <span className="px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-red-700 text-[10px] uppercase font-semibold">
              Declined: {analytics.declinedCount}
            </span>
          </div>
        </div>
      </Card>

      {escalationBanner && (
        <div className="p-3 rounded-[10px] bg-red-100 border-2 border-red-400 text-red-900 flex items-start gap-2">
          <Siren className="w-5 h-5 mt-0.5 shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-semibold">CRITICAL ESCALATION</p>
            <p className="text-xs mt-0.5">{escalationBanner}</p>
          </div>
        </div>
      )}

      <div className={`${CARD} p-2 inline-flex flex-wrap gap-1`}>
        {[
          { key: 'cycle', label: 'Donor Cycle', icon: MessageSquare },
          { key: 'briefing', label: 'Coordinator Briefing', icon: Mail },
          { key: 'family', label: 'Family Channel', icon: Heart },
        ].map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key as TabKey)}
              className={`px-4 py-2 rounded-[10px] text-sm font-medium flex items-center gap-2 transition-all ${
                active
                  ? 'bg-red-600 text-[hsl(40,50%,98%)] shadow-sm'
                  : 'text-[hsl(20,25%,12%)] hover:bg-[hsl(40,40%,93%)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'cycle' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-3 space-y-3">
            <DonorRoster
              donors={donors}
              activeId={activeDonor.id}
              onSelect={setActiveDonorId}
              completedStages={completedStages}
            />
          </div>

          <div className="xl:col-span-6 space-y-3">
            <Card className={`${CARD} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[hsl(20,15%,40%)] font-semibold">
                    Active donor
                  </p>
                  <p className="text-base font-semibold text-[hsl(20,25%,12%)] flex items-center gap-2">
                    {activeDonor.name}
                    <span className="text-[10px] font-normal text-[hsl(20,15%,40%)]">
                      {activeDonor.bloodType} · {activeDonor.language} · streak {activeDonor.streak}
                    </span>
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full border text-[10px] uppercase font-semibold ${
                    donorStatusChip(activeDonor.status).cls
                  }`}
                >
                  {donorStatusChip(activeDonor.status).label}
                </span>
              </div>

              <p className="text-[10px] uppercase tracking-wider text-[hsl(20,15%,40%)] font-semibold mb-1.5">
                Timeline — send AI-generated reminder for each stage
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-3">
                {STAGES.map((s) => {
                  const Icon = s.icon
                  const done = completedStages[activeDonor.id]?.has(s.key)
                  const isLoading = stageLoading === s.key
                  return (
                    <button
                      key={s.key}
                      onClick={() => sendStage(s.key)}
                      disabled={stageLoading !== null || activeDonor.status === 'COMPLETED' || activeDonor.status === 'DECLINED'}
                      title={s.sub}
                      className={`p-2 rounded-[10px] border text-[10px] font-medium transition-all disabled:opacity-50 ${
                        done
                          ? 'bg-green-50 border-green-300 text-green-800'
                          : 'bg-[hsl(40,50%,98%)] border-[hsl(30,25%,82%)] text-[hsl(20,25%,12%)] hover:bg-[hsl(40,40%,93%)]'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-1">
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                        ) : done ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Icon className="w-3.5 h-3.5 text-red-700" />
                        )}
                      </div>
                      <div className="font-semibold">{s.label}</div>
                      <div className="text-[9px] text-[hsl(20,15%,40%)] truncate">{s.sub}</div>
                    </button>
                  )
                })}
              </div>
            </Card>

            <Card className={`${CARD} overflow-hidden`}>
              <div className="bg-gradient-to-r from-red-700 to-red-800 px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(40,50%,98%)]/20 flex items-center justify-center text-[hsl(40,50%,98%)] font-bold">
                  {activeDonor.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[hsl(40,50%,98%)]">
                    {activeDonor.name} · {activeDonor.language}
                  </p>
                  <p className="text-[11px] text-red-100 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                    Coordinator: Priya (RaktSetu)
                  </p>
                </div>
                <MessageSquare className="w-5 h-5 text-[hsl(40,50%,98%)]/80" />
              </div>

              <div
                ref={scrollRef}
                className="bg-[hsl(40,40%,93%)] h-[420px] overflow-y-auto p-4 space-y-3"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 20% 30%, hsla(0,40%,80%,0.18) 0px, transparent 100px), radial-gradient(circle at 80% 70%, hsla(35,55%,75%,0.18) 0px, transparent 120px)',
                }}
              >
                {activeMessages.length === 0 && (
                  <div className="text-center text-[hsl(20,15%,40%)] text-sm py-12">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    Pick a stage above (e.g. T-4) to send the first AI-generated reminder to {activeDonor.name}.
                  </div>
                )}

                {activeMessages.map((m) => (
                  <div key={m.id} className={`flex ${m.from === 'donor' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm ${
                        m.from === 'donor'
                          ? 'bg-[hsl(10,75%,90%)] text-[hsl(0,40%,20%)] rounded-tr-sm'
                          : 'bg-[hsl(40,50%,98%)] text-[hsl(20,25%,12%)] rounded-tl-sm border border-[hsl(30,30%,85%)]'
                      }`}
                    >
                      {m.stage && (
                        <div className="text-[9px] uppercase tracking-wider text-red-700 font-semibold mb-1">
                          {m.stage} reminder
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                      {m.intent && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${intentChip(
                              m.intent,
                            )}`}
                          >
                            {m.intent}
                          </span>
                          {typeof m.confidence === 'number' && (
                            <span className="text-[9px] text-[hsl(20,15%,40%)]">
                              conf {(m.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                          {m.sentiment && (
                            <span className="text-[9px] text-[hsl(20,15%,40%)]">· {m.sentiment}</span>
                          )}
                          {typeof m.latencyHrs === 'number' && (
                            <span className="text-[9px] text-[hsl(20,15%,40%)]">
                              · {m.latencyHrs < 1 ? `${(m.latencyHrs * 60).toFixed(0)}m` : `${m.latencyHrs.toFixed(1)}h`}
                            </span>
                          )}
                        </div>
                      )}
                      {m.from === 'coordinator' && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <button
                            onClick={() => playAudio(activeDonor.id, m.id, m.text, activeDonor.language)}
                            disabled={m.audioLoading}
                            className="text-[9px] px-2 py-0.5 rounded-full bg-[hsl(40,40%,93%)] border border-[hsl(30,25%,82%)] text-[hsl(20,25%,12%)] flex items-center gap-1 disabled:opacity-50"
                          >
                            {m.audioLoading ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <Volume2 className="w-2.5 h-2.5" />
                            )}
                            Listen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {(stageLoading || responseLoading) && (
                  <div className="flex justify-start">
                    <div className="bg-[hsl(40,50%,98%)] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-[hsl(30,30%,85%)]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                        <span
                          className="w-2 h-2 rounded-full bg-red-400 animate-pulse"
                          style={{ animationDelay: '0.15s' }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-red-400 animate-pulse"
                          style={{ animationDelay: '0.3s' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700">{error}</div>
              )}

              <div className="bg-[hsl(40,50%,98%)] px-3 py-3 border-t border-[hsl(30,30%,85%)] space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-[hsl(20,15%,40%)] font-semibold">
                  Simulate donor response
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(['CONFIRM', 'DECLINE', 'RESCHEDULE', 'QUESTION', 'AMBIGUOUS', 'NO_RESPONSE'] as IntentKey[]).map(
                    (intent) => {
                      const disabled =
                        responseLoading !== null ||
                        activeMessages.length === 0 ||
                        activeDonor.status === 'COMPLETED' ||
                        activeDonor.status === 'DECLINED'
                      return (
                        <button
                          key={intent}
                          onClick={() => handleSimulatedResponse(intent)}
                          disabled={disabled}
                          className={`text-[11px] px-2.5 py-1.5 rounded-full border font-medium flex items-center gap-1 disabled:opacity-40 ${intentChip(
                            intent,
                          )}`}
                        >
                          {responseLoading === intent ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          {intent}
                        </button>
                      )
                    },
                  )}
                </div>
                {activeDonor.status === 'CONFIRMED' && (
                  <button
                    onClick={markDonationComplete}
                    className="w-full mt-2 text-xs bg-gradient-to-r from-green-600 to-green-700 text-white rounded-[10px] px-3 py-2 font-medium flex items-center justify-center gap-1.5 shadow"
                  >
                    <Award className="w-3.5 h-3.5" />
                    Mark donation complete (sends thank-you + certificate)
                  </button>
                )}
              </div>
            </Card>
          </div>

          <div className="xl:col-span-3 space-y-3">
            <AnalyticsPanel analytics={analytics} activeDonor={activeDonor} />
          </div>
        </div>
      )}

      {tab === 'briefing' && (
        <Card className={`${CARD} p-5 space-y-4`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)] flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-700" />
                Coordinator morning briefing
              </h3>
              <p className="text-[11px] text-[hsl(20,15%,40%)]">
                AI-drafted 8 AM summary for the human coordinator. Pulls live data from this simulation.
              </p>
            </div>
            <button
              onClick={generateBriefing}
              disabled={briefingLoading}
              className="bg-gradient-to-r from-red-600 to-red-700 text-[hsl(40,50%,98%)] rounded-[10px] px-4 py-2 text-sm font-medium shadow-md flex items-center gap-2 disabled:opacity-60"
            >
              {briefingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {briefingLoading ? 'Drafting...' : 'Generate briefing'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <BriefStat
              label="Critical"
              value={analytics.escalationActive ? 1 : 0}
              tone="red"
              icon={<Siren className="w-3.5 h-3.5" />}
            />
            <BriefStat
              label="At risk"
              value={donors.filter((d) => d.riskScore >= 30 && d.status !== 'CONFIRMED').length}
              tone="amber"
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
            />
            <BriefStat
              label="Confirmed today"
              value={analytics.confirmedCount}
              tone="green"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            />
            <BriefStat
              label="Pending"
              value={donors.filter((d) => d.status === 'PENDING' || d.status === 'CONTACTED').length}
              tone="gray"
              icon={<Clock className="w-3.5 h-3.5" />}
            />
          </div>

          <div className="bg-[hsl(40,40%,93%)] border border-[hsl(30,25%,82%)] rounded-[10px] p-4 min-h-[200px] text-sm text-[hsl(20,25%,12%)] whitespace-pre-wrap">
            {coordinatorBriefing || (
              <span className="text-[hsl(20,15%,40%)] text-xs">
                Briefing has not been generated yet. Press Generate briefing to ask the agent.
              </span>
            )}
          </div>

          {analytics.strategyAdjustments.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[hsl(20,15%,40%)] font-semibold mb-1.5">
                Auto-applied strategy adjustments
              </p>
              <ul className="text-xs text-[hsl(20,25%,12%)] space-y-1">
                {analytics.strategyAdjustments.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <ArrowRight className="w-3 h-3 mt-0.5 text-red-700 shrink-0" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {tab === 'family' && (
        <Card className={`${CARD} p-5 space-y-3`}>
          <div className="flex items-start gap-2">
            <Heart className="w-4 h-4 text-red-700 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)]">Patient family channel</h3>
              <p className="text-[11px] text-[hsl(20,15%,40%)]">
                Messages auto-sent to {PATIENT.caregiver} ({PATIENT.caregiver_phone}) throughout the cycle.
              </p>
            </div>
          </div>

          <div className="bg-[hsl(40,40%,93%)] border border-[hsl(30,25%,82%)] rounded-[10px] min-h-[200px] p-3 space-y-2">
            {familyMessages.length === 0 && (
              <p className="text-xs text-[hsl(20,15%,40%)] text-center py-8">
                No family messages yet. Send a stage reminder or simulate a response in the Donor Cycle tab to trigger
                family notifications.
              </p>
            )}
            {familyMessages.map((m) => (
              <FamilyBubble key={m.id} msg={m} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

/* ============ DONOR ROSTER ============ */

function DonorRoster({
  donors,
  activeId,
  onSelect,
  completedStages,
}: {
  donors: Donor[]
  activeId: string
  onSelect: (id: string) => void
  completedStages: Record<string, Set<StageKey>>
}) {
  const primary = donors.filter((d) => !d.isBackup)
  const backups = donors.filter((d) => d.isBackup)

  return (
    <Card className={`${CARD} p-4 space-y-3`}>
      <div className="flex items-start gap-2">
        <Users className="w-4 h-4 text-red-700 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)]">Donor rotation</h3>
          <p className="text-[11px] text-[hsl(20,15%,40%)]">
            8 donors. 5 primary, 3 backup. Tap to switch active conversation.
          </p>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-[hsl(20,15%,40%)] font-semibold mb-1.5">
          Primary rotation
        </p>
        <div className="space-y-1.5">
          {primary.map((d) => (
            <DonorRow
              key={d.id}
              donor={d}
              active={d.id === activeId}
              onSelect={() => onSelect(d.id)}
              stageCount={completedStages[d.id]?.size || 0}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-[hsl(20,15%,40%)] font-semibold mb-1.5">
          Backup pool
        </p>
        <div className="space-y-1.5">
          {backups.map((d) => (
            <DonorRow
              key={d.id}
              donor={d}
              active={d.id === activeId}
              onSelect={() => onSelect(d.id)}
              stageCount={completedStages[d.id]?.size || 0}
            />
          ))}
        </div>
      </div>
    </Card>
  )
}

function DonorRow({
  donor,
  active,
  onSelect,
  stageCount,
}: {
  donor: Donor
  active: boolean
  onSelect: () => void
  stageCount: number
}) {
  const chip = donorStatusChip(donor.status)
  const riskColor =
    donor.riskScore >= 60
      ? 'text-red-700'
      : donor.riskScore >= 30
      ? 'text-amber-700'
      : 'text-green-700'
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-2 rounded-[10px] border transition-all ${
        active
          ? 'bg-red-50 border-red-300'
          : 'bg-[hsl(40,50%,98%)] border-[hsl(30,25%,82%)] hover:bg-[hsl(40,40%,93%)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[hsl(20,25%,12%)] truncate">
            {donor.name}{' '}
            <span className="text-[10px] font-normal text-[hsl(20,15%,40%)]">
              · {donor.bloodType}
            </span>
          </p>
          <p className="text-[10px] text-[hsl(20,15%,40%)] truncate">
            {donor.language} · streak {donor.streak} · {donor.totalDonations} donations
          </p>
        </div>
        <span className={`px-1.5 py-0.5 rounded-full border text-[9px] uppercase font-semibold ${chip.cls} shrink-0`}>
          {chip.label}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[10px]">
        <span className={`font-semibold ${riskColor}`}>Risk {donor.riskScore}</span>
        <span className="text-[hsl(20,15%,40%)]">{stageCount}/6 stages</span>
      </div>
    </button>
  )
}

/* ============ ANALYTICS PANEL ============ */

function AnalyticsPanel({
  analytics,
  activeDonor,
}: {
  analytics: AnalyticsSnapshot
  activeDonor: Donor
}) {
  const latencyColor =
    analytics.lastLatencyScore === 'excellent'
      ? 'text-green-700'
      : analytics.lastLatencyScore === 'good'
      ? 'text-blue-700'
      : analytics.lastLatencyScore === 'poor'
      ? 'text-amber-700'
      : analytics.lastLatencyScore === 'critical'
      ? 'text-red-700'
      : 'text-gray-700'

  return (
    <>
      <Card className={`${CARD} p-4 space-y-3`}>
        <div className="flex items-start gap-2">
          <Activity className="w-4 h-4 text-red-700 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)]">Live analytics</h3>
            <p className="text-[11px] text-[hsl(20,15%,40%)]">Updates after every interaction.</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[11px] text-[hsl(20,25%,12%)] font-medium">Group health</span>
            <span className="text-[11px] font-bold text-red-700">{analytics.groupHealth}/100</span>
          </div>
          <div className="h-2 bg-[hsl(40,30%,90%)] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                analytics.groupHealth >= 70
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : analytics.groupHealth >= 40
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                  : 'bg-gradient-to-r from-red-500 to-red-700'
              }`}
              style={{ width: `${analytics.groupHealth}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[11px] text-[hsl(20,25%,12%)] font-medium">{activeDonor.name} dropout risk</span>
            <span className="text-[11px] font-bold text-red-700">{activeDonor.riskScore}/100</span>
          </div>
          <div className="h-2 bg-[hsl(40,30%,90%)] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                activeDonor.riskScore <= 30
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : activeDonor.riskScore <= 60
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                  : 'bg-gradient-to-r from-red-500 to-red-700'
              }`}
              style={{ width: `${activeDonor.riskScore}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Mini label="Last latency" value={analytics.lastLatencyScore ?? 'n/a'} valueClass={latencyColor} />
          <Mini
            label="Engagement Δ"
            value={analytics.lastEngagementDelta > 0 ? `+${analytics.lastEngagementDelta}` : String(analytics.lastEngagementDelta)}
            valueClass={
              analytics.lastEngagementDelta > 0
                ? 'text-green-700'
                : analytics.lastEngagementDelta < 0
                ? 'text-red-700'
                : 'text-gray-700'
            }
          />
        </div>
      </Card>

      <Card className={`${CARD} p-4 space-y-2`}>
        <div className="flex items-center gap-2">
          <PlayCircle className="w-4 h-4 text-red-700" />
          <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)]">Quick scenarios</h3>
        </div>
        <ScenarioRow
          title="Emergency broadcast"
          desc="Patient needs blood urgently — agent broadcasts to all 8 donors in parallel."
        />
        <ScenarioRow
          title="Streak preservation nudge"
          desc="When risk spikes on a high-streak donor, agent combines reminder with badge milestone hook."
        />
        <ScenarioRow
          title="Failure learning"
          desc="3 morning no-responses → preferred contact time auto-shifts to evening."
        />
      </Card>
    </>
  )
}

function Mini({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="p-2 rounded-[10px] bg-[hsl(40,40%,93%)] border border-[hsl(30,25%,82%)] text-center">
      <p className="text-[9px] uppercase tracking-wider text-[hsl(20,15%,40%)] font-semibold">{label}</p>
      <p className={`text-sm font-bold ${valueClass || 'text-[hsl(20,25%,12%)]'}`}>{value}</p>
    </div>
  )
}

function ScenarioRow({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-2 rounded-[10px] bg-[hsl(40,40%,93%)] border border-[hsl(30,25%,82%)]">
      <p className="text-[11px] font-semibold text-[hsl(20,25%,12%)]">{title}</p>
      <p className="text-[10px] text-[hsl(20,15%,40%)]">{desc}</p>
    </div>
  )
}

function BriefStat({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: 'red' | 'amber' | 'green' | 'gray'
  icon: React.ReactNode
}) {
  const tones: Record<typeof tone, string> = {
    red: 'bg-red-50 border-red-200 text-red-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    gray: 'bg-[hsl(40,40%,93%)] border-[hsl(30,25%,82%)] text-[hsl(20,25%,12%)]',
  }
  return (
    <div className={`p-3 rounded-[10px] border ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold">
        {icon}
        {label}
      </div>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  )
}

function FamilyBubble({ msg }: { msg: FamilyMsg }) {
  const iconByType: Record<FamilyMsg['type'], any> = {
    DONOR_CONTACTED: BellRing,
    CONFIRMED: CheckCircle2,
    BACKUP_ACTIVATED: RefreshCw,
    ESCALATED: Siren,
    DONATION_COMPLETE: Award,
  }
  const toneByType: Record<FamilyMsg['type'], string> = {
    DONOR_CONTACTED: 'border-blue-200 bg-blue-50 text-blue-800',
    CONFIRMED: 'border-green-200 bg-green-50 text-green-800',
    BACKUP_ACTIVATED: 'border-amber-200 bg-amber-50 text-amber-800',
    ESCALATED: 'border-red-300 bg-red-100 text-red-900',
    DONATION_COMPLETE: 'border-green-300 bg-green-100 text-green-900',
  }
  const Icon = iconByType[msg.type]
  return (
    <div className={`p-2.5 rounded-[10px] border ${toneByType[msg.type]} flex items-start gap-2`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold opacity-70">
          {msg.type.replace(/_/g, ' ')}
        </p>
        <p className="text-xs">{msg.text}</p>
      </div>
      <span className="text-[10px] opacity-60 shrink-0">
        {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}
