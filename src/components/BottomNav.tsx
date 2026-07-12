'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, ScanLine, MapPin, Package, BarChart3, Sun, Moon } from 'lucide-react'
import { useTheme } from './ThemeProvider'

const nav = [
  { href: '/', icon: Search, label: 'Пошук' },
  { href: '/scan', icon: ScanLine, label: 'Сканер' },
  { href: '/parts', icon: Package, label: 'Деталі' },
  { href: '/locations', icon: MapPin, label: 'Комірки' },
  { href: '/reports', icon: BarChart3, label: 'Звіти' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border z-50 md:hidden">
      <div className="flex">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon size={22} />
              <span>{label}</span>
            </Link>
          )
        })}
        <button onClick={toggle} className="flex-1 flex flex-col items-center py-3 gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
          {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
          <span>Тема</span>
        </button>
      </div>
    </nav>
  )
}
