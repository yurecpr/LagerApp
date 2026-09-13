'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import pb from '@/lib/pocketbase'
import { ArrowLeft, Camera, X } from 'lucide-react'
import Link from 'next/link'
import PartPhoto from '@/components/PartPhoto'
import { errorMessage } from '@/lib/movements'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/lib/i18n'

type Part = {
  id: string; name: string; article: string; part_type: string; category: string
  value: string; package: string; manufacturer: string; barcode: string
  datasheet_url: string; unit: string; description: string; notes: string
  photo: string; collectionId: string; min_qty: number
}

const FIELD = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><Label className="text-sm text-muted-foreground">{label}</Label><div className="mt-1">{children}</div></div>
)

export default function EditPartPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [part, setPart] = useState<Part | null>(null)
  const [form, setForm] = useState({
    name: '', article: '', part_type: '', category: 'radio', value: '',
    package: '', manufacturer: '', barcode: '', datasheet_url: '',
    unit: 'шт', description: '', notes: '',
  })
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [minQty, setMinQty] = useState('0')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    pb.collection('parts').getOne<Part>(id, { requestKey: null }).then(p => {
      setPart(p)
      setForm({
        name: p.name || '', article: p.article || '', part_type: p.part_type || '',
        category: p.category || 'radio', value: p.value || '', package: p.package || '',
        manufacturer: p.manufacturer || '', barcode: p.barcode || '',
        datasheet_url: p.datasheet_url || '', unit: p.unit || 'шт',
        description: p.description || '', notes: p.notes || '',
      })
      setMinQty(String(p.min_qty || 0))
    }).catch(() => router.push('/parts'))
  }, [id, router])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNewPhoto(file)
    setPreview(URL.createObjectURL(file))
    setRemovePhoto(false)
  }

  const save = async () => {
    if (!form.name.trim()) return
    if (user?.role === 'admin' && (!minQty.trim() || !Number.isFinite(Number(minQty)) || Number(minQty) < 0)) { setError(t('Поріг «Мало» має бути невід’ємним числом.')); return }
    setSaving(true)
    try {
      const data = new FormData()
      Object.entries(form).forEach(([k, v]) => data.append(k, v))
      if (user?.role === 'admin') data.append('min_qty', minQty || '0')
      if (newPhoto) data.append('photo', newPhoto)
      if (removePhoto) data.append('photo', '')
      await pb.collection('parts').update(id, data)
      router.push(`/parts/${id}`)
    } catch (e) { setError(t(errorMessage(e))) }
    setSaving(false)
  }

  if (!part) return <div className="p-4 pt-8 text-center text-muted-foreground">{t('Завантаження...')}</div>

  const hasCurrentPhoto = !!part.photo && !removePhoto

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 pt-4">
        <Link href={`/parts/${id}`}><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold">{t('Редагування')}</h1>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
      {preview || hasCurrentPhoto ? (
        <div className="relative w-28 h-28">
          {preview ? <img src={preview} alt="" className="w-28 h-28 rounded-xl object-cover" /> : <PartPhoto part={part} className="w-28 h-28 rounded-xl object-cover" />}
          <button onClick={() => { setNewPhoto(null); setPreview(null); setRemovePhoto(true) }}
            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5"><X size={14} /></button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 border border-dashed rounded-xl p-4 text-muted-foreground hover:text-foreground w-full transition-colors">
          <Camera size={20} /><span className="text-sm">{t('Додати фото')}</span>
        </button>
      )}

      <div className="border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('Основне')}</p>
        <FIELD label={t('Назва *')}><Input value={form.name} onChange={set('name')} /></FIELD>
        <FIELD label={t('Тип деталі')}><Input placeholder={t('Резистор / Датчик / Блок ABS...')} value={form.part_type} onChange={set('part_type')} /></FIELD>
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
        <FIELD label={t('Артикул')}><Input value={form.article} onChange={set('article')} /></FIELD>
      </div>

      <div className="border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('Технічні параметри')}</p>
        <div className="grid grid-cols-2 gap-3">
          <FIELD label={t('Номінал/Значення')}><Input placeholder="10кОм, 100нФ..." value={form.value} onChange={set('value')} /></FIELD>
          <FIELD label={t('Корпус')}><Input placeholder="0805, TO-92..." value={form.package} onChange={set('package')} /></FIELD>
        </div>
        <FIELD label={t('Виробник')}><Input value={form.manufacturer} onChange={set('manufacturer')} /></FIELD>
        <FIELD label={t('Штрихкод (EAN)')}><Input value={form.barcode} onChange={set('barcode')} /></FIELD>
        <FIELD label="Datasheet URL"><Input placeholder="https://..." value={form.datasheet_url} onChange={set('datasheet_url')} /></FIELD>
      </div>

      <div className="border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('Додатково')}</p>
        <FIELD label={t('Опис')}><Textarea value={form.description} onChange={set('description')} /></FIELD>
        <FIELD label={t('Нотатки')}><Textarea value={form.notes} onChange={set('notes')} /></FIELD>
        {user?.role === 'admin' && <FIELD label={t('Поріг «Мало» ({unit})', { unit: form.unit })}><Input type="number" min="0" step="any" value={minQty} onChange={e => setMinQty(e.target.value)} /><p className="text-xs text-muted-foreground mt-1">{t('0 — не контролювати малий залишок')}</p></FIELD>}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full h-12 text-base" onClick={save} disabled={saving || !form.name.trim()}>
        {saving ? t('Збереження...') : t('Зберегти зміни')}
      </Button>
    </div>
  )
}
