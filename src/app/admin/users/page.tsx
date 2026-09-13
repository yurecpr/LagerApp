'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth, type AppUser } from '@/components/AuthProvider'
import pb from '@/lib/pocketbase'
import { errorMessage } from '@/lib/movements'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/lib/i18n'

export default function UsersPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [users, setUsers] = useState<AppUser[]>([])
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [resetId, setResetId] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const load = useCallback(async () => {
    const result = await pb.collection('users').getFullList<AppUser>({ sort: 'name', requestKey: null })
    setUsers(result)
  }, [])
  useEffect(() => { if (user?.role === 'admin') void load().catch(e => setError(t(errorMessage(e)))) }, [user?.role, load, t])
  if (user?.role !== 'admin') return <p className="p-6">{t('Керування працівниками доступне лише адміністратору.')}</p>
  async function action(fn: () => Promise<unknown>, success: string) {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try { await fn(); await load(); setMessage(success) }
    catch (err) { setError(t(errorMessage(err))) }
    finally { setBusy(false) }
  }
  return <div className="max-w-3xl mx-auto p-4 space-y-5">
    <h1 className="text-xl font-bold">{t('Працівники')}</h1>
    <form className="border rounded-xl p-4 space-y-3" onSubmit={e => {
      e.preventDefault()
      void action(async () => {
        await pb.collection('users').create({ ...form, name: form.name.trim(), email: form.email.trim(), passwordConfirm: form.password, active: true })
        setForm({ name: '', email: '', password: '', role: 'employee' })
      }, t('Обліковий запис створено.'))
    }}>
      <h2 className="font-medium">{t('Новий обліковий запис')}</h2>
      <div className="space-y-1"><Label htmlFor="new-name">{t('Ім’я')}</Label><Input id="new-name" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
      <div className="space-y-1"><Label htmlFor="new-email">Email</Label><Input id="new-email" type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
      <div className="space-y-1"><Label htmlFor="new-password">{t('Пароль (щонайменше 12 символів)')}</Label><Input id="new-password" type="password" autoComplete="new-password" required minLength={12} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></div>
      <div className="space-y-1"><Label htmlFor="new-role">{t('Роль')}</Label><select id="new-role" className="border rounded-md p-2 bg-background w-full" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}><option value="employee">{t('Працівник')}</option><option value="admin">{t('Адміністратор')}</option></select></div>
      <Button type="submit" disabled={busy}>{t('Створити')}</Button>
    </form>
    {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
    {message && <p role="status" className="text-sm text-green-600">{message}</p>}
    <div className="space-y-3">{users.map(member => <div key={member.id} className="border rounded-xl p-4 space-y-3">
      <div><p className="font-medium">{member.name || member.email}{member.id === user.id ? ` (${t('ви')})` : ''}</p><p className="text-sm text-muted-foreground">{member.email} · {member.active ? t('Активний') : t('Заблокований')}</p></div>
      <div className="flex flex-wrap gap-2">
        <select aria-label={t('Роль: {name}', { name: member.name })} className="border rounded-md p-2 bg-background" disabled={busy || member.id === user.id} value={member.role} onChange={e => void action(() => pb.collection('users').update(member.id, { role: e.target.value }), t('Роль оновлено.'))}><option value="employee">{t('Працівник')}</option><option value="admin">{t('Адміністратор')}</option></select>
        <Button variant="outline" disabled={busy || member.id === user.id} onClick={() => void action(() => pb.collection('users').update(member.id, { active: !member.active }), member.active ? t('Доступ заблоковано.') : t('Доступ відновлено.'))}>{member.active ? t('Заблокувати') : t('Активувати')}</Button>
        <Button variant="outline" disabled={busy} onClick={() => { setResetId(member.id); setResetPassword('') }}>{t('Змінити пароль')}</Button>
      </div>
      {resetId === member.id && <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); void action(async () => { await pb.collection('users').update(member.id, { password: resetPassword, passwordConfirm: resetPassword }); setResetId(''); setResetPassword('') }, t('Пароль змінено.')) }}>
        <Input aria-label={t('Новий пароль')} type="password" autoComplete="new-password" minLength={12} required value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder={t('Новий пароль, щонайменше 12 символів')} />
        <Button type="submit" disabled={busy}>{t('Зберегти пароль')}</Button><Button type="button" variant="outline" onClick={() => { setResetId(''); setResetPassword('') }}>{t('Скасувати')}</Button>
      </form>}
    </div>)}</div>
  </div>
}
