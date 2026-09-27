import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/sidebar'
import { AdminTopBar } from '@/components/admin/top-bar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !['agent', 'manager', 'super_admin'].includes(profile.role)) {
    redirect('/portal/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-950 flex">
      <AdminSidebar profile={profile} />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <AdminTopBar profile={profile} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
