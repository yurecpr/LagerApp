'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import PocketBase, { BaseAuthStore, type RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { Button } from './ui/button'
import { LanguageSwitch, useLanguage } from '@/lib/i18n'

export type AppUser = RecordModel & { name: string; email: string; role: 'admin' | 'employee'; active: boolean }
const AuthContext = createContext<{ user: AppUser | null; logout: () => void }>({ user: null, logout: () => {} })
export const useAuth = () => useContext(AuthContext)

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()
  const [user, setUser] = useState<AppUser | null>(null)
  const [ready, setReady] = useState(false)
  const [offline, setOffline] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const publicPage = pathname === '/login' || pathname === '/setup'

  useEffect(() => {
    let mounted = true
    let refreshing = false
    const sync = () => {
      const record = pb.authStore.record
      setUser(pb.authStore.isValid && record?.collectionName === 'users' && record.active && ['admin', 'employee'].includes(record.role) ? record as AppUser : null)
    }
    const unsubscribe = pb.authStore.onChange(sync)
    const refresh = async () => {
      if (refreshing) return
      refreshing = true
      const token = pb.authStore.token
      try {
        if (pb.authStore.isValid && pb.authStore.record?.collectionName === 'users') {
          // A delayed refresh must never sign someone back in after logout,
          // or overwrite a different account that has since logged in.
          const client = new PocketBase(pb.baseURL, new BaseAuthStore())
          client.authStore.save(token, pb.authStore.record)
          const auth = await client.collection('users').authRefresh({ requestKey: null })
          if (!mounted || pb.authStore.token !== token) return
          pb.authStore.save(auth.token, auth.record)
        } else {
          pb.authStore.clear()
        }
        if (mounted) { sync(); setOffline(false); setReady(true) }
      } catch (error) {
        if (!mounted || pb.authStore.token !== token) return
        const status = (error as { status?: number }).status
        if (status === 401 || status === 403) { pb.authStore.clear(); setReady(true); setOffline(false) }
        else { setUser(null); setOffline(true); setReady(false) }
      } finally { refreshing = false }
    }
    void refresh()
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    const timer = window.setInterval(onFocus, 60_000)
    return () => { mounted = false; unsubscribe(); window.removeEventListener('focus', onFocus); window.clearInterval(timer) }
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!user && !publicPage) router.replace('/login')
    if (user && publicPage) router.replace('/')
  }, [ready, user, publicPage, router])

  const logout = () => { pb.authStore.clear(); setOffline(false); setReady(true); router.replace('/login') }
  if (offline && !publicPage) return <div className="m-auto p-6 text-center space-y-3"><p>{t('Сервер недоступний. Перевірте з’єднання.')}</p><Button onClick={() => window.location.reload()}>{t('Повторити')}</Button><Button variant="outline" onClick={logout}>{t('Вийти')}</Button></div>
  if (!ready && !publicPage) return <p className="m-auto p-6">{t('Перевірка доступу...')}</p>
  if (publicPage) return <AuthContext.Provider value={{ user, logout }}><div className="fixed top-3 right-3 z-50"><LanguageSwitch compact /></div>{children}</AuthContext.Provider>
  if (!user) return null
  return (
    <AuthContext.Provider value={{ user, logout }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="border-b p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>{user.name || user.email} · {user.role === 'admin' ? t('Адміністратор') : t('Працівник')}</span>
          <div className="flex gap-3 items-center">
            <Link href="/transactions" className="text-primary">{t('Журнал')}</Link>
            {user.role === 'admin' && <Link href="/admin/users" className="text-primary">{t('Працівники')}</Link>}
            <LanguageSwitch compact />
            <Button size="sm" variant="outline" onClick={logout}>{t('Вийти')}</Button>
          </div>
        </header>
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <BottomNav />
      </div>
    </AuthContext.Provider>
  )
}
