import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KpiCard } from '@/components/admin/kpi-card'
import { ApplicationsChart } from '@/components/admin/applications-chart'
import { StatusFunnelChart } from '@/components/admin/status-funnel-chart'
import { AgentWorkloadChart } from '@/components/admin/agent-workload-chart'
import { NeedsAttentionList } from '@/components/admin/needs-attention-list'
import {
  Users, FileCheck, AlertTriangle, CheckCircle2,
  TrendingUp, Clock, DollarSign, BarChart3
} from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const now = new Date()
  const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  // Parallel data fetches
  const [
    { count: newToday },
    { count: newWeek },
    { count: newMonth },
    { count: awaitingReview },
    { count: correctionRequired },
    { count: submittedIrs },
    { count: issuedMonth },
    { count: overdue },
    { data: revenueMonth },
    { data: revenueLastMonth },
    { data: statusBreakdown },
    { data: recentApplications },
  ] = await Promise.all([
    supabase.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
    supabase.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'documents_uploaded'),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'correction_required'),
    supabase.from('applications').select('*', { count: 'exact', head: true }).in('status', ['submitted_to_irs', 'irs_processing']),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'itin_issued').gte('itin_issued_at', monthStart),
    // Overdue: past expected stage duration (simplified: stage_entered_at > 7 days ago and not in terminal status)
    supabase.from('applications').select('*', { count: 'exact', head: true })
      .not('status', 'in', '("itin_issued","closed","rejected_by_irs")')
      .lt('stage_entered_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from('payments').select('amount_cents').eq('status', 'paid').gte('created_at', monthStart),
    supabase.from('payments').select('amount_cents').eq('status', 'paid').gte('created_at', lastMonthStart).lt('created_at', monthStart),
    supabase.from('applications').select('status'),
    supabase.from('applications')
      .select('*, customer:profiles(full_name, email, country), package:packages(name)')
      .in('status', ['documents_uploaded', 'correction_required'])
      .order('stage_entered_at', { ascending: true })
      .limit(10),
  ])

  const revenueThisMonth = (revenueMonth || []).reduce((s: number, p: any) => s + (p.amount_cents || 0), 0)
  const revenueLastMonthTotal = (revenueLastMonth || []).reduce((s: number, p: any) => s + (p.amount_cents || 0), 0)

  // Status counts for funnel
  const statusCounts: Record<string, number> = {}
  ;(statusBreakdown || []).forEach((a: any) => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="New Today"
          value={newToday ?? 0}
          icon={Users}
          subtitle={`${newWeek ?? 0} this week`}
          color="blue"
        />
        <KpiCard
          title="Awaiting Review"
          value={awaitingReview ?? 0}
          icon={FileCheck}
          subtitle="Documents uploaded"
          color="amber"
          alert={(awaitingReview ?? 0) > 5}
        />
        <KpiCard
          title="Correction Needed"
          value={correctionRequired ?? 0}
          icon={AlertTriangle}
          subtitle="Waiting on client"
          color="orange"
        />
        <KpiCard
          title="Overdue"
          value={overdue ?? 0}
          icon={Clock}
          subtitle="Past stage deadline"
          color="red"
          alert={(overdue ?? 0) > 0}
        />
        <KpiCard
          title="With IRS"
          value={submittedIrs ?? 0}
          icon={BarChart3}
          subtitle="Submitted + processing"
          color="indigo"
        />
        <KpiCard
          title="Issued This Month"
          value={issuedMonth ?? 0}
          icon={CheckCircle2}
          subtitle="ITINs received"
          color="green"
        />
        <KpiCard
          title="Revenue (Month)"
          value={`$${(revenueThisMonth / 100).toLocaleString()}`}
          icon={DollarSign}
          subtitle={`$${(revenueLastMonthTotal / 100).toLocaleString()} last month`}
          trend={revenueThisMonth > revenueLastMonthTotal ? 'up' : 'down'}
          color="emerald"
        />
        <KpiCard
          title="New This Month"
          value={newMonth ?? 0}
          icon={TrendingUp}
          subtitle="Applications started"
          color="blue"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-navy-900 rounded-2xl border p-5">
          <h2 className="font-semibold mb-4">Applications per Week</h2>
          <ApplicationsChart />
        </div>
        <div className="bg-white dark:bg-navy-900 rounded-2xl border p-5">
          <h2 className="font-semibold mb-4">Status Breakdown</h2>
          <StatusFunnelChart statusCounts={statusCounts} />
        </div>
      </div>

      {/* Needs attention + agent workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-navy-900 rounded-2xl border p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Needs Attention
          </h2>
          <NeedsAttentionList applications={recentApplications || []} />
        </div>
        <div className="bg-white dark:bg-navy-900 rounded-2xl border p-5">
          <h2 className="font-semibold mb-4">Agent Workload</h2>
          <AgentWorkloadChart />
        </div>
      </div>
    </div>
  )
}
