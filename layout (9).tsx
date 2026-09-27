import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CustomerSidebar } from '@/components/customer/sidebar'
import { CustomerTopBar } from '@/components/customer/top-bar'
import { CustomerMobileNav } from '@/components/customer/mobile-nav'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Staff should use admin portal
  if (profile?.role && ['agent', 'manager', 'super_admin'].includes(profile.role)) {
    redirect('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-950">
      {/* Desktop sidebar */}
      <CustomerSidebar profile={profile} />

      {/* Main content */}
      <div className="lg:pl-64">
        <CustomerTopBar profile={profile} />
        <main className="p-4 md:p-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <CustomerMobileNav />
    </div>
  )
}
