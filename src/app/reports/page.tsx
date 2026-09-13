'use client'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, AlertTriangle, Download } from 'lucide-react'
import pb from '@/lib/pocketbase'
import { useLanguage } from '@/lib/i18n'

type Part = { id: string; name: string; article: string; category: string; unit: string; min_qty: number }
type Inventory = { id: string; part_id: string; qty: number; expand?: { location_id?: { name: string } } }
type ReportItem = Part & { qty: number; locations: string[]; low: boolean }

function csvCell(value: string | number) {
  const text = String(value)
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export default function ReportsPage() {
  const { t } = useLanguage()
  const [parts, setParts] = useState<Part[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'low'>('all')

  useEffect(() => {
    let active = true
    Promise.all([
      pb.collection('parts').getFullList<Part>({ sort: 'name', requestKey: null }),
      pb.collection('inventory').getFullList<Inventory>({ expand: 'location_id', requestKey: null }),
    ]).then(([loadedParts, loadedInventory]) => {
      if (active) { setParts(loadedParts); setInventory(loadedInventory) }
    }).catch(() => { if (active) setError(t('Не вдалося завантажити звіт.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [t])

  const items = useMemo<ReportItem[]>(() => parts.map(part => {
    const stock = inventory.filter(row => row.part_id === part.id)
    const qty = stock.reduce((sum, row) => sum + row.qty, 0)
    return {
      ...part,
      qty,
      locations: stock.map(row => row.expand?.location_id?.name).filter((name): name is string => !!name),
      low: part.min_qty > 0 && qty <= part.min_qty,
    }
  }), [parts, inventory])
  const filtered = filter === 'low' ? items.filter(item => item.low) : items
  const lowStock = items.filter(item => item.low).length

  const exportCSV = () => {
    const rows: (string | number)[][] = [[t('Деталь'), t('Артикул'), t('Категорія'), t('Комірки'), t('Кількість'), t('Одиниця'), t('Поріг мало')]]
    filtered.forEach(item => rows.push([item.name, item.article || '', item.category === 'radio' ? t('Радіодеталі') : t('Автозапчастини'), item.locations.join(', '), item.qty, item.unit || 'шт', item.min_qty || 0]))
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `zalishky_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-4">
        <h1 className="text-xl font-bold">{t('Залишки')}</h1>
        <Button size="sm" variant="outline" onClick={exportCSV} disabled={loading}><Download size={14} className="mr-1" />CSV</Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{items.length}</div><div className="text-xs text-muted-foreground">{t('Деталей')}</div></div>
        <div className="border rounded-xl p-3 text-center"><div className="text-2xl font-bold">{inventory.reduce((sum, row) => sum + row.qty, 0)}</div><div className="text-xs text-muted-foreground">{t('Залишок')}</div></div>
        <div className={`border rounded-xl p-3 text-center ${lowStock ? 'border-orange-500' : ''}`}><div className={`text-2xl font-bold ${lowStock ? 'text-orange-500' : ''}`}>{lowStock}</div><div className="text-xs text-muted-foreground">{t('Мало')}</div></div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>{t('Всі')}</Button>
        <Button size="sm" variant={filter === 'low' ? 'destructive' : 'outline'} onClick={() => setFilter('low')}><AlertTriangle size={14} className="mr-1" />{t('Мало')}</Button>
      </div>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">{t('Завантаження...')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t('Нічого немає')}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className={`border rounded-xl p-3 flex items-center gap-3 ${item.low ? 'border-orange-500/60' : ''}`}>
              <Package size={16} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{item.name}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">{item.locations.join(', ') || t('Без комірки')}</div>
                {item.min_qty > 0 && <div className="text-xs text-muted-foreground">{t('Мало при ≤ {qty} {unit}', { qty: item.min_qty, unit: item.unit || 'шт' })}</div>}
              </div>
              <Badge variant={item.category === 'radio' ? 'default' : 'secondary'} className="text-xs shrink-0">{item.category === 'radio' ? 'Р' : 'А'}</Badge>
              <div className="text-right shrink-0"><span className={`font-bold ${item.low ? 'text-orange-500' : ''}`}>{item.qty}</span><div className="text-xs text-muted-foreground">{item.unit || 'шт'}</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
