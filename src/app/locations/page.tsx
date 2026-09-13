'use client'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { MapPin, Search, ChevronRight } from 'lucide-react'
import pb from '@/lib/pocketbase'
import Link from 'next/link'
import LocationDialog from '@/components/LocationDialog'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n'

type Location = { id: string; name: string }

export default function LocationsPage() {
  const { t } = useLanguage()
  const [locations, setLocations] = useState<Location[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const filter = query ? pb.filter('name ~ {:query}', { query }) : ''
        const res = await pb.collection('locations').getList<Location>(1, 100, { filter, sort: 'name' })
        setLocations(res.items)
      } catch { setLocations([]) }
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query, revision])

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center pt-4"><h1 className="text-xl font-bold">{t('Комірки')}</h1><Button size="sm" onClick={() => setCreating(true)}>{t('Нова комірка')}</Button></div>
      {creating && <LocationDialog onClose={() => setCreating(false)} onDone={() => setRevision(n => n + 1)} />}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input className="pl-9" placeholder={t('Пошук комірки...')} value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">{t('Завантаження...')}</p>
      ) : locations.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t('Комірок немає')}</p>
      ) : (
        <div className="space-y-1">
          {locations.map(loc => (
            <Link key={loc.id} href={`/locations/${loc.id}`}>
              <div className="border rounded-xl p-4 flex items-center gap-3 hover:bg-accent transition-colors">
                <MapPin size={18} className="text-primary shrink-0" />
                <span className="flex-1 font-mono">{loc.name}</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
