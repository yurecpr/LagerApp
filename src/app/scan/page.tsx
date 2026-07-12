'use client'
import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { useRouter } from 'next/navigation'
import { ScanLine } from 'lucide-react'
import pb from '@/lib/pocketbase'

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()
  const [status, setStatus] = useState('Наведіть камеру на QR-код')
  const [scanning, setScanning] = useState(true)

  useEffect(() => {
    const reader = new BrowserQRCodeReader()
    let stopped = false

    reader.decodeFromVideoDevice(undefined, videoRef.current!, async (result, err) => {
      if (stopped || !result) return
      const text = result.getText()
      setStatus(`Знайдено: ${text}`)
      stopped = true
      setScanning(false)

      try {
        const locs = await pb.collection('locations').getList(1, 1, { filter: `qr_code = "${text}" || name = "${text}"` })
        if (locs.items.length > 0) {
          router.push(`/locations/${locs.items[0].id}`)
        } else {
          setStatus('Комірку не знайдено. Спробуйте ще раз.')
          setTimeout(() => { stopped = false; setScanning(true); setStatus('Наведіть камеру на QR-код') }, 2000)
        }
      } catch {
        setStatus('Помилка пошуку')
      }
    })

    return () => { stopped = true }
  }, [router])

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      <div className="p-4 pt-6">
        <h1 className="text-xl font-bold flex items-center gap-2"><ScanLine size={20} />Сканер QR</h1>
      </div>

      <div className="relative flex-1 bg-black overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-56 h-56 border-2 border-white rounded-2xl opacity-70" />
        </div>
      </div>

      <div className="p-4 text-center">
        <p className={`text-sm ${scanning ? 'text-muted-foreground' : 'text-foreground'}`}>{status}</p>
      </div>
    </div>
  )
}
