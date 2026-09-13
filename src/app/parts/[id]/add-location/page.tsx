'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Search } from 'lucide-react'
import pb from '@/lib/pocketbase'
import { saveMovement, errorMessage } from '@/lib/movements'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'

type Location = { id: string; name: string }

export default function AddLocationPage() {
  const { t } = useLanguage()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Location | null>(null)
  const [qty, setQty] = useState('1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(async () => {
      const filter = query ? pb.filter('name ~ {:query}', { query }) : ''
      const res = await pb.collection('locations').getList<Location>(1, 20, { filter, sort: 'name', requestKey: null })
      setLocations(res.items)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const save = async () => {
    if (!selected || saving) return
    if (!qty.trim() || !Number.isFinite(Number(qty)) || Number(qty) <= 0) { setError(t('Кількість має бути більшою за нуль.')); return }
    setSaving(true)
    setError('')
    try {
      await saveMovement({
        type: 'incoming', part_id: id, location_id: selected.id, qty: Number(qty),
      })
      router.push(`/parts/${id}`)
    } catch (e) { setError(t(errorMessage(e))) }
    setSaving(false)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 pt-4">
        <Link href={`/parts/${id}`}><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold">{t('Додати до комірки')}</h1>
      </div>

      {!selected ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input className="pl-9" placeholder={t('Пошук комірки...')} value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            {locations.map(loc => (
              <button key={loc.id} onClick={() => setSelected(loc)}
                className="w-full text-left border rounded-xl p-4 font-mono hover:bg-accent transition-colors">
                {loc.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-xl p-4 bg-accent">
            <div className="text-sm text-muted-foreground">{t('Комірка')}</div>
            <div className="font-mono font-bold text-lg">{selected.name}</div>
            <button onClick={() => setSelected(null)} className="text-xs text-primary mt-1">{t('Змінити')}</button>
          </div>
          <div>
            <Label>{t('Кількість')}</Label>
            <Input type="number" min="0" step="any" disabled={saving} value={qty} onChange={e => setQty(e.target.value)} className="text-lg h-12 text-center" />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button className="w-full h-12 text-base" onClick={save} disabled={saving}>
            {saving ? t('Збереження...') : t('Додати {qty} {unit} → {name}', { qty, unit: 'шт', name: selected.name })}
          </Button>
        </div>
      )}
    </div>
  )
}
