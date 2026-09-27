'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FolderOpen, Users, UserCog,
  Settings, BarChart3, ScrollText, ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Profile } from '@/types'

const navItems = [
  { href: '/admin/dashboard',    icon: LayoutDashboard, label: 'Dashboard',     roles: ['agent','manager','super_admin'] },
  { href: '/admin/applications', icon: FolderOpen,      label: 'Applications',  roles: ['agent','manager','super_admin'] },
  { href: '/admin/clients',      icon: Users,           label: 'Clients',       roles: ['agent','manager','super_admin'] },
  { href: '/admin/staff',        icon: UserCog,         label: 'Staff',         roles: ['manager','super_admin'] },
  { href: '/admin/reports',      icon: BarChart3,       label: 'Reports',       roles: ['manager','super_admin'] },
  { href: '/admin/settings',     icon: Settings,        label: 'Settings',      roles: ['super_admin'] },
  { href: '/admin/audit-log',    icon: ScrollText,      label: 'Audit Log',     roles: ['manager','super_admin'] },
]

interface AdminSidebarProps {
  profile: Profile | null
}

export function AdminSidebar({ profile }: AdminSidebarProps) {
  const pathname = usePathname()
  const role = profile?.role || 'agent'

  const visibleItems = navItems.filter(item => item.roles.includes(role))

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-navy-900 border-r hidden lg:flex flex-col shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b">
        <ShieldCheck className="h-7 w-7 text-navy-900 dark:text-gold-500 flex-shrink-0" />
        <div>
          <span className="font-bold text-navy-900 dark:text-white">ITIN Plus</span>
          <span className="block text-[10px] text-muted-foreground leading-tight capitalize">{role.replace('_', ' ')} Portal</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-navy-900 text-white dark:bg-navy-800'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-4 border-t">
        <p className="text-xs text-muted-foreground">{profile?.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
      </div>
    </aside>
  )
}
