'use client'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Package, MapPin } from 'lucide-react'
import pb from '@/lib/pocketbase'
import Link from 'next/link'

type Part = { id: string; name: string; article: string; category: string; photo: string; collectionId: string }
type Inventory = { id: string; part_id: string; qty: number; expand: { location_id: { name: string } } }

export default function PartsPage() {
  const [parts, setParts] = useState<Part[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    pb.collection('inventory').getList<Inventory>(1, 500, {
      expand: 'location_id', requestKey: null,
    }).then(r => setInventory(r.items))
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const filter = query ? `name ~ "${query}" || article ~ "${query}"` : ''
        const res = await pb.collection('parts').getList<Part>(1, 50, { filter, sort: 'name', requestKey: null })
        setParts(res.items)
      } catch { setParts([]) }
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const getQty = (partId: string) => inventory.filter(i => i.part_id === partId).reduce((s, i) => s + i.qty, 0)
  const getCell = (partId: string) => inventory.find(i => i.part_id === partId)?.expand?.location_id?.name

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-4">
        <h1 className="text-xl font-bold">Деталі</h1>
        <Link href="/parts/new">
          <Button size="sm"><Plus size={16} className="mr-1" />Нова</Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input className="pl-9" placeholder="Пошук..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Завантаження...</p>
      ) : parts.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Деталей немає</p>
      ) : (
        <div className="space-y-2">
          {parts.map(part => {
            const qty = getQty(part.id)
            const cell = getCell(part.id)
            const photoUrl = part.photo
              ? `${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/${part.collectionId}/${part.id}/${part.photo}?thumb=80x80`
              : null
            return (
              <Link key={part.id} href={`/parts/${part.id}`}>
                <div className="border rounded-xl p-3 flex items-center gap-3 hover:bg-accent transition-colors">
                  {photoUrl ? (
                    <img src={photoUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Package size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{part.name}</div>
                    {part.article && <div className="text-xs text-muted-foreground font-mono">{part.article}</div>}
                    {cell && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin size={10} /><span className="font-mono truncate">{cell}</span>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xl font-bold text-primary">{qty}</div>
                    <div className="text-xs text-muted-foreground">шт</div>
                  </div>
                  <Badge variant={part.category === 'radio' ? 'default' : 'secondary'} className="text-xs shrink-0">
                    {part.category === 'radio' ? 'Р' : 'А'}
                  </Badge>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
