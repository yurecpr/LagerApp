'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import pb from '@/lib/pocketbase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/lib/i18n'

export default function LoginPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function login(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const result = await pb.collection('users').authWithPassword(email.trim(), password)
      if (!result.record.active || !['admin', 'employee'].includes(result.record.role)) {
        pb.authStore.clear()
        setError(t('Обліковий запис не має доступу. Зверніться до адміністратора.'))
        return
      }
      setPassword('')
      router.replace('/')
    } catch (err) {
      setError((err as { status?: number }).status === 0 ? t('Не вдалося з’єднатися із сервером.') : t('Не вдалося увійти. Перевірте email і пароль або зверніться до адміністратора.'))
    } finally { setBusy(false) }
  }
  return <div className="m-auto w-full max-w-sm p-6 space-y-5">
    <div><h1 className="text-2xl font-bold">SpeedLabor · {t('Склад')}</h1><p className="text-muted-foreground mt-1">{t('Увійдіть у свій обліковий запис')}</p></div>
    <form onSubmit={login} className="space-y-4">
      <div className="space-y-1"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="password">{t('Пароль')}</Label><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? t('Вхід...') : t('Увійти')}</Button>
    </form>
    <p className="text-sm text-muted-foreground">{t('Облікові записи створює адміністратор.')}</p>
    <Link href="/setup" className="text-xs text-primary">{t('Початкове налаштування адміністратора')}</Link>
  </div>
}
