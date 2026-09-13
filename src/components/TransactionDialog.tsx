'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowDownCircle, ArrowUpCircle, Plus, Minus } from 'lucide-react'
import { saveMovement, errorMessage } from '@/lib/movements'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/lib/i18n'

type Props = {
  open: boolean
  onClose: () => void
  onDone: () => void
  type: 'incoming' | 'outgoing' | 'adjustment'
  partId: string
  locationId: string
  locationName: string
  currentQty: number
  inventoryId: string
  unit?: string
}

export default function TransactionDialog({ open, onClose, onDone, type, partId, locationId, locationName, currentQty, inventoryId, unit = 'шт' }: Props) {
  const { t } = useLanguage()
  const [qty, setQty] = useState(type === 'adjustment' ? String(currentQty) : '1')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const adjustment = type === 'adjustment'
  const isIncoming = type === 'incoming'

  const save = async () => {
    if (saving) return
    const n = Number(qty)
    if (!qty.trim() || !Number.isFinite(n) || (adjustment ? n < 0 : n <= 0)) { setError(t('Вкажіть коректну кількість')); return }
    if (adjustment && !notes.trim()) { setError(t('Вкажіть причину коригування')); return }
    setSaving(true)
    try {
      await saveMovement({
        type, part_id: partId, location_id: locationId, qty: n, notes,
      })
      setQty('1'); setNotes(''); setError('')
      onDone()
      onClose()
    } catch (e) {
      setError(t(errorMessage(e)))
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={next => { if (!next && !saving) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isIncoming ? 'text-green-500' : 'text-red-500'}`}>
            {isIncoming ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
            {adjustment ? t('Коригування залишку') : isIncoming ? t('Прихід') : t('Витрата')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-accent rounded-lg px-4 py-3">
            <div className="text-xs text-muted-foreground">{t('Комірка')}</div>
            <div className="font-mono font-bold">{locationName}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('Поточний залишок:')} <span className="font-bold text-foreground">{currentQty} {unit}</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">{adjustment ? t('Фактичний залишок') : isIncoming ? t('Кількість (прихід)') : t('Кількість (витрата)')}</p>
            <div className="flex items-center gap-3">
              <Button disabled={saving} type="button" variant="outline" size="icon" className="h-12 w-12 text-xl shrink-0"
                onClick={() => { const n = Math.max(1, Number(qty) - 1); setQty(String(n)); setError('') }}>
                <Minus size={18} />
              </Button>
              <Input aria-label={t('Кількість')} type="number" min="0" step="any" disabled={saving} value={qty} onChange={e => setQty(e.target.value)} className="flex-1 text-center text-2xl font-bold h-12" />
              <Button disabled={saving} type="button" variant="outline" size="icon" className="h-12 w-12 text-xl shrink-0"
                onClick={() => { const n = Number(qty) + 1; if (type === 'outgoing' && n > currentQty) return; setQty(String(n)); setError('') }}>
                <Plus size={18} />
              </Button>
            </div>
            {type === 'outgoing' && (
              <p className="text-xs text-muted-foreground mt-2 text-center">{t('Залишиться: {qty} {unit}', { qty: Math.max(0, currentQty - Number(qty)), unit })}</p>
            )}
            {type === 'incoming' && (
              <p className="text-xs text-muted-foreground mt-2 text-center">{t('Буде: {qty} {unit}', { qty: currentQty + Number(qty), unit })}</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium mb-1">{adjustment ? t('Причина коригування') : t('Нотатка (необов’язково)')}</p>
            <Textarea disabled={saving} maxLength={2000} placeholder={t('Від кого, для чого...')} value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 h-20" />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex gap-2">
            <Button disabled={saving} variant="outline" className="flex-1" onClick={onClose}>{t('Скасувати')}</Button>
            <Button
              className={`flex-1 ${isIncoming ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              onClick={save} disabled={saving}>
              {saving ? '...' : adjustment ? t('Скоригувати') : isIncoming ? t('Прийняти') : t('Видати')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
