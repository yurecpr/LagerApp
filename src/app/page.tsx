'use client'
import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Package, MapPin, ScanLine } from 'lucide-react'
import pb from '@/lib/pocketbase'
import Link from 'next/link'

type Part = { id: string; name: string; article: string; category: string }
type Inventory = { id: string; expand: { part_id: Part; location_id: { name: string } }; qty: number }

export default function HomePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await pb.collection('inventory').getList<Inventory>(1, 30, {
        filter: `part_id.name ~ "${q}" || part_id.article ~ "${q}"`,
        expand: 'part_id,location_id',
        sort: 'part_id.name',
        requestKey: null,
      })
      setResults(res.items)
    } catch { setResults([]) }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <h1 className="text-2xl font-bold mb-1">🏭 LagerApp</h1>
        <p className="text-muted-foreground text-sm">Складський облік</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          className="pl-10 h-12 text-base"
          placeholder="Пошук за назвою або артикулом..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {loading && <p className="text-center text-muted-foreground text-sm">Пошук...</p>}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(inv => (
            <Link key={inv.id} href={`/parts/${inv.expand?.part_id?.id}`}>
              <div className="border rounded-xl p-4 flex items-center gap-3 hover:bg-accent transition-colors">
                <Package size={20} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{inv.expand?.part_id?.name}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin size={12} />
                    <span className="truncate">{inv.expand?.location_id?.name}</span>
                  </div>
                  {inv.expand?.part_id?.article && (
                    <div className="text-xs text-muted-foreground">{inv.expand.part_id.article}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-bold">{inv.qty}</span>
                  <div className="text-xs text-muted-foreground">шт</div>
                </div>
                <Badge variant={inv.expand?.part_id?.category === 'radio' ? 'default' : 'secondary'} className="text-xs">
                  {inv.expand?.part_id?.category === 'radio' ? 'Радіо' : 'Авто'}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}

      {query && !loading && results.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Нічого не знайдено</p>
      )}

      {!query && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link href="/parts/new">
            <div className="border rounded-xl p-4 text-center hover:bg-accent transition-colors">
              <Package size={28} className="mx-auto mb-2 text-primary" />
              <div className="font-medium text-sm">Нова деталь</div>
            </div>
          </Link>
          <Link href="/scan">
            <div className="border rounded-xl p-4 text-center hover:bg-accent transition-colors">
              <ScanLine size={28} className="mx-auto mb-2 text-primary" />
              <div className="font-medium text-sm">Сканувати QR</div>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
