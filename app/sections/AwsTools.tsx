'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Cloud,
  Upload,
  Mail,
  MessageSquare,
  Brain,
  FileText,
  Send,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Lock,
} from 'lucide-react'
import { formatBloodGroup } from '@/lib/bloodGroup'

interface AwsToolsProps {
  donors: any[]
}

type TabKey = 's3' | 'ses' | 'sns' | 'bedrock'

interface AwsStatus {
  region: string | null
  credentials: boolean
  s3_bucket: boolean
  ses_from: boolean
  bedrock_model: boolean
}

interface S3File {
  key: string
  size: number
  lastModified: string
  presignedUrl: string
}

const CARD =
  'bg-[hsl(40,50%,98%)]/75 backdrop-blur-[16px] border border-[hsl(0,30%,80%)]/30 shadow-md rounded-[14px]'
const SUBCARD = 'bg-[hsl(40,50%,98%)]/60 border border-[hsl(30,30%,85%)]/60 rounded-[10px]'
const INPUT =
  'w-full px-3 py-2 text-sm bg-[hsl(40,50%,98%)]/80 border border-[hsl(30,30%,82%)] rounded-[8px] outline-none focus:border-red-600 focus:ring-2 focus:ring-red-200 text-[hsl(20,25%,12%)] placeholder:text-[hsl(20,15%,40%)]/60'
const BTN_PRIMARY =
  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[10px] bg-gradient-to-r from-red-600 to-red-700 text-[hsl(40,50%,98%)] shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed'
const BTN_GHOST =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[8px] bg-[hsl(40,50%,98%)]/70 border border-[hsl(30,30%,82%)] text-[hsl(20,25%,12%)] hover:bg-[hsl(40,30%,90%)] transition-all'

