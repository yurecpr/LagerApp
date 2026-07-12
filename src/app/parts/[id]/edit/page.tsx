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

type Part = {
  id: string; name: string; article: string; part_type: string; category: string
  value: string; package: string; manufacturer: string; barcode: string
  datasheet_url: string; unit: string; description: string; notes: string
  photo: string; collectionId: string
}

const FIELD = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><Label className="text-sm text-muted-foreground">{label}</Label><div className="mt-1">{children}</div></div>
)

export default function EditPartPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [part, setPart] = useState<Part | null>(null)
  const [form, setForm] = useState({
    name: '', article: '', part_type: '', category: 'radio', value: '',
    package: '', manufacturer: '', barcode: '', datasheet_url: '',
    unit: 'шт', description: '', notes: '',
  })
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
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
    setSaving(true)
    try {
      const data = new FormData()
      Object.entries(form).forEach(([k, v]) => data.append(k, v))
      if (newPhoto) data.append('photo', newPhoto)
      if (removePhoto) data.append('photo', '')
      await pb.collection('parts').update(id, data)
      router.push(`/parts/${id}`)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  if (!part) return <div className="p-4 pt-8 text-center text-muted-foreground">Завантаження...</div>

  const currentPhotoUrl = part.photo && !removePhoto
    ? `${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/${part.collectionId}/${part.id}/${part.photo}`
    : null

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 pt-4">
        <Link href={`/parts/${id}`}><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold">Редагування</h1>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
      {preview || currentPhotoUrl ? (
        <div className="relative w-28 h-28">
          <img src={preview || currentPhotoUrl!} alt="" className="w-28 h-28 rounded-xl object-cover" />
          <button onClick={() => { setNewPhoto(null); setPreview(null); setRemovePhoto(true) }}
            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5"><X size={14} /></button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 border border-dashed rounded-xl p-4 text-muted-foreground hover:text-foreground w-full transition-colors">
          <Camera size={20} /><span className="text-sm">Додати фото</span>
        </button>
      )}

      <div className="border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Основне</p>
        <FIELD label="Назва *"><Input value={form.name} onChange={set('name')} /></FIELD>
        <FIELD label="Тип деталі"><Input placeholder="Резистор / Датчик / Блок ABS..." value={form.part_type} onChange={set('part_type')} /></FIELD>
        <div className="grid grid-cols-2 gap-3">
          <FIELD label="Категорія">
            <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="radio">Радіодеталі</SelectItem>
                <SelectItem value="auto">Автозапчастини</SelectItem>
              </SelectContent>
            </Select>
          </FIELD>
          <FIELD label="Одиниця">
            <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['шт','м','кг','г','л','пара'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </FIELD>
        </div>
        <FIELD label="Артикул"><Input value={form.article} onChange={set('article')} /></FIELD>
      </div>

      <div className="border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Технічні параметри</p>
        <div className="grid grid-cols-2 gap-3">
          <FIELD label="Номінал/Значення"><Input placeholder="10кОм, 100нФ..." value={form.value} onChange={set('value')} /></FIELD>
          <FIELD label="Корпус"><Input placeholder="0805, TO-92..." value={form.package} onChange={set('package')} /></FIELD>
        </div>
        <FIELD label="Виробник"><Input value={form.manufacturer} onChange={set('manufacturer')} /></FIELD>
        <FIELD label="Штрихкод (EAN)"><Input value={form.barcode} onChange={set('barcode')} /></FIELD>
        <FIELD label="Datasheet URL"><Input placeholder="https://..." value={form.datasheet_url} onChange={set('datasheet_url')} /></FIELD>
      </div>

      <div className="border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Додатково</p>
        <FIELD label="Опис"><Textarea value={form.description} onChange={set('description')} /></FIELD>
        <FIELD label="Нотатки"><Textarea value={form.notes} onChange={set('notes')} /></FIELD>
      </div>

      <Button className="w-full h-12 text-base" onClick={save} disabled={saving || !form.name.trim()}>
        {saving ? 'Збереження...' : 'Зберегти зміни'}
      </Button>
    </div>
  )
}
