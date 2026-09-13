'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Package, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import pb from '@/lib/pocketbase'
import Link from 'next/link'
import TransactionDialog from '@/components/TransactionDialog'
import LocationDialog from '@/components/LocationDialog'
import DeleteCatalogButton from '@/components/DeleteCatalogButton'
import { useLanguage } from '@/lib/i18n'

type Location = { id: string; name: string; notes: string; qr_code: string }
type Inventory = { id: string; qty: number; expand: { part_id: { id: string; name: string; article: string; category: string; unit: string } } }
type DialogState = { type: 'incoming' | 'outgoing'; invId: string; partId: string; partName: string; currentQty: number } | null

export default function LocationDetailPage() {
  const { t } = useLanguage()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [location, setLocation] = useState<Location | null>(null)
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [dialog, setDialog] = useState<DialogState>(null)
  const [editing, setEditing] = useState(false)

  const load = useCallback(() => {
    pb.collection('locations').getOne<Location>(id, { requestKey: null }).then(setLocation).catch(() => router.push('/locations'))
    pb.collection('inventory').getList<Inventory>(1, 50, {
      filter: `location_id = "${id}"`, expand: 'part_id', requestKey: null,
    }).then(r => setInventory(r.items)).catch(() => {})
  }, [id, router])

  useEffect(() => { load() }, [load])

  if (!location) return <div className="p-4 pt-8 text-center text-muted-foreground">{t('Завантаження...')}</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 pt-4">
        <Link href="/locations"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold font-mono flex-1">{location.name}</h1>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>{t('Редагувати')}</Button>
        <DeleteCatalogButton collection="locations" id={id} name={location.name} />
      </div>

      {location.notes && <p className="text-sm text-muted-foreground">{location.notes}</p>}
      {editing && <LocationDialog location={location} onClose={() => setEditing(false)} onDone={load} />}

      <div>
        <h2 className="font-semibold mb-2 flex items-center gap-2"><Package size={16} />{t('Вміст комірки')}</h2>
        {inventory.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">{t('Комірка порожня')}</p>
        ) : (
          <div className="space-y-2">
            {inventory.map(inv => (
              <div key={inv.id} className="border rounded-xl p-3 flex items-center gap-3">
                <Link href={`/parts/${inv.expand?.part_id?.id}`} className="flex-1 min-w-0">
                  <div className="font-medium truncate">{inv.expand?.part_id?.name}</div>
                  <div className="text-sm text-muted-foreground">{inv.qty} {inv.expand?.part_id?.unit || 'шт'}</div>
                  {inv.expand?.part_id?.article && <div className="text-xs text-muted-foreground font-mono">{inv.expand.part_id.article}</div>}
                </Link>
                <Badge variant={inv.expand?.part_id?.category === 'radio' ? 'default' : 'secondary'} className="text-xs shrink-0">
                  {inv.expand?.part_id?.category === 'radio' ? 'Р' : 'А'}
                </Badge>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="gap-1 text-red-500 border-red-500/30 px-2"
                    onClick={() => setDialog({ type: 'outgoing', invId: inv.id, partId: inv.expand?.part_id?.id, partName: inv.expand?.part_id?.name, currentQty: inv.qty })}>
                    <ArrowUpCircle size={14} />
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-green-500 border-green-500/30 px-2"
                    onClick={() => setDialog({ type: 'incoming', invId: inv.id, partId: inv.expand?.part_id?.id, partName: inv.expand?.part_id?.name, currentQty: inv.qty })}>
                    <ArrowDownCircle size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialog && (
        <TransactionDialog
          open={!!dialog}
          onClose={() => setDialog(null)}
          onDone={load}
          type={dialog.type}
          partId={dialog.partId}
          locationId={id}
          locationName={location.name}
          currentQty={dialog.currentQty}
          inventoryId={dialog.invId}
        />
      )}
    </div>
  )
}
