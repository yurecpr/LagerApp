'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import pb from '@/lib/pocketbase'
import { saveMovement, errorMessage } from '@/lib/movements'
import { useAuth } from '@/components/AuthProvider'
import { ArrowLeft, Camera, X, MapPin, Search } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'

type Location = { id: string; name: string }

const FIELD = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><Label className="text-sm text-muted-foreground">{label}</Label><div className="mt-1">{children}</div></div>
)

export default function NewPartPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const createdPart = useRef<string | null>(null)
  const [form, setForm] = useState({
    name: '', article: '', part_type: '', category: 'radio', value: '',
    package: '', manufacturer: '', barcode: '', datasheet_url: '',
    unit: 'шт', description: '', notes: '',
  })
  const [photo, setPhoto] = useState<File | null>(null)
  const [minQty, setMinQty] = useState('0')
  const [preview, setPreview] = useState<string | null>(null)
  const [qty, setQty] = useState('1')
  const [locationQuery, setLocationQuery] = useState('')
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showLocations, setShowLocations] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  useEffect(() => {
    if (!locationQuery.trim()) { setLocations([]); return }
    const t = setTimeout(async () => {
      const res = await pb.collection('locations').getList<Location>(1, 10, {
        filter: pb.filter('name ~ {:query}', { query: locationQuery }), sort: 'name', requestKey: null,
      })
      setLocations(res.items)
    }, 300)
    return () => clearTimeout(t)
  }, [locationQuery])

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const save = async () => {
    if (!form.name.trim() || saving) return
    if (selectedLocation && (!qty.trim() || !Number.isFinite(Number(qty)) || Number(qty) < 0)) { setError(t('Вкажіть невід’ємну кількість.')); return }
    if (user?.role === 'admin' && (!minQty.trim() || !Number.isFinite(Number(minQty)) || Number(minQty) < 0)) { setError(t('Поріг «Мало» має бути невід’ємним числом.')); return }
    setSaving(true)
    setError('')
    try {
      const data = new FormData()
      Object.entries(form).forEach(([k, v]) => v && data.append(k, v))
      if (user?.role === 'admin') data.append('min_qty', minQty || '0')
      if (photo) data.append('photo', photo)
      if (!createdPart.current) {
        const part = await pb.collection('parts').create(data)
        createdPart.current = part.id
      }
      if (selectedLocation && Number(qty) > 0) {
        await saveMovement({ type: 'incoming', part_id: createdPart.current, location_id: selectedLocation.id, qty: Number(qty) })
      }
      router.push('/parts')
    } catch (e) { setError(`${createdPart.current ? t('Деталь створено, але початковий прихід не завершено. Повторіть збереження. ') : ''}${t(errorMessage(e))}`) }
    setSaving(false)
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 pt-4">
        <Link href="/parts"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold">{t('Нова деталь')}</h1>
      </div>

      {/* Фото */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
      {preview ? (
        <div className="relative w-28 h-28">
          <img src={preview} alt="" className="w-28 h-28 rounded-xl object-cover" />
          <button onClick={() => { setPhoto(null); setPreview(null) }}
            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5"><X size={14} /></button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 border border-dashed rounded-xl p-4 text-muted-foreground hover:text-foreground w-full transition-colors">
          <Camera size={20} /><span className="text-sm">{t('Додати фото')}</span>
        </button>
      )}

      {/* Основне */}
      <div className="border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('Основне')}</p>
        <FIELD label={t('Назва *')}><Input placeholder={t('Резистор 10кОм')} value={form.name} onChange={set('name')} /></FIELD>
        <FIELD label={t('Тип деталі')}><Input placeholder={t('Резистор / Конденсатор / Блок ABS...')} value={form.part_type} onChange={set('part_type')} /></FIELD>
        <div className="grid grid-cols-2 gap-3">
          <FIELD label={t('Категорія')}>
            <Select value={form.category} onValueChange={v => v && setForm(p => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="radio">{t('Радіодеталі')}</SelectItem>
                <SelectItem value="auto">{t('Автозапчастини')}</SelectItem>
              </SelectContent>
            </Select>
          </FIELD>
          <FIELD label={t('Одиниця')}>
            <Select value={form.unit} onValueChange={v => v && setForm(p => ({ ...p, unit: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['шт','м','кг','г','л','пара'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </FIELD>
        </div>
        <FIELD label={t('Артикул')}><Input placeholder="R-10K-0805" value={form.article} onChange={set('article')} /></FIELD>
      </div>

      {/* Технічні */}
      <div className="border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('Технічні параметри')}</p>
        <div className="grid grid-cols-2 gap-3">
          <FIELD label={t('Номінал/Значення')}><Input placeholder="10кОм, 100нФ..." value={form.value} onChange={set('value')} /></FIELD>
          <FIELD label={t('Корпус')}><Input placeholder="0805, TO-92..." value={form.package} onChange={set('package')} /></FIELD>
        </div>
        <FIELD label={t('Виробник')}><Input placeholder="Vishay, Samsung..." value={form.manufacturer} onChange={set('manufacturer')} /></FIELD>
        <FIELD label={t('Штрихкод (EAN)')}><Input placeholder="4901234567890" value={form.barcode} onChange={set('barcode')} /></FIELD>
        <FIELD label="Datasheet URL"><Input placeholder="https://..." value={form.datasheet_url} onChange={set('datasheet_url')} /></FIELD>
      </div>

      {/* Розміщення */}
      <div className="border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><MapPin size={12} />{t('Розміщення')}</p>
        {selectedLocation ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 font-mono text-sm">{selectedLocation.name}</div>
            <button onClick={() => { setSelectedLocation(null); setLocationQuery('') }}><X size={16} className="text-muted-foreground" /></button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input className="pl-8" placeholder={t('Назва комірки (A-1-1)...')} value={locationQuery}
              onChange={e => { setLocationQuery(e.target.value); setShowLocations(true) }} />
            {showLocations && locationQuery.trim() && (
              <div className="absolute z-10 w-full mt-1 bg-card border rounded-xl shadow-lg overflow-hidden">
                {locations.map(loc => (
                  <button key={loc.id} className="w-full text-left px-4 py-2.5 font-mono text-sm hover:bg-accent transition-colors"
                    onClick={() => { setSelectedLocation(loc); setShowLocations(false); setLocationQuery('') }}>
                    {loc.name}
                  </button>
                ))}
                {locationQuery.trim() && !locations.find(l => l.name === locationQuery.trim()) && (
                  <button className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-accent transition-colors border-t"
                    onClick={async () => {
                      const newLoc = await pb.collection('locations').create({ name: locationQuery.trim() })
                      setSelectedLocation(newLoc as unknown as Location)
                      setShowLocations(false)
                      setLocationQuery('')
                    }}>
                    {t('+ Створити комірку «{name}»', { name: locationQuery.trim() })}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <FIELD label={t('Початкова кількість')}>
          <Input type="number" min="0" step="any" value={qty} onChange={e => setQty(e.target.value)} className="text-center font-bold" />
        </FIELD>
      </div>

      {/* Нотатки */}
      <div className="border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('Додатково')}</p>
        <FIELD label={t('Опис')}><Textarea placeholder={t('Опис деталі...')} value={form.description} onChange={set('description')} /></FIELD>
        <FIELD label={t('Нотатки')}><Textarea placeholder={t('Нотатки...')} value={form.notes} onChange={set('notes')} /></FIELD>
        {user?.role === 'admin' && <FIELD label={t('Поріг «Мало» ({unit})', { unit: form.unit })}><Input type="number" min="0" step="any" value={minQty} onChange={e => setMinQty(e.target.value)} /><p className="text-xs text-muted-foreground mt-1">{t('0 — не контролювати малий залишок')}</p></FIELD>}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full h-12 text-base" onClick={save} disabled={saving || !form.name.trim()}>
        {saving ? t('Збереження...') : t('Зберегти деталь')}
      </Button>
    </div>
  )
}
