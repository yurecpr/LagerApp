'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Plus, Package, ArrowDownCircle, ArrowUpCircle, ExternalLink, Pencil } from 'lucide-react'
import pb from '@/lib/pocketbase'
import Link from 'next/link'
import TransactionDialog from '@/components/TransactionDialog'

type Part = {
  id: string; name: string; article: string; category: string
  part_type: string; value: string; package: string; manufacturer: string
  barcode: string; datasheet_url: string; unit: string
  description: string; notes: string; photo: string; collectionId: string
}
type Inventory = { id: string; qty: number; expand: { location_id: { id: string; name: string } } }
type Tx = { id: string; type: string; qty: number; date: string; notes: string; expand: { location_id: { name: string } } }
type DialogState = { type: 'incoming' | 'outgoing'; invId: string; locId: string; locName: string; currentQty: number } | null

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [part, setPart] = useState<Part | null>(null)
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [txs, setTxs] = useState<Tx[]>([])
  const [dialog, setDialog] = useState<DialogState>(null)

  const load = useCallback(async () => {
    pb.collection('parts').getOne<Part>(id, { requestKey: null }).then(setPart).catch(() => router.push('/parts'))
    pb.collection('inventory').getList<Inventory>(1, 50, {
      filter: `part_id = "${id}"`, expand: 'location_id', requestKey: null,
    }).then(r => setInventory(r.items)).catch(() => {})
    pb.collection('transactions').getList<Tx>(1, 100, {
      filter: `part_id = "${id}"`, expand: 'location_id', requestKey: null,
    }).then(r => setTxs(r.items.reverse())).catch(() => {})
  }, [id, router])

  useEffect(() => { load() }, [load])

  const totalQty = inventory.reduce((s, i) => s + i.qty, 0)
  if (!part) return <div className="p-4 pt-8 text-center text-muted-foreground">Завантаження...</div>

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 pt-4">
        <Link href="/parts"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold flex-1 truncate">{part.name}</h1>
        <Link href={`/parts/${id}/edit`}>
          <Button size="sm" variant="outline"><Pencil size={14} className="mr-1" />Редагувати</Button>
        </Link>
        <Badge variant={part.category === 'radio' ? 'default' : 'secondary'}>
          {part.category === 'radio' ? 'Радіо' : 'Авто'}
        </Badge>
      </div>

      <div className="flex gap-4">
        {part.photo && (
          <img src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/${part.collectionId}/${part.id}/${part.photo}`}
            alt={part.name} className="w-24 h-24 rounded-xl object-cover shrink-0" />
        )}
        <div className="border rounded-xl p-4 text-center flex-1">
          <div className="text-4xl font-bold">{totalQty}</div>
          <div className="text-muted-foreground text-sm">{part.unit || 'шт'} загалом</div>
        </div>
      </div>

      {part.article && <div className="text-sm text-muted-foreground">Артикул: <span className="font-mono text-foreground">{part.article}</span></div>}

      {(part.part_type || part.value || part.package || part.manufacturer || part.barcode) && (
        <div className="border rounded-xl p-4 space-y-2 text-sm">
          {part.part_type && <div className="flex justify-between"><span className="text-muted-foreground">Тип</span><span>{part.part_type}</span></div>}
          {part.value && <div className="flex justify-between"><span className="text-muted-foreground">Номінал</span><span className="font-mono">{part.value}</span></div>}
          {part.package && <div className="flex justify-between"><span className="text-muted-foreground">Корпус</span><span className="font-mono">{part.package}</span></div>}
          {part.manufacturer && <div className="flex justify-between"><span className="text-muted-foreground">Виробник</span><span>{part.manufacturer}</span></div>}
          {part.barcode && <div className="flex justify-between"><span className="text-muted-foreground">Штрихкод</span><span className="font-mono">{part.barcode}</span></div>}
          {part.datasheet_url && (
            <a href={part.datasheet_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              <ExternalLink size={14} />Datasheet
            </a>
          )}
        </div>
      )}

      {(part.description || part.notes) && (
        <div className="border rounded-xl p-4 space-y-2 text-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Додатково</p>
          {part.description && (
            <div>
              <span className="text-muted-foreground text-xs">Опис</span>
              <p className="mt-0.5">{part.description}</p>
            </div>
          )}
          {part.notes && (
            <div>
              <span className="text-muted-foreground text-xs">Нотатки</span>
              <p className="mt-0.5 text-muted-foreground">{part.notes}</p>
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="cells">
        <TabsList className="w-full">
          <TabsTrigger value="cells" className="flex-1">Комірки ({inventory.length})</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">Журнал ({txs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="cells" className="space-y-2 mt-3">
          <Link href={`/parts/${id}/add-location`}>
            <Button className="w-full" variant="outline"><Plus size={16} className="mr-2" />Додати до комірки</Button>
          </Link>
          {inventory.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Не розміщено в комірках</p>
          ) : inventory.map(inv => (
            <div key={inv.id} className="border rounded-xl p-4 flex items-center gap-3">
              <Package size={16} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-mono font-medium">{inv.expand?.location_id?.name}</div>
                <div className="text-sm text-muted-foreground">{inv.qty} {part.unit || 'шт'}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1 text-red-500 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => setDialog({ type: 'outgoing', invId: inv.id, locId: inv.expand?.location_id?.id, locName: inv.expand?.location_id?.name, currentQty: inv.qty })}>
                  <ArrowUpCircle size={14} />Видати
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-green-500 border-green-500/30 hover:bg-green-500/10"
                  onClick={() => setDialog({ type: 'incoming', invId: inv.id, locId: inv.expand?.location_id?.id, locName: inv.expand?.location_id?.name, currentQty: inv.qty })}>
                  <ArrowDownCircle size={14} />Прийняти
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-2 mt-3">
          {txs.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Рухів немає</p>
          ) : txs.map(tx => (
            <div key={tx.id} className="border rounded-xl p-3 flex items-center gap-3">
              {tx.type === 'incoming'
                ? <ArrowDownCircle size={18} className="text-green-500 shrink-0" />
                : <ArrowUpCircle size={18} className="text-red-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-mono text-muted-foreground truncate">{tx.expand?.location_id?.name || '—'}</div>
                {tx.notes && <div className="text-xs text-muted-foreground truncate">{tx.notes}</div>}
                <div className="text-xs text-muted-foreground">{tx.date ? new Date(tx.date.replace(' ', 'T')).toLocaleString('uk-UA') : ''}</div>
              </div>
              <span className={`font-bold text-lg ${tx.type === 'incoming' ? 'text-green-500' : 'text-red-500'}`}>
                {tx.type === 'incoming' ? '+' : '-'}{tx.qty}
              </span>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {dialog && (
        <TransactionDialog
          open={!!dialog}
          onClose={() => setDialog(null)}
          onDone={load}
          type={dialog.type}
          partId={id}
          locationId={dialog.locId}
          locationName={dialog.locName}
          currentQty={dialog.currentQty}
          inventoryId={dialog.invId}
        />
      )}
    </div>
  )
}

