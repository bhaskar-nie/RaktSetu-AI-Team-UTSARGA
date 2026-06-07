'use client'

import React, { useMemo, useState } from 'react'
import {
  Siren,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Activity,
  Users,
  Brain,
  MessageSquare,
  Mail,
  RotateCcw,
  PlayCircle,
  XCircle,
} from 'lucide-react'
import { callAIAgent } from '@/lib/aiAgent'
import { formatBloodGroup, ALL_BLOOD_GROUPS } from '@/lib/bloodGroup'

interface EmergencyResponseProps {
  donors: any[]
  setActiveAgent: (id: string | null) => void
}

const INVENTORY_AGENT_ID = '6a2485186c86ec3584c733cc'
const DONOR_AGENT_ID = '6a2484c16c86ec3584c733c4'

const BLOOD_TYPES = [...ALL_BLOOD_GROUPS]

const CARD =
  'bg-[hsl(40,50%,98%)]/75 backdrop-blur-[16px] border border-[hsl(30,25%,82%)] rounded-[14px] shadow-md'
const SUBCARD = 'bg-[hsl(40,50%,98%)]/60 border border-[hsl(30,30%,85%)]/60 rounded-[10px]'
const INPUT =
  'w-full px-3 py-2 text-sm bg-[hsl(40,50%,98%)]/80 border border-[hsl(30,30%,82%)] rounded-[8px] outline-none focus:border-red-600 focus:ring-2 focus:ring-red-200 text-[hsl(20,25%,12%)] placeholder:text-[hsl(20,15%,40%)]/60'
const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-[10px] bg-gradient-to-r from-red-600 to-red-700 text-[hsl(40,50%,98%)] shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed'
const BTN_GHOST =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[8px] bg-[hsl(40,50%,98%)]/70 border border-[hsl(30,30%,82%)] text-[hsl(20,25%,12%)] hover:bg-[hsl(40,30%,90%)] transition-all'

type StepStatus = 'idle' | 'running' | 'done' | 'error'

interface PipelineStep {
  key: string
  title: string
  description: string
  icon: any
  status: StepStatus
  output: any
  error: string | null
}

function safeJsonParse(s: string): any {
  if (!s || typeof s !== 'string') return null
  let cleaned = s
    .replace(/^\s*```(?:json|JSON)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    /* try boundary */
  }
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    try {
      return JSON.parse(cleaned.slice(first, last + 1))
    } catch {
      /* fall through */
    }
  }
  return null
}

function parseAgentResponse(result: any): any {
  const raw = result?.response?.result ?? result?.response?.message ?? result?.response
  if (raw == null) return null
  if (typeof raw === 'string') {
    const parsed = safeJsonParse(raw)
    return parsed ?? { rawText: raw }
  }
  if (typeof raw === 'object') {
    // Unwrap { text: "..." } envelope that the server normalizer adds
    if (typeof raw.text === 'string') {
      const parsed = safeJsonParse(raw.text)
      if (parsed) return parsed?.result ?? parsed
      return { rawText: raw.text }
    }
    // If wrapped result.result
    if (raw?.result && typeof raw.result === 'object') return raw.result
    return raw
  }
  return { rawText: String(raw) }
}

function Banner({
  type,
  children,
}: {
  type: 'success' | 'error' | 'info'
  children: React.ReactNode
}) {
  const styles =
    type === 'success'
      ? 'bg-green-50 border-green-200 text-green-900'
      : type === 'error'
      ? 'bg-rose-50 border-rose-200 text-rose-900'
      : 'bg-amber-50 border-amber-200 text-amber-900'
  const Icon =
    type === 'success' ? CheckCircle2 : type === 'error' ? AlertCircle : Info
  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 rounded-[10px] border text-xs ${styles}`}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: StepStatus }) {
  if (status === 'running') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <Loader2 className="w-3 h-3 animate-spin" /> Running
      </span>
    )
  }
  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 border border-green-200">
        <CheckCircle2 className="w-3 h-3" /> Done
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        <XCircle className="w-3 h-3" /> Error
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[hsl(40,30%,90%)] text-[hsl(20,15%,40%)] border border-[hsl(30,25%,82%)]">
      Idle
    </span>
  )
}

