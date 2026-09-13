'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import pb from '@/lib/pocketbase'
import { errorMessage } from '@/lib/movements'
import { useLanguage } from '@/lib/i18n'

export default function DeleteCatalogButton({ collection, id, name }: { collection: 'parts' | 'locations'; id: string; name: string }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (user?.role !== 'admin') return null
  return <>
    <Button size="sm" variant="outline" onClick={() => { setError(''); setOpen(true) }}>{t('Видалити')}</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value) }}><DialogContent className="max-w-sm">
      <DialogHeader><DialogTitle>{t('Видалити «{name}»?', { name })}</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">{t('Можна видалити лише запис без залишків і рухів у журналі.')}</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>{t('Скасувати')}</Button><Button variant="destructive" disabled={busy} onClick={async () => {
        if (busy) return
        setBusy(true)
        try { await pb.collection(collection).delete(id); router.push(`/${collection}`) }
        catch (e) { setError(t(errorMessage(e))) }
        finally { setBusy(false) }
      }}>{busy ? t('Видалення...') : t('Видалити')}</Button></div>
    </DialogContent></Dialog>
  </>
}
