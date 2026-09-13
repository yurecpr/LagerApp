'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScanLine, Keyboard } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase'
import { useLanguage } from '@/lib/i18n'

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()
  const { t } = useLanguage()
  const [statusKey, setStatusKey] = useState('Наведіть камеру на QR-код')
  const [statusValues, setStatusValues] = useState<Record<string, string>>({})
  const [cameraError, setCameraError] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(true)
      setStatusKey('Камера недоступна (потрібен HTTPS або localhost)')
      return
    }
    let stopped = false
    import('@zxing/browser').then(({ BrowserQRCodeReader }) => {
      const reader = new BrowserQRCodeReader()
      reader.decodeFromVideoDevice(undefined, videoRef.current!, async (result) => {
        if (stopped || !result) return
        stopped = true
        await findLocation(result.getText())
      }).catch(() => setCameraError(true))
    })
    return () => { stopped = true }
  }, [])

  const findLocation = async (code: string) => {
    setStatusKey('Пошук: {code}...'); setStatusValues({ code })
    setSearching(true)
    try {
      const locs = await pb.collection('locations').getList(1, 1, {
        filter: `qr_code = "${code}" || name = "${code}"`, requestKey: null,
      })
      if (locs.items.length > 0) { router.push(`/locations/${locs.items[0].id}`); return }
      const parts = await pb.collection('parts').getList(1, 1, {
        filter: `barcode = "${code}" || article = "${code}"`, requestKey: null,
      })
      if (parts.items.length > 0) { router.push(`/parts/${parts.items[0].id}`); return }
      setStatusKey('«{code}» — не знайдено'); setStatusValues({ code })
    } catch { setStatusKey('Помилка пошуку'); setStatusValues({}) }
    setSearching(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      <div className="p-4 pt-6 flex items-center gap-2">
        <ScanLine size={20} className="text-primary" />
        <h1 className="text-xl font-bold">{t('Сканер QR')}</h1>
      </div>

      {!cameraError ? (
        <div className="relative flex-1 bg-black overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 border-2 border-white rounded-2xl opacity-70" />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-muted/30">
          <div className="text-center p-8 space-y-2">
            <ScanLine size={48} className="mx-auto text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{t(statusKey, statusValues)}</p>
            <p className="text-xs text-muted-foreground">{t('Для камери потрібен HTTPS або localhost')}</p>
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        <p className="text-center text-sm text-muted-foreground">{t(statusKey, statusValues)}</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input className="pl-9" placeholder={t('Введіть код вручну...')}
              value={manualCode} onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && manualCode.trim() && findLocation(manualCode.trim())} />
          </div>
          <Button onClick={() => manualCode.trim() && findLocation(manualCode.trim())}
            disabled={searching || !manualCode.trim()}>{t('Знайти')}</Button>
        </div>
      </div>
    </div>
  )
}

