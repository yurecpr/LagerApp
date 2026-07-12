'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import pb from '@/lib/pocketbase'

type Props = {
  open: boolean
  onClose: () => void
  onDone: () => void
  type: 'incoming' | 'outgoing'
  partId: string
  locationId: string
  locationName: string
  currentQty: number
  inventoryId: string
}

export default function TransactionDialog({ open, onClose, onDone, type, partId, locationId, locationName, currentQty, inventoryId }: Props) {
  const [qty, setQty] = useState('1')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const maxQty = type === 'outgoing' ? currentQty : 9999
  const isIncoming = type === 'incoming'

  const save = async () => {
    const n = Number(qty)
    if (!n || n <= 0) { setError('Вкажіть кількість > 0'); return }
    if (type === 'outgoing' && n > currentQty) { setError(`Максимум ${currentQty} шт`); return }
    setSaving(true)
    try {
      const newQty = isIncoming ? currentQty + n : currentQty - n
      await pb.collection('inventory').update(inventoryId, { qty: newQty })
      await pb.collection('transactions').create({
        type, part_id: partId, location_id: locationId, qty: n, notes,
      })
      setQty('1'); setNotes(''); setError('')
      onDone()
      onClose()
    } catch (e: any) {
      console.error('Transaction error:', e)
      setError(e?.message || e?.data?.message || 'Помилка збереження')
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isIncoming ? 'text-green-500' : 'text-red-500'}`}>
            {isIncoming ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
            {isIncoming ? 'Приход' : 'Витрата'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-accent rounded-lg px-4 py-3">
            <div className="text-xs text-muted-foreground">Комірка</div>
            <div className="font-mono font-bold">{locationName}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Поточний залишок: <span className="font-bold text-foreground">{currentQty} шт</span>
            </div>
          </div>

          <div>
            <Label>{isIncoming ? 'Кількість (приход)' : 'Кількість (витрата)'}</Label>
            <Input
              type="number" min="1" max={maxQty}
              value={qty}
              onChange={e => { setQty(e.target.value); setError('') }}
              className="text-center text-2xl font-bold h-14 mt-1"
              autoFocus
            />
            {type === 'outgoing' && (
              <p className="text-xs text-muted-foreground mt-1">Залишиться: {Math.max(0, currentQty - Number(qty))} шт</p>
            )}
            {type === 'incoming' && (
              <p className="text-xs text-muted-foreground mt-1">Буде: {currentQty + Number(qty)} шт</p>
            )}
          </div>

          <div>
            <Label>Нотатка (необов'язково)</Label>
            <Textarea placeholder="Від кого, для чого..." value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 h-20" />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Скасувати</Button>
            <Button
              className={`flex-1 ${isIncoming ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              onClick={save} disabled={saving}>
              {saving ? '...' : isIncoming ? 'Прийняти' : 'Видати'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
