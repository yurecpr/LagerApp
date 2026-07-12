'use client'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, AlertTriangle, Download } from 'lucide-react'
import pb from '@/lib/pocketbase'

type Inventory = {
  id: string; qty: number; min_qty: number
  expand: { part_id: { id: string; name: string; article: string; category: string }; location_id: { name: string } }
}

export default function ReportsPage() {
  const [items, setItems] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'low'>('all')

  useEffect(() => {
    pb.collection('inventory').getList<Inventory>(1, 500, {
      expand: 'part_id,location_id',
      sort: 'part_id.name',
      requestKey: null,
    }).then(r => { setItems(r.items); setLoading(false) })
  }, [])

  const exportCSV = () => {
    const rows = [['Деталь', 'Артикул', 'Категорія', 'Комірка', 'Кількість']]
    filtered.forEach(i => {
      rows.push([
        i.expand?.part_id?.name || '',
        i.expand?.part_id?.article || '',
        i.expand?.part_id?.category === 'radio' ? 'Радіодеталі' : 'Автозапчастини',
        i.expand?.location_id?.name || '',
        String(i.qty),
      ])
    })
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `zalishky_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const filtered = filter === 'low' ? items.filter(i => i.min_qty > 0 && i.qty <= i.min_qty) : items
  const totalParts = new Set(items.map(i => i.expand?.part_id?.id)).size
  const lowStock = items.filter(i => i.min_qty > 0 && i.qty <= i.min_qty).length

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-4">
        <h1 className="text-xl font-bold">Залишки</h1>
        <Button size="sm" variant="outline" onClick={exportCSV}><Download size={14} className="mr-1" />CSV</Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold">{totalParts}</div>
          <div className="text-xs text-muted-foreground">Деталей</div>
        </div>
        <div className="border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold">{items.reduce((s, i) => s + i.qty, 0)}</div>
          <div className="text-xs text-muted-foreground">Всього шт</div>
        </div>
        <div className={`border rounded-xl p-3 text-center ${lowStock > 0 ? 'border-orange-500' : ''}`}>
          <div className={`text-2xl font-bold ${lowStock > 0 ? 'text-orange-500' : ''}`}>{lowStock}</div>
          <div className="text-xs text-muted-foreground">Мало</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Всі</Button>
        <Button size="sm" variant={filter === 'low' ? 'destructive' : 'outline'} onClick={() => setFilter('low')}>
          <AlertTriangle size={14} className="mr-1" />Мало
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Завантаження...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Нічого немає</p>
      ) : (
        <div className="space-y-1">
          {filtered.map(inv => (
            <div key={inv.id} className={`border rounded-xl p-3 flex items-center gap-3 ${inv.min_qty > 0 && inv.qty <= inv.min_qty ? 'border-orange-500/50' : ''}`}>
              <Package size={16} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{inv.expand?.part_id?.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{inv.expand?.location_id?.name}</div>
              </div>
              <Badge variant={inv.expand?.part_id?.category === 'radio' ? 'default' : 'secondary'} className="text-xs shrink-0">
                {inv.expand?.part_id?.category === 'radio' ? 'Р' : 'А'}
              </Badge>
              <div className="text-right shrink-0">
                <span className={`font-bold ${inv.min_qty > 0 && inv.qty <= inv.min_qty ? 'text-orange-500' : ''}`}>{inv.qty}</span>
                <div className="text-xs text-muted-foreground">шт</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
