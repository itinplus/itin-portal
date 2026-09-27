import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApplicationsTable } from '@/components/admin/applications-table'
import { ApplicationsKanban } from '@/components/admin/applications-kanban'
import { ApplicationsFilters } from '@/components/admin/applications-filters'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LayoutList, Kanban, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    country?: string
    agent?: string
    q?: string
    page?: string
    view?: string
  }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  const page = Number(params.page || 1)
  const perPage = 25
  const view = params.view || 'table'

  let query = supabase
    .from('applications')
    .select(`
      *,
      customer:profiles!applications_customer_id_fkey(id, full_name, email, country),
      assigned_agent:profiles!applications_assigned_agent_id_fkey(id, full_name),
      package:packages(name, price_usd),
      documents(status)
    `, { count: 'exact' })

  if (params.status) query = query.eq('status', params.status)
  if (params.country) query = query.eq('customer.country', params.country)
  if (params.agent) query = query.eq('assigned_agent_id', params.agent)
  if (params.q) query = query.or(`public_id.ilike.%${params.q}%,customer.email.ilike.%${params.q}%,customer.full_name.ilike.%${params.q}%`)

  query = query
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  const { data: applications, count } = await query

  // Get agents for filter
  const { data: agents } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['agent', 'manager'])
    .eq('is_active', true)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Applications</h1>
          <p className="text-muted-foreground text-sm">{count ?? 0} total applications</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/applications/export">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </a>
        </Button>
      </div>

      <ApplicationsFilters agents={agents || []} currentParams={params} />

      <Tabs defaultValue={view}>
        <TabsList>
          <TabsTrigger value="table">
            <LayoutList className="h-4 w-4 mr-1.5" />Table
          </TabsTrigger>
          <TabsTrigger value="kanban">
            <Kanban className="h-4 w-4 mr-1.5" />Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          <ApplicationsTable
            applications={applications || []}
            agents={agents || []}
            total={count ?? 0}
            page={page}
            perPage={perPage}
          />
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <ApplicationsKanban applications={applications || []} agents={agents || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
