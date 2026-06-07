'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Plus, Trash2, Loader2, Filter } from 'lucide-react'
import { formatBloodGroup, ALL_BLOOD_GROUPS } from '@/lib/bloodGroup'

const BLOOD_TYPES = [...ALL_BLOOD_GROUPS]
const URGENCIES = ['Critical', 'High', 'Normal']
const STATUSES = ['Pending', 'In Progress', 'Fulfilled', 'Cancelled']

interface RequestsManagementProps {
  requests: any[]
  refreshRequests: () => Promise<void>
}

const CARD_BASE =
  'bg-[hsl(40,50%,98%)]/75 backdrop-blur-[16px] border border-[hsl(0,30%,80%)]/30 shadow-md rounded-[14px]'

function urgencyBadge(u: string) {
  const s = (u || '').toLowerCase()
  if (s.includes('critical')) return 'bg-red-100 text-red-700 border-red-200'
  if (s.includes('high')) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-green-100 text-green-700 border-green-200'
}

// Status badge — SEMANTIC: keep fulfilled=green for meaning
function statusBadge(s: string) {
  const v = (s || '').toLowerCase()
  if (v.includes('pending')) return 'bg-amber-100 text-amber-700 border-amber-200'
  if (v.includes('progress')) return 'bg-blue-100 text-blue-700 border-blue-200'
  if (v.includes('fulfilled')) return 'bg-green-100 text-green-700 border-green-200'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

export default function RequestsManagement({ requests, refreshRequests }: RequestsManagementProps) {
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterBlood, setFilterBlood] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    patient_name: '',
    hospital: '',
    blood_type: 'O positive',
    units_needed: '1',
    urgency: 'Normal',
    status: 'Pending',
    notes: '',
  })

  const filtered = useMemo(() => {
    if (!Array.isArray(requests)) return []
    return requests.filter((r) => {
      if (filterStatus !== 'all' && (r?.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false
      if (filterBlood !== 'all' && formatBloodGroup(r?.blood_type) !== filterBlood) return false
      return true
    })
  }, [requests, filterStatus, filterBlood])

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/blood-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          units_needed: Number(form.units_needed) || 1,
        }),
      })
      const data = await res.json()
      if (data?.success) {
        setForm({
          patient_name: '',
          hospital: '',
          blood_type: 'O positive',
          units_needed: '1',
          urgency: 'Normal',
          status: 'Pending',
          notes: '',
        })
        setShowForm(false)
        await refreshRequests()
      } else {
        setError(data?.error || 'Failed to create request')
      }
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/blood-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await refreshRequests()
    } catch (e: any) {
      setError(e?.message || 'Failed to update')
    }
  }

  const remove = async (id: string) => {
    try {
      await fetch(`/api/blood-requests/${id}`, { method: 'DELETE' })
      await refreshRequests()
    } catch (e: any) {
      setError(e?.message || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[hsl(20,25%,12%)]">Blood Requests</h2>
          <p className="text-sm text-[hsl(20,15%,40%)]">Manage incoming patient and hospital requests</p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-[hsl(40,50%,98%)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? 'Cancel' : 'New Request'}
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-[10px] bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <Card className={CARD_BASE}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[hsl(20,25%,12%)]">New Blood Request</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1 block">Patient Name</Label>
              <Input value={form.patient_name} onChange={(e) => setForm((p) => ({ ...p, patient_name: e.target.value }))} className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]" />
            </div>
            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1 block">Hospital</Label>
              <Input value={form.hospital} onChange={(e) => setForm((p) => ({ ...p, hospital: e.target.value }))} className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]" />
            </div>
            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1 block">Blood Type</Label>
              <Select value={form.blood_type} onValueChange={(v) => setForm((p) => ({ ...p, blood_type: v }))}>
                <SelectTrigger className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]"><SelectValue /></SelectTrigger>
                <SelectContent>{BLOOD_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1 block">Units Needed</Label>
              <Input type="number" min={1} value={form.units_needed} onChange={(e) => setForm((p) => ({ ...p, units_needed: e.target.value }))} className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]" />
            </div>
            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1 block">Urgency</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm((p) => ({ ...p, urgency: v }))}>
                <SelectTrigger className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]"><SelectValue /></SelectTrigger>
                <SelectContent>{URGENCIES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1 block">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1 block">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]" />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <Button onClick={submit} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-[hsl(40,50%,98%)]">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Request'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={CARD_BASE}>
        <CardHeader className="flex flex-row items-center justify-between pb-3 flex-wrap gap-3">
          <CardTitle className="text-base text-[hsl(20,25%,12%)] flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-700" />
            All Requests ({filtered.length})
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-red-700" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-8 text-xs bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBlood} onValueChange={setFilterBlood}>
              <SelectTrigger className="w-32 h-8 text-xs bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]"><SelectValue placeholder="Blood Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {BLOOD_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-[hsl(20,15%,40%)] text-sm">
                      No requests match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r: any) => (
                    <TableRow key={r?._id}>
                      <TableCell className="text-[11px] font-mono text-[hsl(20,15%,40%)]">
                        {String(r?._id || '').slice(-6)}
                      </TableCell>
                      <TableCell className="text-sm">{r?.patient_name || '—'}</TableCell>
                      <TableCell className="text-xs">{r?.hospital || '—'}</TableCell>
                      <TableCell className="font-semibold text-[hsl(20,25%,12%)]">{formatBloodGroup(r?.blood_type) || '—'}</TableCell>
                      <TableCell>{r?.units_needed ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={urgencyBadge(r?.urgency ?? '')}>
                          {r?.urgency ?? 'Normal'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={r?.status ?? 'Pending'} onValueChange={(v) => updateStatus(r?._id, v)}>
                          <SelectTrigger className="w-32 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => remove(r?._id)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