const EMAIL_TEMPLATES: { label: string; subject: string; body: string }[] = [
  {
    label: 'Urgent Donation Request',
    subject: 'Urgent: Your blood type is needed today',
    body:
      'Dear donor,\n\nWe are experiencing a critical shortage of your blood type. Your donation today could save a life. Please visit our nearest center at your earliest convenience.\n\nThank you,\nRaktSetu AI Team',
  },
  {
    label: 'Thank You for Donating',
    subject: 'Thank you for your life-saving donation',
    body:
      'Dear donor,\n\nThank you for donating recently. Your contribution makes a real difference. We will reach out again once you are eligible for your next donation.\n\nWith gratitude,\nRaktSetu AI Team',
  },
  {
    label: 'Eligibility Reminder',
    subject: 'You are eligible to donate again',
    body:
      'Dear donor,\n\nIt has been a while since your last donation, and you are now eligible to donate again. We would deeply appreciate your continued support.\n\nWarm regards,\nRaktSetu AI Team',
  },
]

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
        ok
          ? 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-amber-50 text-amber-800 border border-amber-200'
      }`}
    >
      {ok ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <AlertCircle className="w-3 h-3" />
      )}
      <span>{label}</span>
    </div>
  )
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

function formatSize(bytes: number) {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatDate(iso: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function S3Tab() {
  const [files, setFiles] = useState<S3File[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/aws/files', { credentials: 'include' })
      const data = await res.json()
      if (data?.success) {
        const list = Array.isArray(data?.data?.files) ? data.data.files : []
        setFiles(list)
      } else {
        setError(data?.error || 'Failed to load files')
      }
    } catch (err: any) {
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleUpload = async () => {
    if (!pendingFile) return
    setUploading(true)
    setError('')
    setSuccess('')
    try {
      const fd = new FormData()
      fd.append('file', pendingFile)
      fd.append('prefix', 'donor-docs')
      const res = await fetch('/api/aws/upload', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) {
        setSuccess(`Uploaded: ${data?.data?.key || ''}`)
        setPendingFile(null)
        if (inputRef.current) inputRef.current.value = ''
        await refresh()
      } else {
        setError(data?.error || 'Upload failed')
      }
    } catch (err: any) {
      setError(err?.message || 'Network error')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (key: string) => {
    setError('')
    setSuccess('')
    try {
      const res = await fetch(
        `/api/aws/files/${encodeURIComponent(key)}`,
        { method: 'DELETE', credentials: 'include' }
      )
      const data = await res.json()
      if (data?.success) {
        setSuccess(`Deleted: ${key}`)
        await refresh()
      } else {
        setError(data?.error || 'Delete failed')
      }
    } catch (err: any) {
      setError(err?.message || 'Network error')
    }
  }

  return (
    <div className="space-y-4">
      <div className={`${SUBCARD} p-4`}>
        <p className="text-xs uppercase tracking-wider text-[hsl(20,25%,12%)]/70 font-semibold mb-3">
          Upload donor documents (max 10MB)
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
            className="text-xs text-[hsl(20,25%,12%)] file:mr-3 file:px-3 file:py-1.5 file:rounded-[8px] file:border-0 file:bg-red-100 file:text-red-800 file:text-xs file:cursor-pointer"
          />
          <button
            onClick={handleUpload}
            disabled={!pendingFile || uploading}
            className={BTN_PRIMARY}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{uploading ? 'Uploading...' : 'Upload to S3'}</span>
          </button>
        </div>
        <p className="text-[11px] text-[hsl(20,15%,40%)] mt-2">
          Useful for: donor ID proofs, signed donation consent forms, lab reports.
        </p>
      </div>

      {error && <Banner type="error">{error}</Banner>}
      {success && <Banner type="success">{success}</Banner>}

      <div className={`${SUBCARD} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wider text-[hsl(20,25%,12%)]/70 font-semibold">
            Stored files ({files.length})
          </p>
          <button onClick={refresh} className={BTN_GHOST}>
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <span>Refresh</span>
            )}
          </button>
        </div>

        {loading && files.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-[hsl(20,15%,40%)] text-xs">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-[hsl(20,15%,40%)] text-xs">
            <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
            No files yet. Upload one above to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div
                key={f.key}
                className="flex items-center gap-3 px-3 py-2 bg-[hsl(40,50%,98%)]/70 border border-[hsl(30,30%,85%)] rounded-[8px]"
              >
                <FileText className="w-4 h-4 text-red-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[hsl(20,25%,12%)] truncate">
                    {f.key}
                  </p>
                  <p className="text-[10px] text-[hsl(20,15%,40%)]">
                    {formatSize(f.size)} {f.lastModified ? `• ${formatDate(f.lastModified)}` : ''}
                  </p>
                </div>
                {f.presignedUrl && (
                  <a
                    href={f.presignedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={BTN_GHOST}
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                )}
                <button
                  onClick={() => handleDelete(f.key)}
                  className="inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-[8px] bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SesTab({ donors }: { donors: any[] }) {
  const [selectedDonor, setSelectedDonor] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const donorList = Array.isArray(donors) ? donors : []
  const selected = donorList.find((d) => String(d?._id) === selectedDonor)
  const recipientEmail = selected?.email || ''

  const applyTemplate = (idx: number) => {
    const t = EMAIL_TEMPLATES[idx]
    if (!t) return
    setSubject(t.subject)
    setBody(t.body)
  }

  const handleSend = async () => {
    setError('')
    setSuccess('')
    if (!recipientEmail) {
      setError('Please select a donor with a valid email.')
      return
    }
    if (!subject || !body) {
      setError('Subject and body are required.')
      return
    }
    setLoading(true)
    try {
      const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">${body
        .split('\n')
        .map((l) => `<p>${l.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
        .join('')}</div>`
      const res = await fetch('/api/aws/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          html,
          text: body,
        }),
      })
      const data = await res.json()
      if (data?.success) {
        setSuccess(`Email sent to ${recipientEmail} (id: ${data?.data?.messageId || ''})`)
        setSubject('')
        setBody('')
      } else {
        setError(data?.error || 'Send failed')
      }
    } catch (err: any) {
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className={`${SUBCARD} p-4 space-y-3`}>
        <div>
          <label className="text-xs font-medium text-[hsl(20,25%,12%)] block mb-1">
            Recipient donor
          </label>
          <select
            value={selectedDonor}
            onChange={(e) => setSelectedDonor(e.target.value)}
            className={INPUT}
          >
            <option value="">Select a donor...</option>
            {donorList.map((d) => (
              <option key={d?._id} value={String(d?._id)}>
                {d?.name || 'Unnamed'}{' '}
                {d?.blood_type || d?.bloodType
                  ? `(${formatBloodGroup(d?.blood_type || d?.bloodType)})`
                  : ''}{' '}
                — {d?.email || 'no email'}
              </option>
            ))}
          </select>
          {selected && !recipientEmail && (
            <p className="text-[11px] text-amber-700 mt-1">
              This donor has no email on file.
            </p>
          )}
        </div>

        <div>
          <p className="text-[11px] text-[hsl(20,15%,40%)] mb-1.5">Quick templates:</p>
          <div className="flex flex-wrap gap-1.5">
            {EMAIL_TEMPLATES.map((t, i) => (
              <button
                key={t.label}
                onClick={() => applyTemplate(i)}
                className={BTN_GHOST}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-[hsl(20,25%,12%)] block mb-1">
            Subject
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={INPUT}
            placeholder="Subject line"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-[hsl(20,25%,12%)] block mb-1">
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className={`${INPUT} resize-y`}
            placeholder="Write your message..."
          />
        </div>

        <button
          onClick={handleSend}
          disabled={loading || !recipientEmail || !subject || !body}
          className={BTN_PRIMARY}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>{loading ? 'Sending...' : 'Send via SES'}</span>
        </button>
      </div>

      {error && <Banner type="error">{error}</Banner>}
      {success && <Banner type="success">{success}</Banner>}
    </div>
  )
}

function SnsTab({ donors }: { donors: any[] }) {
  const [mode, setMode] = useState<'single' | 'broadcast' | 'topic'>('single')
  const [phone, setPhone] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number; sent: number; failed: number }>({
    done: 0,
    total: 0,
    sent: 0,
    failed: 0,
  })

  const donorList = Array.isArray(donors) ? donors : []
  const bloodTypes = useMemo(() => {
    const set = new Set<string>()
    donorList.forEach((d) => {
      const bt = d?.blood_type || d?.bloodType
      if (bt) set.add(formatBloodGroup(bt))
    })
    return Array.from(set).sort()
  }, [donorList])

  const targets = useMemo(() => {
    if (!bloodType) return []
    return donorList.filter(
      (d) =>
        formatBloodGroup(d?.blood_type || d?.bloodType) === bloodType &&
        typeof d?.phone === 'string' &&
        d.phone.length > 0
    )
  }, [donorList, bloodType])

  const charCount = message.length

  const handleSendSingle = async () => {
    setError('')
    setSuccess('')
    if (!phone || !message) {
      setError('Phone and message are required.')
      return
    }
    if (!phone.startsWith('+')) {
      setError('Phone must be in E.164 format, e.g. +91XXXXXXXXXX')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/aws/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phoneNumber: phone, message }),
      })
      const data = await res.json()
      if (data?.success) {
        setSuccess(`SMS sent (id: ${data?.data?.messageId || ''})`)
        setMessage('')
      } else {
        setError(data?.error || 'Send failed')
      }
    } catch (err: any) {
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleSendTopic = async () => {
    setError('')
    setSuccess('')
    if (!message) {
      setError('Message is required.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/aws/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode: 'topic', message, subject: subject || undefined }),
      })
      const data = await res.json()
      if (data?.success) {
        setSuccess(`Published to topic (id: ${data?.data?.messageId || ''}). All subscribers will receive it.`)
        setMessage('')
        setSubject('')
      } else {
        setError(data?.error || 'Topic publish failed')
      }
    } catch (err: any) {
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleBroadcast = async () => {
    setError('')
    setSuccess('')
    if (!bloodType || !message) {
      setError('Blood type and message are required.')
      return
    }
    if (targets.length === 0) {
      setError('No donors with valid phone numbers for that blood type.')
      return
    }
    setLoading(true)
    setProgress({ done: 0, total: targets.length, sent: 0, failed: 0 })
    let sent = 0
    let failed = 0
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i]
      try {
        const res = await fetch('/api/aws/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ phoneNumber: t.phone, message }),
        })
        const data = await res.json()
        if (data?.success) sent++
        else failed++
      } catch {
        failed++
      }
      setProgress({ done: i + 1, total: targets.length, sent, failed })
    }
    setLoading(false)
    if (failed === 0) {
      setSuccess(`Broadcast complete. Sent to ${sent} donors.`)
    } else {
      setError(`Broadcast finished. ${sent} sent, ${failed} failed.`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode('single')}
          className={`px-3 py-1.5 text-xs font-medium rounded-[8px] ${
            mode === 'single'
              ? 'bg-red-600 text-[hsl(40,50%,98%)]'
              : 'bg-[hsl(40,50%,98%)]/70 border border-[hsl(30,30%,82%)] text-[hsl(20,25%,12%)]'
          }`}
        >
          Single recipient
        </button>
        <button
          onClick={() => setMode('broadcast')}
          className={`px-3 py-1.5 text-xs font-medium rounded-[8px] ${
            mode === 'broadcast'
              ? 'bg-red-600 text-[hsl(40,50%,98%)]'
              : 'bg-[hsl(40,50%,98%)]/70 border border-[hsl(30,30%,82%)] text-[hsl(20,25%,12%)]'
          }`}
        >
          Broadcast by blood type
        </button>
        <button
          onClick={() => setMode('topic')}
          className={`px-3 py-1.5 text-xs font-medium rounded-[8px] ${
            mode === 'topic'
              ? 'bg-red-600 text-[hsl(40,50%,98%)]'
              : 'bg-[hsl(40,50%,98%)]/70 border border-[hsl(30,30%,82%)] text-[hsl(20,25%,12%)]'
          }`}
        >
          SNS Topic broadcast
        </button>
      </div>

      <div className={`${SUBCARD} p-4 space-y-3`}>
        {mode === 'single' && (
          <div>
            <label className="text-xs font-medium text-[hsl(20,25%,12%)] block mb-1">
              Phone number (E.164 format)
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className={INPUT}
            />
            <p className="text-[11px] text-[hsl(20,15%,40%)] mt-1">
              Must include country code starting with +.
            </p>
          </div>
        )}
        {mode === 'broadcast' && (
          <div>
            <label className="text-xs font-medium text-[hsl(20,25%,12%)] block mb-1">
              Blood type to broadcast to
            </label>
            <select
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              className={INPUT}
            >
              <option value="">Select blood type...</option>
              {bloodTypes.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
            {bloodType && (
              <p className="text-[11px] text-[hsl(20,15%,40%)] mt-1">
                Will send to {targets.length} donor{targets.length === 1 ? '' : 's'} with valid phone numbers.
              </p>
            )}
          </div>
        )}
        {mode === 'topic' && (
          <div className="space-y-3">
            <div className="px-3 py-2 rounded-[8px] bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
              Publishes one message to <code className="font-mono">AWS_SNS_TOPIC_ARN</code>. AWS fans out to every confirmed subscriber (SMS, email, etc.) of that topic.
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(20,25%,12%)] block mb-1">
                Subject (optional — used by email subscribers)
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Urgent blood shortage alert"
                maxLength={100}
                className={INPUT}
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-[hsl(20,25%,12%)] block mb-1">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={320}
            className={`${INPUT} resize-y`}
            placeholder="Critical shortage of O- blood. Your donation can save a life today."
          />
          <p
            className={`text-[11px] mt-1 ${
              charCount > 160 ? 'text-amber-700' : 'text-[hsl(20,15%,40%)]'
            }`}
          >
            {charCount} / 160 chars {charCount > 160 ? '(multi-part SMS)' : ''}
          </p>
        </div>

        <button
          onClick={
            mode === 'single'
              ? handleSendSingle
              : mode === 'broadcast'
              ? handleBroadcast
              : handleSendTopic
          }
          disabled={loading}
          className={BTN_PRIMARY}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MessageSquare className="w-4 h-4" />
          )}
          <span>
            {loading
              ? mode === 'broadcast'
                ? `Sending ${progress.done}/${progress.total}...`
                : 'Sending...'
              : mode === 'broadcast'
              ? 'Broadcast SMS'
              : mode === 'topic'
              ? 'Publish to Topic'
              : 'Send SMS'}
          </span>
        </button>

        {mode === 'broadcast' && progress.total > 0 && (
          <div>
            <div className="h-2 bg-[hsl(40,30%,90%)] rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-[hsl(20,15%,40%)] mt-1">
              {progress.done} / {progress.total} processed — {progress.sent} sent, {progress.failed} failed
            </p>
          </div>
        )}
      </div>

      {error && <Banner type="error">{error}</Banner>}
      {success && <Banner type="success">{success}</Banner>}
    </div>
  )
}

