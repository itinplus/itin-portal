import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatusStepper } from '@/components/customer/status-stepper'
import { DocumentChecklist } from '@/components/customer/document-checklist'
import { ActivityTimeline } from '@/components/customer/activity-timeline'
import { MessageCard } from '@/components/customer/message-card'
import {
  AlertCircle, CheckCircle2, Clock, FileText, MessageSquare,
  Phone, Mail, HelpCircle, ArrowRight, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { STATUS_LABELS, STATUS_DESCRIPTIONS } from '@/types'
import type { Application, Document, StatusHistory, Message } from '@/types'

export default async function CustomerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Get most recent application
  const { data: application } = await supabase
    .from('applications')
    .select(`
      *,
      package:packages(*),
      documents(*),
      status_history(*, changed_by_profile:profiles(full_name, role))
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: Application & { documents: Document[], status_history: StatusHistory[] } | null }

  // Unread messages count
  const { count: unreadCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('application_id', application?.id || '')
    .is('read_at', null)
    .neq('sender_id', user.id)

  // Documents missing/rejected
  const docsNeedingAction = application?.documents?.filter(
    d => d.status === 'rejected' || (d.status === 'missing' && d.uploader_type === 'customer')
  ) || []

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
            Welcome back, {firstName} 👋
          </h1>
          {application && (
            <p className="text-muted-foreground text-sm mt-1">
              Application{' '}
              <span className="font-mono font-semibold text-navy-700 dark:text-navy-300">
                {application.public_id}
              </span>
            </p>
          )}
        </div>
        {!application && (
          <Button asChild>
            <Link href="/portal/wizard">Start Application <ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>
        )}
      </div>

      {/* No application yet */}
      {!application && (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border p-12 text-center">
          <Sparkles className="h-12 w-12 text-gold-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Ready to get your ITIN?</h2>
          <p className="text-muted-foreground mb-6">
            Complete our simple wizard in under 5 minutes. Your IRS Certifying Acceptance Agent handles the rest.
          </p>
          <Button size="lg" asChild>
            <Link href="/portal/wizard">Start ITIN Application — $99</Link>
          </Button>
        </div>
      )}

      {/* Action required card */}
      {docsNeedingAction.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 dark:text-red-400">Action Required</h3>
              <ul className="mt-2 space-y-2">
                {docsNeedingAction.map(doc => (
                  <li key={doc.id} className="text-sm text-red-700 dark:text-red-300">
                    <span className="font-medium">{doc.requirement_code.replace(/_/g, ' ')}</span>
                    {doc.rejection_reason && <> — {doc.rejection_reason}</>}
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="destructive" className="mt-3" asChild>
                <Link href="/portal/documents">Re-upload Documents</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status stepper */}
      {application && (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Application Status</h2>
            <span className="text-sm text-muted-foreground">
              {STATUS_LABELS[application.status]}
            </span>
          </div>
          <StatusStepper currentStatus={application.status} />
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>What happens next:</strong> {STATUS_DESCRIPTIONS[application.status]}
            </p>
          </div>
          {application.expected_completion_date && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Expected completion: {new Date(application.expected_completion_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          )}
          {application.irs_tracking_number && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Courier tracking:{' '}
              <span className="font-mono font-medium">{application.irs_tracking_number}</span>
              {application.courier && <span className="text-muted-foreground">({application.courier})</span>}
            </div>
          )}
        </div>
      )}

      {/* Grid: documents + messages */}
      {application && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Document checklist */}
          <div className="bg-white dark:bg-navy-900 rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-navy-700" />
                Documents
              </h2>
              <Link href="/portal/documents" className="text-sm text-primary hover:underline">View all</Link>
            </div>
            <DocumentChecklist documents={application.documents || []} compact />
          </div>

          {/* Messages */}
          <div className="bg-white dark:bg-navy-900 rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-navy-700" />
                Messages
                {(unreadCount ?? 0) > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </h2>
              <Link href="/portal/messages" className="text-sm text-primary hover:underline">Open</Link>
            </div>
            <MessageCard applicationId={application.id} />
          </div>
        </div>
      )}

      {/* Activity timeline */}
      {application?.status_history && application.status_history.length > 0 && (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <ActivityTimeline history={application.status_history.slice(0, 5)} />
        </div>
      )}

      {/* Help card */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-5 w-5 text-gold-500" />
          <h2 className="text-lg font-semibold">Need help?</h2>
        </div>
        <p className="text-navy-200 text-sm mb-4">Our team responds within 1 business day.</p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://wa.me/13052166992"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Phone className="h-4 w-4" />WhatsApp
          </a>
          <a
            href="mailto:apply@itinplus.com"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Mail className="h-4 w-4" />apply@itinplus.com
          </a>
        </div>
      </div>
    </div>
  )
}
