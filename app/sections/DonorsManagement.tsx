'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Plus, Trash2, Loader2, Search, Database } from 'lucide-react'
import { formatBloodGroup, ALL_BLOOD_GROUPS } from '@/lib/bloodGroup'

const BLOOD_TYPES = [...ALL_BLOOD_GROUPS]
const STATUSES = ['Available', 'On Standby', 'Unavailable']

interface DonorsManagementProps {
  donors: any[]
  refreshDonors: () => Promise<void>
}

const CARD_BASE =
  'bg-[hsl(40,50%,98%)]/75 backdrop-blur-[16px] border border-[hsl(0,30%,80%)]/30 shadow-md rounded-[14px]'

// Status badge — SEMANTIC: available=green for meaning
function statusBadge(s: string) {
  const v = (s || '').toLowerCase()
  if (v.includes('available') && !v.includes('un')) return 'bg-green-100 text-green-700 border-green-200'
  if (v.includes('standby')) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

export default function DonorsManagement({ donors, refreshDonors }: DonorsManagementProps) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importBanner, setImportBanner] = useState<{ tone: 'green' | 'red'; text: string } | null>(null)

  const handleImportDataset = async () => {
    setImporting(true)
    setImportBanner(null)
    try {
      const res = await fetch('/api/donors/import-dataset', {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json()
      if (json?.success) {
        await refreshDonors()
        setImportBanner({
          tone: 'green',
          text: `Imported ${json?.data?.imported ?? 0}, skipped ${json?.data?.skipped ?? 0} (of ${json?.data?.total ?? 0} rows).`,
        })
      } else {
        setImportBanner({ tone: 'red', text: json?.error || 'Dataset import failed.' })
      }
    } catch (e: any) {
      setImportBanner({ tone: 'red', text: e?.message || 'Network error during import.' })
    } finally {
      setImporting(false)
    }
  }
  const [form, setForm] = useState({
    name: '',
    blood_type: 'O positive',
    last_donation: '',
    contact: '',
    location: '',
    status: 'Available',
    email: '',
  })

  const filtered = useMemo(() => {
    if (!Array.isArray(donors)) return []
    const q = search.trim().toLowerCase()
    if (!q) return donors
    return donors.filter(
      (d) =>
        (d?.name || '').toLowerCase().includes(q) ||
        (d?.blood_type || '').toLowerCase().includes(q) ||
        (d?.location || '').toLowerCase().includes(q) ||
        (d?.contact || '').toLowerCase().includes(q)
    )
  }, [donors, search])

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/donors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          last_donation: form.last_donation || null,
        }),
      })
      const data = await res.json()
      if (data?.success) {
        setForm({ name: '', blood_type: 'O positive', last_donation: '', contact: '', location: '', status: 'Available', email: '' })
        setShowForm(false)
        await refreshDonors()
      } else {
        setError(data?.error || 'Failed to add donor')
      }
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/donors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await refreshDonors()
    } catch (e: any) {
      setError(e?.message || 'Failed to update')
    }
  }

  const remove = async (id: string) => {
    try {
      await fetch(`/api/donors/${id}`, { method: 'DELETE' })
      await refreshDonors()
    } catch (e: any) {
      setError(e?.message || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[hsl(20,25%,12%)]">Donors</h2>
          <p className="text-sm text-[hsl(20,15%,40%)]">Manage your donor network</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleImportDataset}
            disabled={importing}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-[hsl(40,50%,98%)] rounded-[10px] shadow-md hover:shadow-lg"
          >
            {importing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
            ) : (
              <><Database className="w-4 h-4 mr-2" />Import from Dataset</>
            )}
          </Button>
          <Button
            onClick={() => setShowForm((v) => !v)}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-[hsl(40,50%,98%)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? 'Cancel' : 'Add Donor'}
          </Button>
        </div>
      </div>

      {importBanner && (
        <div
          className={`p-3 rounded-[10px] border text-sm ${
            importBanner.tone === 'green'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {importBanner.text}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-[10px] bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <Card className={CARD_BASE}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[hsl(20,25%,12%)]">New Donor</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1 block">Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]" />
            </div>
            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1 block">Blood Type</Label>
              <Select value={form.blood_type} onValueChange={(v) => setForm((p) => ({ ...p, blood_type: v }))}>
                <SelectTrigger className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]"><SelectValue /></SelectTrigger>
                <SelectContent>{BLOOD_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1 block">Last Donation</Label>
              <Input type="date" value={form.last_donation} onChange={(e) => setForm((p) => ({ ...p, last_donation: e.target.value }))} className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]" />
            </div>
            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1 block">Contact</Label>
              <Input value={form.contact} onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))} placeholder="+91 ..." className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]" />
            </div>
            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1 block">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]" />
            </div>
            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1 block">Location</Label>
              <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]" />
            </div>
            <div>
              <Label className="text-xs text-[hsl(20,25%,12%)] mb-1 block">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)]"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <Button onClick={submit} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-[hsl(40,50%,98%)]">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Donor'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={CARD_BASE}>
        <CardHeader className="flex flex-row items-center justify-between pb-3 flex-wrap gap-3">
          <CardTitle className="text-base text-[hsl(20,25%,12%)] flex items-center gap-2">
            <Users className="w-4 h-4 text-red-700" />
            Donor Network ({filtered.length})
          </CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(20,15%,40%)]" />
            <Input
              placeholder="Search name, blood type, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[hsl(40,50%,98%)] border-[hsl(30,30%,82%)] h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Blood Type</TableHead>
                  <TableHead>Last Donation</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[hsl(20,15%,40%)] text-sm">
                      No donors found. Add your first donor to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((d: any) => (
                    <TableRow key={d?._id}>
                      <TableCell className="text-sm font-medium text-[hsl(20,25%,12%)]">{d?.name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200 text-xs font-bold">
                          {formatBloodGroup(d?.blood_type) || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {d?.last_donation ? new Date(d.last_donation).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{d?.contact || '—'}</TableCell>
                      <TableCell className="text-xs">{d?.location || '—'}</TableCell>
                      <TableCell>
                        <Select value={d?.status ?? 'Available'} onValueChange={(v) => updateStatus(d?._id, v)}>
                          <SelectTrigger className="w-32 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => remove(d?._id)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-3 pt-3 border-t border-[hsl(30,30%,85%)]">
            <Badge variant="outline" className="text-[10px] border-green-300 text-green-700 bg-green-50">
              <Users className="w-3 h-3 mr-1" />
              {filtered.filter((d: any) => (d?.status || '').toLowerCase() === 'available').length} active donors
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
