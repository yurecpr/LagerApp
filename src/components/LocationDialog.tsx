'use client'
import { useState } from 'react'
import pb from '@/lib/pocketbase'
import { errorMessage } from '@/lib/movements'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { useLanguage } from '@/lib/i18n'

type Location = { id: string; name: string; notes?: string; qr_code?: string }
export default function LocationDialog({ location, onClose, onDone }: { location?: Location; onClose: () => void; onDone: () => void }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({ name: location?.name || '', notes: location?.notes || '', qr_code: location?.qr_code || '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy || !form.name.trim()) return
    setBusy(true); setError('')
    try {
      const data = { ...form, name: form.name.trim(), qr_code: form.qr_code.trim() }
      if (location) await pb.collection('locations').update(location.id, data)
      else await pb.collection('locations').create(data)
      onDone(); onClose()
    } catch (e) { setError(t(errorMessage(e))) }
    finally { setBusy(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}><DialogContent className="max-w-md">
    <DialogHeader><DialogTitle>{location ? t('Редагування комірки') : t('Нова комірка')}</DialogTitle></DialogHeader>
    <form onSubmit={save} className="space-y-3">
      <div className="space-y-1"><Label htmlFor="location-name">{t('Назва')}</Label><Input id="location-name" required disabled={busy} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
      <div className="space-y-1"><Label htmlFor="location-code">{t('Код для сканування (необов’язково)')}</Label><Input id="location-code" required={false} disabled={busy} value={form.qr_code} onChange={e => setForm(p => ({ ...p, qr_code: e.target.value }))} /></div>
      <div className="space-y-1"><Label htmlFor="location-notes">{t('Нотатки')}</Label><Textarea id="location-notes" disabled={busy} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy || !form.name.trim()}>{busy ? t('Збереження...') : t('Зберегти')}</Button>
    </form>
  </DialogContent></Dialog>
}
