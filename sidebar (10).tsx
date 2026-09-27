'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Clock, MessageSquare,
  CreditCard, User, ShieldCheck, ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Profile } from '@/types'

const navItems = [
  { href: '/portal/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/portal/documents',  icon: FileText,        label: 'Documents' },
  { href: '/portal/status',     icon: Clock,           label: 'Status & Timeline' },
  { href: '/portal/messages',   icon: MessageSquare,   label: 'Messages' },
  { href: '/portal/billing',    icon: CreditCard,      label: 'Billing' },
  { href: '/portal/profile',    icon: User,            label: 'Profile & Security' },
]

interface CustomerSidebarProps {
  profile: Profile | null
}

export function CustomerSidebar({ profile }: CustomerSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-navy-900 hidden lg:flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-navy-800">
        <ShieldCheck className="h-7 w-7 text-gold-500 flex-shrink-0" />
        <div>
          <span className="font-bold text-white">ITIN Plus</span>
          <span className="block text-[10px] text-navy-400 leading-tight">Client Portal</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-navy-800 text-white'
                  : 'text-navy-300 hover:bg-navy-800/60 hover:text-white'
              )}
            >
              <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: back to website */}
      <div className="px-3 py-4 border-t border-navy-800 space-y-2">
        <a
          href="https://itinplus.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-navy-400 hover:text-white text-sm transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Visit itinplus.com
        </a>
        {profile && (
          <div className="px-3 py-2">
            <p className="text-xs text-navy-400 truncate">{profile.email}</p>
          </div>
        )}
      </div>
    </aside>
  )
}