function StepCard({
  number,
  step,
}: {
  number: number
  step: PipelineStep
}) {
  const Icon = step.icon
  const accent =
    step.status === 'done'
      ? 'border-l-green-500'
      : step.status === 'running'
      ? 'border-l-amber-500'
      : step.status === 'error'
      ? 'border-l-rose-500'
      : 'border-l-[hsl(30,25%,82%)]'

  return (
    <div className={`${CARD} border-l-4 ${accent} p-4`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-red-600 to-red-800 text-[hsl(40,50%,98%)] font-bold flex items-center justify-center shrink-0">
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="w-4 h-4 text-red-700 shrink-0" />
              <h3 className="text-sm font-semibold text-[hsl(20,25%,12%)] truncate">
                {step.title}
              </h3>
            </div>
            <StatusBadge status={step.status} />
          </div>
          <p className="text-[11px] text-[hsl(20,15%,40%)] mb-2">
            {step.description}
          </p>

          {step.status === 'error' && step.error && (
            <Banner type="error">{step.error}</Banner>
          )}

          {step.status === 'done' && step.output != null && (
            <div className={`${SUBCARD} p-3 mt-2`}>
              <StepOutputPreview stepKey={step.key} output={step.output} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StepOutputPreview({
  stepKey,
  output,
}: {
  stepKey: string
  output: any
}) {
  if (stepKey === 'inventory') {
    const severity = String(output?.shortage_severity || 'unknown').toLowerCase()
    const sevClass =
      severity === 'critical'
        ? 'bg-rose-100 text-rose-800 border-rose-200'
        : severity === 'high'
        ? 'bg-orange-100 text-orange-800 border-orange-200'
        : severity === 'medium'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : severity === 'low'
        ? 'bg-green-100 text-green-800 border-green-200'
        : 'bg-slate-100 text-slate-800 border-slate-200'
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              output?.shortage_confirmed
                ? 'bg-rose-100 text-rose-800 border-rose-200'
                : 'bg-green-100 text-green-800 border-green-200'
            }`}
          >
            {output?.shortage_confirmed ? 'Shortage confirmed' : 'No shortage'}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sevClass}`}
          >
            Severity: {severity}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[hsl(40,30%,90%)] border border-[hsl(30,25%,82%)] text-[hsl(20,25%,12%)]">
            Current units: {String(output?.current_units ?? '—')}
          </span>
        </div>
        {output?.recommendation && (
          <p className="text-xs text-[hsl(20,25%,12%)]/85 whitespace-pre-wrap">
            {String(output.recommendation)}
          </p>
        )}
        {output?.rawText && !output?.shortage_confirmed && (
          <p className="text-[11px] text-[hsl(20,15%,40%)] whitespace-pre-wrap">
            {String(output.rawText)}
          </p>
        )}
      </div>
    )
  }

  if (stepKey === 'donors') {
    const matched = Array.isArray(output?.matched_donors) ? output.matched_donors : []
    if (matched.length === 0 && output?.rawText) {
      return (
        <p className="text-[11px] text-[hsl(20,15%,40%)] whitespace-pre-wrap">
          {String(output.rawText)}
        </p>
      )
    }
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-[hsl(20,15%,40%)]">
          {matched.length} donor{matched.length === 1 ? '' : 's'} matched
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {matched.slice(0, 8).map((d: any, i: number) => (
            <div
              key={i}
              className="px-3 py-2 rounded-[8px] bg-[hsl(40,50%,98%)]/80 border border-[hsl(30,30%,85%)]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[hsl(20,25%,12%)] truncate">
                  {d?.name || 'Unknown donor'}
                </p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 font-semibold">
                  {formatBloodGroup(d?.blood_type) || '—'}
                </span>
              </div>
              <p className="text-[10px] text-[hsl(20,15%,40%)] mt-0.5 truncate">
                {d?.phone || 'no phone'}
                {d?.distance_km ? ` • ${d.distance_km} km` : ''}
                {typeof d?.donations_till_date === 'number'
                  ? ` • ${d.donations_till_date} donations`
                  : ''}
              </p>
              {d?.match_reason && (
                <p className="text-[10px] text-[hsl(20,25%,12%)]/70 mt-1 line-clamp-2">
                  {String(d.match_reason)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (stepKey === 'bedrock') {
    const actions = Array.isArray(output?.recommended_actions)
      ? output.recommended_actions
      : []
    return (
      <div className="space-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[hsl(20,25%,12%)]/70 font-semibold mb-1">
            SMS body
          </p>
          <div className="px-3 py-2 rounded-[8px] bg-[hsl(40,30%,90%)] border border-[hsl(30,25%,82%)] text-xs text-[hsl(20,25%,12%)] whitespace-pre-wrap">
            {output?.patient_summary || '—'}
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[hsl(20,25%,12%)]/70 font-semibold mb-1">
            Email subject
          </p>
          <p className="text-xs text-[hsl(20,25%,12%)]">
            {output?.blood_type_relevance || '—'}
          </p>
        </div>
        {actions.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[hsl(20,25%,12%)]/70 font-semibold mb-1">
              Email bullets
            </p>
            <ul className="space-y-1">
              {actions.map((a: any, i: number) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 text-red-600 shrink-0" />
                  <span>{String(a)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {output?.urgency_level && (
          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Urgency: {String(output.urgency_level)}
          </span>
        )}
      </div>
    )
  }

  if (stepKey === 'sns') {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-[hsl(20,25%,12%)]">
          Topic message published.
        </p>
        <p className="text-[11px] text-[hsl(20,15%,40%)] break-all">
          Message ID: {output?.messageId || '—'}
        </p>
      </div>
    )
  }

  if (stepKey === 'ses') {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-[hsl(20,25%,12%)]">
          Email delivered to hospital coordinator.
        </p>
        <p className="text-[11px] text-[hsl(20,15%,40%)] break-all">
          Message ID: {output?.messageId || '—'}
        </p>
        {output?.to && (
          <p className="text-[11px] text-[hsl(20,15%,40%)] truncate">
            To: {output.to}
          </p>
        )}
      </div>
    )
  }

  return (
    <pre className="text-[11px] text-[hsl(20,25%,12%)] whitespace-pre-wrap break-words">
      {JSON.stringify(output, null, 2)}
    </pre>
  )
}

function buildEmailHtml(opts: {
  subject: string
  actions: string[]
  matchedDonors: any[]
  bloodType: string
  unitsNeeded: number
  severity: string
}) {
  const escape = (s: string) =>
    String(s ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const bullets =
    Array.isArray(opts.actions) && opts.actions.length > 0
      ? `<ul style="padding-left:18px;margin:8px 0;color:#1a1a1a">${opts.actions
          .map((a) => `<li style="margin:4px 0">${escape(a)}</li>`)
          .join('')}</ul>`
      : ''
  const rows =
    Array.isArray(opts.matchedDonors) && opts.matchedDonors.length > 0
      ? opts.matchedDonors
          .slice(0, 10)
          .map(
            (d: any) =>
              `<tr>
                 <td style="padding:6px 8px;border:1px solid #e5d5c4">${escape(d?.name || '—')}</td>
                 <td style="padding:6px 8px;border:1px solid #e5d5c4">${escape(formatBloodGroup(d?.blood_type) || '—')}</td>
                 <td style="padding:6px 8px;border:1px solid #e5d5c4">${escape(d?.phone || '—')}</td>
                 <td style="padding:6px 8px;border:1px solid #e5d5c4">${escape(d?.match_reason || '')}</td>
               </tr>`
          )
          .join('')
      : `<tr><td colspan="4" style="padding:8px;border:1px solid #e5d5c4;color:#666">No matched donors returned.</td></tr>`
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5;max-width:640px">
    <div style="padding:14px 18px;background:linear-gradient(135deg,#b91c1c,#7f1d1d);color:#fff;border-radius:10px 10px 0 0">
      <h2 style="margin:0;font-size:18px">RaktSetu Emergency Response</h2>
      <p style="margin:4px 0 0;font-size:12px;opacity:.85">${escape(opts.subject)}</p>
    </div>
    <div style="padding:16px 18px;border:1px solid #e5d5c4;border-top:0;border-radius:0 0 10px 10px;background:#fffaf2">
      <p style="margin:0 0 8px"><strong>Blood type:</strong> ${escape(opts.bloodType)} &nbsp; <strong>Units needed:</strong> ${opts.unitsNeeded} &nbsp; <strong>Severity:</strong> ${escape(opts.severity)}</p>
      <p style="margin:0 0 6px"><strong>Recommended actions:</strong></p>
      ${bullets}
      <p style="margin:14px 0 6px"><strong>Matched donors:</strong></p>
      <table style="border-collapse:collapse;width:100%;font-size:12px">
        <thead>
          <tr style="background:#f5e6d3">
            <th style="padding:6px 8px;border:1px solid #e5d5c4;text-align:left">Name</th>
            <th style="padding:6px 8px;border:1px solid #e5d5c4;text-align:left">Type</th>
            <th style="padding:6px 8px;border:1px solid #e5d5c4;text-align:left">Phone</th>
            <th style="padding:6px 8px;border:1px solid #e5d5c4;text-align:left">Reason</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:14px 0 0;font-size:11px;color:#666">This message was generated by RaktSetu AI Emergency Response pipeline.</p>
    </div>
  </div>`
}

export default function EmergencyResponse({
  donors,
  setActiveAgent,
}: EmergencyResponseProps) {
  const [bloodType, setBloodType] = useState('O negative')
  const [unitsNeeded, setUnitsNeeded] = useState('2')
  const [hospitalEmail, setHospitalEmail] = useState('')
  const [coordinatorPhone, setCoordinatorPhone] = useState('')
  const [caseNotes, setCaseNotes] = useState('')

  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const initialSteps: PipelineStep[] = useMemo(
    () => [
      {
        key: 'inventory',
        title: 'Confirm shortage (Inventory Analytics agent)',
        description:
          'Asks the Inventory Analytics agent to validate the crisis and recommend response posture.',
        icon: Activity,
        status: 'idle',
        output: null,
        error: null,
      },
      {
        key: 'donors',
        title: 'Match donors (Donor Matching agent)',
        description:
          'Donor Matching agent ranks the top compatible donors from your database.',
        icon: Users,
        status: 'idle',
        output: null,
        error: null,
      },
      {
        key: 'bedrock',
        title: 'Compose messages (AWS Bedrock — Claude)',
        description:
          'Bedrock drafts the SMS body, email subject and bullet points to broadcast.',
        icon: Brain,
        status: 'idle',
        output: null,
        error: null,
      },
      {
        key: 'sns',
        title: 'Broadcast SMS (AWS SNS topic)',
        description:
          'Publishes the SMS body to your SNS topic — fans out to every subscribed donor.',
        icon: MessageSquare,
        status: 'idle',
        output: null,
        error: null,
      },
      {
        key: 'ses',
        title: 'Email hospital coordinator (AWS SES)',
        description:
          'Sends a structured emergency brief with matched donor list to the hospital coordinator.',
        icon: Mail,
        status: 'idle',
        output: null,
        error: null,
      },
    ],
    []
  )

  const [steps, setSteps] = useState<PipelineStep[]>(initialSteps)

  const updateStep = (key: string, patch: Partial<PipelineStep>) => {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s))
    )
  }

  const validateInputs = (): string | null => {
    if (!bloodType) return 'Blood type is required.'
    const u = Number(unitsNeeded)
    if (!u || u < 1) return 'Units needed must be at least 1.'
    if (!hospitalEmail || !hospitalEmail.includes('@'))
      return 'Hospital coordinator email is required.'
    if (coordinatorPhone && !coordinatorPhone.startsWith('+'))
      return 'Coordinator phone must be in E.164 format (e.g. +91XXXXXXXXXX).'
    return null
  }

  const reset = () => {
    setSteps(initialSteps)
    setRunning(false)
    setCompleted(false)
    setPipelineError(null)
    setSuccessMessage(null)
    setActiveAgent(null)
  }

  const runPipeline = async () => {
    const err = validateInputs()
    if (err) {
      setPipelineError(err)
      return
    }
    setPipelineError(null)
    setSuccessMessage(null)
    setCompleted(false)
    setRunning(true)
    setSteps(initialSteps)

    const units = Number(unitsNeeded) || 1
    const donorList = Array.isArray(donors) ? donors : []

    // STEP 1 — Inventory Analytics
    updateStep('inventory', { status: 'running' })
    setActiveAgent(INVENTORY_AGENT_ID)
    let inventoryOut: any = {}
    try {
      const msg = `Confirm current shortage for blood type ${bloodType}. Units needed: ${units}. Notes: ${
        caseNotes || 'none'
      }. Return JSON with fields: shortage_confirmed (boolean), current_units (number), shortage_severity (low|medium|high|critical), recommendation (string).`
      const res = await callAIAgent(msg, INVENTORY_AGENT_ID)
      const parsed = parseAgentResponse(res) || {}
      inventoryOut = {
        shortage_confirmed:
          typeof parsed?.shortage_confirmed === 'boolean'
            ? parsed.shortage_confirmed
            : true,
        current_units:
          typeof parsed?.current_units === 'number' ? parsed.current_units : 0,
        shortage_severity:
          typeof parsed?.shortage_severity === 'string'
            ? parsed.shortage_severity
            : 'high',
        recommendation:
          typeof parsed?.recommendation === 'string'
            ? parsed.recommendation
            : parsed?.rawText || '',
        rawText: parsed?.rawText || '',
      }
      updateStep('inventory', { status: 'done', output: inventoryOut })
    } catch (e: any) {
      updateStep('inventory', {
        status: 'error',
        error: e?.message || 'Inventory agent call failed',
      })
      setPipelineError(`Step 1 (Inventory Analytics) failed: ${e?.message || 'unknown error'}`)
      setRunning(false)
      setActiveAgent(null)
      return
    }

    // STEP 2 — Donor Matching
    updateStep('donors', { status: 'running' })
    setActiveAgent(DONOR_AGENT_ID)
    let donorsOut: any = { matched_donors: [] }
    try {
      const sample = donorList.slice(0, 50).map((d) => ({
        name: d?.name,
        blood_type: d?.blood_type || d?.bloodType,
        phone: d?.phone || d?.contact,
        donations_till_date: d?.donations_till_date,
        donor_type: d?.donor_type,
        location: d?.location,
      }))
      const msg = `Find top 5 compatible donors for ${bloodType}, ${units} units needed. Available donors (sample of first 50 from list): ${JSON.stringify(
        sample
      )}. Return JSON with field matched_donors: array of {name, blood_type, phone, distance_km?, donations_till_date?, match_reason}.`
      const res = await callAIAgent(msg, DONOR_AGENT_ID)
      const parsed = parseAgentResponse(res) || {}
      const matched = Array.isArray(parsed?.matched_donors)
        ? parsed.matched_donors
        : Array.isArray(parsed?.matches)
        ? parsed.matches
        : []
      donorsOut = {
        matched_donors: matched,
        rawText: parsed?.rawText || '',
      }
      updateStep('donors', { status: 'done', output: donorsOut })
    } catch (e: any) {
      updateStep('donors', {
        status: 'error',
        error: e?.message || 'Donor matching agent failed',
      })
      setPipelineError(`Step 2 (Donor Matching) failed: ${e?.message || 'unknown error'}`)
      setRunning(false)
      setActiveAgent(null)
      return
    }

    setActiveAgent(null)

    // STEP 3 — Bedrock compose
    updateStep('bedrock', { status: 'running' })
    let composeOut: any = {}
    try {
      const matchedCount = Array.isArray(donorsOut?.matched_donors)
        ? donorsOut.matched_donors.length
        : 0
      const severity = inventoryOut?.shortage_severity || 'high'
      const brief = `Compose two short messages for blood donors. Crisis: ${bloodType} blood needed, ${units} units, severity ${severity}. Inferred recipients: ${matchedCount} donors. Return JSON with fields: patient_summary (the SMS body, max 160 chars, no emojis), blood_type_relevance (the email subject), recommended_actions (array — these are the bullet points to include in the email body), urgency_level.`
      const res = await fetch('/api/aws/bedrock-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ medicalNotes: brief }),
      })
      const data = await res.json()
      if (!data?.success) {
        throw new Error(data?.error || 'Bedrock compose failed')
      }
      const parsed = data?.data?.parsed
      const rawText = data?.data?.rawText || ''
      if (parsed && typeof parsed === 'object') {
        composeOut = {
          patient_summary:
            typeof parsed?.patient_summary === 'string'
              ? parsed.patient_summary
              : rawText.slice(0, 160),
          blood_type_relevance:
            typeof parsed?.blood_type_relevance === 'string'
              ? parsed.blood_type_relevance
              : `Urgent: ${bloodType} blood needed`,
          recommended_actions: Array.isArray(parsed?.recommended_actions)
            ? parsed.recommended_actions
            : [],
          urgency_level:
            typeof parsed?.urgency_level === 'string'
              ? parsed.urgency_level
              : severity,
        }
      } else {
        composeOut = {
          patient_summary: rawText.slice(0, 160) || `Urgent: ${bloodType} blood needed (${units} units). Please respond if available.`,
          blood_type_relevance: `Urgent: ${bloodType} blood needed`,
          recommended_actions: [],
          urgency_level: severity,
        }
      }
      updateStep('bedrock', { status: 'done', output: composeOut })
    } catch (e: any) {
      updateStep('bedrock', {
        status: 'error',
        error: e?.message || 'Bedrock compose failed',
      })
      setPipelineError(`Step 3 (Bedrock compose) failed: ${e?.message || 'unknown error'}`)
      setRunning(false)
      return
    }

    // STEP 4 — SNS topic broadcast
    updateStep('sns', { status: 'running' })
    let snsOut: any = {}
    try {
      const res = await fetch('/api/aws/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode: 'topic',
          message: composeOut?.patient_summary || `Urgent: ${bloodType} blood needed`,
          subject: 'RaktSetu Emergency',
        }),
      })
      const data = await res.json()
      if (!data?.success) {
        throw new Error(data?.error || 'SNS publish failed')
      }
      snsOut = { messageId: data?.data?.messageId || '' }
      updateStep('sns', { status: 'done', output: snsOut })
    } catch (e: any) {
      updateStep('sns', {
        status: 'error',
        error: e?.message || 'SNS publish failed',
      })
      setPipelineError(`Step 4 (SNS broadcast) failed: ${e?.message || 'unknown error'}`)
      setRunning(false)
      return
    }

    // STEP 5 — SES email
    updateStep('ses', { status: 'running' })
    let sesOut: any = {}
    try {
      const html = buildEmailHtml({
        subject: composeOut?.blood_type_relevance || `Urgent: ${bloodType} blood needed`,
        actions: Array.isArray(composeOut?.recommended_actions)
          ? composeOut.recommended_actions
          : [],
        matchedDonors: Array.isArray(donorsOut?.matched_donors)
          ? donorsOut.matched_donors
          : [],
        bloodType,
        unitsNeeded: units,
        severity: inventoryOut?.shortage_severity || 'high',
      })
      const text = `RaktSetu Emergency: ${bloodType} blood needed (${units} units). ${
        composeOut?.patient_summary || ''
      }`
      const res = await fetch('/api/aws/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          to: hospitalEmail,
          subject: composeOut?.blood_type_relevance || `Urgent: ${bloodType} blood needed`,
          html,
          text,
        }),
      })
      const data = await res.json()
      if (!data?.success) {
        throw new Error(data?.error || 'SES email failed')
      }
      sesOut = { messageId: data?.data?.messageId || '', to: hospitalEmail }
      updateStep('ses', { status: 'done', output: sesOut })
    } catch (e: any) {
      updateStep('ses', {
        status: 'error',
        error: e?.message || 'SES email failed',
      })
      setPipelineError(`Step 5 (SES email) failed: ${e?.message || 'unknown error'}`)
      setRunning(false)
      return
    }

    // Done
    const matchedCount = Array.isArray(donorsOut?.matched_donors)
      ? donorsOut.matched_donors.length
      : 0
    setSuccessMessage(
      `Emergency response broadcast complete — ${matchedCount} donor${
        matchedCount === 1 ? '' : 's'
      } notified, hospital coordinator emailed.`
    )
    setRunning(false)
    setCompleted(true)
    setActiveAgent(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md">
          <Siren className="w-5 h-5 text-[hsl(40,50%,98%)]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[hsl(20,25%,12%)]">
            Emergency Response Pipeline
          </h2>
          <p className="text-xs text-[hsl(20,15%,40%)]">
            One-tap blood crisis activation — AI agents + AWS in sequence.
          </p>
        </div>
      </div>

      {pipelineError && (
        <Banner type="error">
          <strong>Pipeline stopped.</strong> {pipelineError}
        </Banner>
      )}
      {successMessage && (
        <Banner type="success">{successMessage}</Banner>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`${CARD} p-4 lg:col-span-5 h-fit space-y-3`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700" />
            <p className="text-xs uppercase tracking-wider text-[hsl(20,25%,12%)]/70 font-semibold">
              Crisis details
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[hsl(20,25%,12%)] block mb-1">
                Blood type
              </label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className={INPUT}
                disabled={running}
              >
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(20,25%,12%)] block mb-1">
                Units needed
              </label>
              <input
                type="number"
                min={1}
                value={unitsNeeded}
                onChange={(e) => setUnitsNeeded(e.target.value)}
                className={INPUT}
                disabled={running}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[hsl(20,25%,12%)] block mb-1">
              Hospital coordinator email *
            </label>
            <input
              type="email"
              value={hospitalEmail}
              onChange={(e) => setHospitalEmail(e.target.value)}
              placeholder="coordinator@hospital.com"
              className={INPUT}
              disabled={running}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[hsl(20,25%,12%)] block mb-1">
              Coordinator phone (optional, E.164)
            </label>
            <input
              value={coordinatorPhone}
              onChange={(e) => setCoordinatorPhone(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className={INPUT}
              disabled={running}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[hsl(20,25%,12%)] block mb-1">
              Case notes
            </label>
            <textarea
              value={caseNotes}
              onChange={(e) => setCaseNotes(e.target.value)}
              rows={4}
              className={`${INPUT} resize-y`}
              placeholder="e.g. Post-surgical bleeding, ward 4B, response window 4 hours."
              disabled={running}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={runPipeline}
              disabled={running}
              className={`${BTN_PRIMARY} flex-1`}
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Running pipeline...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" /> Trigger Emergency Response
                </>
              )}
            </button>
            {(completed || pipelineError) && !running && (
              <button onClick={reset} className={BTN_GHOST}>
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-[hsl(30,30%,85%)] text-[11px] text-[hsl(20,15%,40%)]">
            Donors available in DB: {Array.isArray(donors) ? donors.length : 0}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-3">
          {steps.map((step, i) => (
            <StepCard key={step.key} number={i + 1} step={step} />
          ))}
        </div>
      </div>
    </div>
  )
}
