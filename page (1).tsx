import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApplicationHeader } from '@/components/admin/application-header'
import { ApplicationOverview } from '@/components/admin/application-overview'
import { AdminDocuments } from '@/components/admin/admin-documents'
import { AdminMessages } from '@/components/admin/admin-messages'
import { ApplicationTimeline } from '@/components/admin/application-timeline'
import { ApplicationPayments } from '@/components/admin/application-payments'
import { W7Generator } from '@/components/admin/w7-generator'

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params
  const { tab = 'overview' } = await searchParams

  const { data: application } = await supabase
    .from('applications')
    .select(`
      *,
      customer:profiles!applications_customer_id_fkey(*),
      assigned_agent:profiles!applications_assigned_agent_id_fkey(id, full_name, email),
      package:packages(*),
      applicants(*),
      documents(*, reviewed_by_profile:profiles(full_name)),
      status_history(*, changed_by_profile:profiles(full_name, role)),
      payments(*)
    `)
    .or(`id.eq.${id},public_id.eq.${id}`)
    .single()

  if (!application) notFound()

  const { data: agents } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['agent', 'manager'])
    .eq('is_active', true)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header with status change, assignment, overdue badge */}
      <ApplicationHeader
        application={application}
        agents={agents || []}
        currentUserRole={profile?.role || 'agent'}
      />

      <Tabs defaultValue={tab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="w7">W-7 Generator</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ApplicationOverview application={application} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <AdminDocuments
            application={application}
            currentUserId={user.id}
          />
        </TabsContent>

        <TabsContent value="w7" className="mt-4">
          <W7Generator application={application} />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <AdminMessages
            applicationId={application.id}
            currentUserId={user.id}
            customerId={application.customer_id}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <ApplicationTimeline history={application.status_history || []} />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <ApplicationPayments payments={application.payments || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
