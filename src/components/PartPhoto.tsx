'use client'
import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase'
import { useLanguage } from '@/lib/i18n'

export default function PartPhoto({ part, className, alt = '', thumb }: { part: { id: string; collectionId: string; photo: string }; className?: string; alt?: string; thumb?: string }) {
  const { t } = useLanguage()
  const [src, setSrc] = useState('')
  useEffect(() => {
    let active = true
    setSrc('')
    const refresh = async () => {
      try {
        const token = await pb.files.getToken({ requestKey: null })
        if (active) setSrc(pb.files.getURL(part, part.photo, { token, ...(thumb ? { thumb } : {}) }))
      } catch { if (active) setSrc('') }
    }
    if (part.photo) void refresh()
    return () => { active = false }
  }, [part.id, part.collectionId, part.photo, thumb])
  return src ? <img src={src} alt={alt} className={className} /> : <div role="img" aria-label={t('Фото недоступне')} className={className} />
}
