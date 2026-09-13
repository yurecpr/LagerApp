'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import pb from '@/lib/pocketbase'
import { useLanguage } from '@/lib/i18n'

type Tx = { id: string; type: string; qty: number; date: string; actor_name: string; notes: string; expand: { part_id: { name: string; unit: string }; location_id: { name: string } } }

export default function TransactionsPage() {
  const { t, locale } = useLanguage()
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    pb.collection('transactions').getList<Tx>(page, 50, {
      sort: '-date,-id',
      expand: 'part_id,location_id',
      requestKey: null,
    }).then(r => { setTxs(r.items); setPages(r.totalPages); setLoading(false) }).catch(() => { setError(t('Не вдалося завантажити журнал.')); setLoading(false) })
  }, [page])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold pt-4">{t('Рухи товару')}</h1>
      {error && <p role="alert" className="text-destructive">{error}</p>}

      {loading ? (
        <p className="text-center text-muted-foreground py-8">{t('Завантаження...')}</p>
      ) : txs.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t('Рухів немає')}</p>
      ) : (
        <div className="space-y-2">
          {txs.map(tx => (
            <div key={tx.id} className="border rounded-xl p-4 flex items-center gap-3">
              {tx.type === 'incoming'
                ? <ArrowDownCircle size={20} className="text-green-500 shrink-0" />
                : <ArrowUpCircle size={20} className="text-red-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{tx.expand?.part_id?.name}</div>
                <div className="text-xs text-muted-foreground truncate">{tx.expand?.location_id?.name}</div>
                <div className="text-xs text-muted-foreground">{tx.date ? new Date(tx.date.replace(' ','T')).toLocaleString(locale) : '—'}</div>
                <div className="text-xs text-muted-foreground">{tx.actor_name || t('До впровадження облікових записів')}</div>
                {tx.notes && <div className="text-xs text-muted-foreground">{tx.notes}</div>}
                {tx.type === 'adjustment' && <div className="text-xs">{t('Коригування залишку')}</div>}
              </div>
              <div className="text-right shrink-0">
                <span className={`text-lg font-bold ${tx.type === 'incoming' ? 'text-green-500' : 'text-red-500'}`}>
                  {tx.type === 'adjustment' ? '= ' : tx.type === 'incoming' ? '+' : '-'}{tx.qty}
                </span>
                <div className="text-xs text-muted-foreground">{tx.expand?.part_id?.unit || 'шт'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between"><Button variant="outline" disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}>{t('Назад')}</Button><span>{page} / {Math.max(1, pages)}</span><Button variant="outline" disabled={loading || page >= pages} onClick={() => setPage(p => p + 1)}>{t('Далі')}</Button></div>
    </div>
  )
}
