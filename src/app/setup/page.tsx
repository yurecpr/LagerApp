'use client'

import { useState } from 'react'
import PocketBase, { BaseAuthStore } from 'pocketbase'
import Link from 'next/link'
import pb from '@/lib/pocketbase'
import { errorMessage } from '@/lib/movements'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/lib/i18n'

export default function SetupPage() {
  const { t } = useLanguage()
  const [form, setForm] = useState({ ownerEmail: '', ownerPassword: '', name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  async function setup(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    // Isolated, memory-only auth: never put a PocketBase superuser token in localStorage.
    const owner = new PocketBase(pb.baseURL, new BaseAuthStore())
    try {
      await owner.collection('_superusers').authWithPassword(form.ownerEmail.trim(), form.ownerPassword)
      const users = await owner.collections.getOne('users')
      if (!users.fields.some(f => f.name === 'role') || !users.fields.some(f => f.name === 'active')) throw new Error(t('Спочатку застосуйте оновлення сервера PocketBase.'))
      const admins = await owner.collection('users').getList(1, 1, { filter: 'role = "admin" && active = true' })
      if (admins.totalItems) throw new Error(t('Адміністратор уже існує. Увійдіть або відновіть доступ через панель PocketBase.'))
      await owner.collection('users').create({ name: form.name.trim(), email: form.email.trim(), password: form.password, passwordConfirm: form.password, role: 'admin', active: true })
      setForm({ ownerEmail: '', ownerPassword: '', name: '', email: '', password: '' }); setDone(true)
    } catch (err) { setError(t(errorMessage(err))) }
    finally { owner.authStore.clear(); setForm(p => ({ ...p, ownerPassword: '', password: '' })); setBusy(false) }
  }
  return <div className="m-auto w-full max-w-md p-6 space-y-4">
    <h1 className="text-xl font-bold">{t('Перший адміністратор')}</h1>
    {done ? <><p>{t('Адміністратора створено.')}</p><Link href="/login" className="text-primary">{t('Перейти до входу')}</Link></> : <>
      <p className="text-sm text-muted-foreground">{t('Підтвердьте доступ власника сервера та створіть окремий обліковий запис для роботи зі складом.')}</p>
      <form onSubmit={setup} className="space-y-3">
        {([
          ['ownerEmail', 'Email власника PocketBase', 'email'], ['ownerPassword', 'Пароль власника PocketBase', 'password'],
          ['name', 'Ім’я адміністратора складу', 'text'], ['email', 'Email адміністратора складу', 'email'], ['password', 'Новий пароль (щонайменше 12 символів)', 'password'],
        ] as const).map(([key, label, type]) => <div key={key} className="space-y-1"><Label htmlFor={key}>{t(label)}</Label><Input id={key} type={type} autoComplete={type === 'password' ? 'new-password' : 'off'} required minLength={key === 'password' ? 12 : undefined} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} /></div>)}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? t('Створення...') : t('Створити адміністратора')}</Button>
      </form>
      <Link href="/login" className="text-sm text-primary">{t('Назад до входу')}</Link>
    </>}
  </div>
}
