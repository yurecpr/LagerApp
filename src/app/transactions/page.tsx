'use client'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import pb from '@/lib/pocketbase'

type Tx = { id: string; type: string; qty: number; created: string; expand: { part_id: { name: string }; location_id: { name: string } } }

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    pb.collection('transactions').getList<Tx>(1, 50, {
      expand: 'part_id,location_id',
      requestKey: null,
    }).then(r => { setTxs(r.items); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold pt-4">Рухи товару</h1>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Завантаження...</p>
      ) : txs.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Рухів немає</p>
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
                <div className="text-xs text-muted-foreground">{new Date(tx.created.replace(' ','T')).toLocaleString('uk-UA')}</div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-lg font-bold ${tx.type === 'incoming' ? 'text-green-500' : 'text-red-500'}`}>
                  {tx.type === 'incoming' ? '+' : '-'}{tx.qty}
                </span>
                <div className="text-xs text-muted-foreground">шт</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
