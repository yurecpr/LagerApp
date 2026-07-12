'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, ScanLine, MapPin, Package, BarChart3, Warehouse } from 'lucide-react'

const nav = [
  { href: '/', icon: Search, label: 'Пошук' },
  { href: '/scan', icon: ScanLine, label: 'Сканер' },
  { href: '/parts', icon: Package, label: 'Деталі' },
  { href: '/locations', icon: MapPin, label: 'Комірки' },
  { href: '/reports', icon: BarChart3, label: 'Звіти' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-sidebar border-r border-sidebar-border shrink-0">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
        <Warehouse size={22} className="text-primary" />
        <span className="font-bold text-lg text-sidebar-foreground">LagerApp</span>
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}>
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground">Складський облік v1.0</p>
      </div>
    </aside>
  )
}