function BedrockTab() {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)
  const [rawText, setRawText] = useState('')
  const [warning, setWarning] = useState('')

  const handleSummarize = async () => {
    setError('')
    setResult(null)
    setRawText('')
    setWarning('')
    if (!notes || notes.trim().length < 10) {
      setError('Please paste at least a short clinical note (10+ chars).')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/aws/bedrock-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ medicalNotes: notes }),
      })
      const data = await res.json()
      if (data?.success) {
        if (data?.data?.parsed) {
          setResult(data.data.parsed)
        }
        setRawText(data?.data?.rawText || '')
        if (data?.data?.warning) setWarning(data.data.warning)
      } else {
        setError(data?.error || 'Summarize failed')
      }
    } catch (err: any) {
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const urgency = String(result?.urgency_level || '').toLowerCase()
  const urgencyClass =
    urgency === 'critical'
      ? 'bg-rose-100 text-rose-800 border-rose-200'
      : urgency === 'high'
      ? 'bg-orange-100 text-orange-800 border-orange-200'
      : urgency === 'medium'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : urgency === 'low'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-slate-100 text-slate-800 border-slate-200'

  const actions = Array.isArray(result?.recommended_actions)
    ? result.recommended_actions
    : []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-[hsl(40,50%,98%)] border border-red-200 border-l-4 border-l-red-600">
        <Brain className="w-4 h-4 text-red-700" />
        <p className="text-xs text-[hsl(20,25%,12%)]">
          Powered by AWS Bedrock — Claude 3.5 Sonnet
        </p>
      </div>

      <div className={`${SUBCARD} p-4 space-y-3`}>
        <div>
          <label className="text-xs font-medium text-[hsl(20,25%,12%)] block mb-1">
            Paste medical notes / patient context
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={10}
            className={`${INPUT} resize-y`}
            placeholder="e.g. 34-year-old female, post-surgical bleeding, Hb 6.2, blood type AB-, requires 2 units urgently within 4 hours..."
          />
        </div>
        <button
          onClick={handleSummarize}
          disabled={loading || notes.trim().length < 10}
          className={BTN_PRIMARY}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Brain className="w-4 h-4" />
          )}
          <span>{loading ? 'Summarizing...' : 'Summarize with Claude on Bedrock'}</span>
        </button>
      </div>

      {error && <Banner type="error">{error}</Banner>}
      {warning && <Banner type="info">{warning}</Banner>}

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={`${SUBCARD} p-4`}>
            <p className="text-[11px] uppercase tracking-wider text-[hsl(20,25%,12%)]/70 font-semibold mb-2">
              Patient Summary
            </p>
            <p className="text-sm text-[hsl(20,25%,12%)] whitespace-pre-wrap">
              {result?.patient_summary || '—'}
            </p>
          </div>
          <div className={`${SUBCARD} p-4`}>
            <p className="text-[11px] uppercase tracking-wider text-[hsl(20,25%,12%)]/70 font-semibold mb-2">
              Blood Type Relevance
            </p>
            <p className="text-sm text-[hsl(20,25%,12%)] whitespace-pre-wrap">
              {result?.blood_type_relevance || '—'}
            </p>
          </div>
          <div className={`${SUBCARD} p-4 md:col-span-2`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-[hsl(20,25%,12%)]/70 font-semibold">
                Recommended Actions
              </p>
              <span
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${urgencyClass}`}
              >
                Urgency: {urgency || 'unknown'}
              </span>
            </div>
            {actions.length > 0 ? (
              <ul className="space-y-1.5">
                {actions.map((a: any, i: number) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[hsl(20,25%,12%)]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-red-600 shrink-0" />
                    <span>{String(a)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[hsl(20,15%,40%)]">No actions returned.</p>
            )}
          </div>
        </div>
      )}

      {!result && rawText && (
        <div className={`${SUBCARD} p-4`}>
          <p className="text-[11px] uppercase tracking-wider text-[hsl(20,25%,12%)]/70 font-semibold mb-2">
            Raw response
          </p>
          <pre className="text-xs text-[hsl(20,25%,12%)] whitespace-pre-wrap break-words">
            {rawText}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function AwsTools({ donors }: AwsToolsProps) {
  const [tab, setTab] = useState<TabKey>('s3')
  const [status, setStatus] = useState<AwsStatus | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/aws/status', { credentials: 'include' })
        const data = await res.json()
        setStatus({
          region: data?.region ?? null,
          credentials: !!data?.credentials,
          s3_bucket: !!data?.s3_bucket,
          ses_from: !!data?.ses_from,
          bedrock_model: !!data?.bedrock_model,
        })
      } catch {
        setStatus(null)
      }
    }
    load()
  }, [])

  const tabs: { key: TabKey; label: string; icon: any; disabled?: boolean }[] = [
    { key: 's3', label: 'Document Uploads (S3)', icon: Upload },
    { key: 'ses', label: 'Donor Email (SES)', icon: Mail },
    { key: 'sns', label: 'SMS Alerts (SNS)', icon: MessageSquare },
    { key: 'bedrock', label: 'AI Medical Summarizer (Bedrock)', icon: Brain },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md">
          <Cloud className="w-5 h-5 text-[hsl(40,50%,98%)]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[hsl(20,25%,12%)]">Lifeline Hub</h2>
          <p className="text-xs text-[hsl(20,15%,40%)]">
            Document records, donor alerts, and AI-assisted triage for every blood warrior.
          </p>
        </div>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 mt-0.5 text-red-700 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[hsl(20,25%,12%)] mb-1">
              These features call AWS directly from this app (server-side).
            </p>
            <p className="text-xs text-[hsl(20,15%,40%)]">
              Configure your AWS credentials in <code className="px-1.5 py-0.5 rounded bg-[hsl(40,30%,90%)] border border-[hsl(30,30%,82%)] text-[11px]">.env.local</code>{' '}
              and run <code className="px-1.5 py-0.5 rounded bg-[hsl(40,30%,90%)] border border-[hsl(30,30%,82%)] text-[11px]">npm install</code> to install the AWS SDK packages, then restart{' '}
              <code className="px-1.5 py-0.5 rounded bg-[hsl(40,30%,90%)] border border-[hsl(30,30%,82%)] text-[11px]">npm run dev</code>.
            </p>
          </div>
        </div>
      </div>

      <div className={`${CARD} p-4`}>
        <p className="text-[11px] uppercase tracking-wider text-[hsl(20,25%,12%)]/70 font-semibold mb-3">
          Configuration status
        </p>
        <div className="flex flex-wrap gap-2">
          <StatusPill
            ok={!!status?.credentials}
            label={`Credentials: ${status?.credentials ? 'configured' : 'not configured'}`}
          />
          <StatusPill
            ok={!!status?.region}
            label={`Region: ${status?.region || 'not set'}`}
          />
          <StatusPill
            ok={!!status?.s3_bucket}
            label={`S3 bucket: ${status?.s3_bucket ? 'set' : 'not set'}`}
          />
          <StatusPill
            ok={!!status?.ses_from}
            label={`SES from: ${status?.ses_from ? 'set' : 'not set'}`}
          />
          <StatusPill
            ok={!!status?.bedrock_model}
            label={`Bedrock model: ${status?.bedrock_model ? 'set' : 'default'}`}
          />
        </div>
        <p className="text-[11px] text-[hsl(20,15%,40%)] mt-3">
          Set credentials in .env.local — see .env.example for the full list of variables.
        </p>
      </div>

      <div className={`${CARD} p-2 flex flex-wrap gap-1`}>
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          const isDisabled = !!t.disabled
          if (isDisabled) {
            return (
              <div
                key={t.key}
                title="Email disabled — set AWS_SES_FROM_EMAIL in .env.local"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-[10px] text-[hsl(20,15%,40%)] opacity-50 cursor-not-allowed pointer-events-none border border-[hsl(30,30%,82%)] bg-[hsl(40,30%,90%)]/40"
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                <Lock className="w-3 h-3 ml-1" />
              </div>
            )
          }
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-[10px] transition-all ${
                active
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-[hsl(40,50%,98%)] shadow-md'
                  : 'text-[hsl(20,25%,12%)] hover:bg-[hsl(40,30%,90%)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      <div className={`${CARD} p-5`}>
        {tab === 's3' && <S3Tab />}
        {tab === 'ses' && <SesTab donors={donors} />}
        {tab === 'sns' && <SnsTab donors={donors} />}
        {tab === 'bedrock' && <BedrockTab />}
      </div>
    </div>
  )
}
