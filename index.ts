// Supabase Edge Function — runs daily via cron
// Sends document reminder emails to clients who haven't uploaded after 2, 5, 10 days

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const REMINDER_DAYS = [2, 5, 10]

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const portalUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://portal.itinplus.com'
  const resendKey = Deno.env.get('RESEND_API_KEY')

  // Find applications in documents_pending status
  const { data: applications } = await supabase
    .from('applications')
    .select('id, public_id, customer_id, stage_entered_at, customer:profiles(full_name, email, language)')
    .eq('status', 'documents_pending')

  let sent = 0

  for (const app of applications || []) {
    const daysSince = Math.floor(
      (Date.now() - new Date(app.stage_entered_at).getTime()) / 86400000
    )

    // Only send on specific days
    if (!REMINDER_DAYS.includes(daysSince)) continue

    // Check if reminder already sent today
    const { count } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .eq('application_id', app.id)
      .eq('template_key', 'reminder_documents')
      .gte('sent_at', new Date(Date.now() - 86400000).toISOString())

    if (count && count > 0) continue  // already sent today

    // Get missing documents
    const { data: docs } = await supabase
      .from('documents')
      .select('requirement_code, status')
      .eq('application_id', app.id)
      .not('status', 'in', '("approved")')

    const missingList = docs?.map(d => d.requirement_code.replace(/_/g, ' ')).join(', ') || 'required documents'

    // Send via Resend directly
    const customer = app.customer as any
    if (!customer?.email) continue

    const firstName = customer.full_name?.split(' ')[0] || 'there'

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ITIN Plus <no-reply@itinplus.com>',
        reply_to: 'apply@itinplus.com',
        to: `${customer.full_name} <${customer.email}>`,
        subject: `Reminder: Documents Still Needed — ${app.public_id}`,
        html: `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#0F2A44;padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px">ITIN Plus</h1>
    <p style="color:#f59e0b;margin:4px 0 0;font-size:12px">IRS Certifying Acceptance Agent (CAA)</p>
  </div>
  <div style="padding:32px;background:#fff">
    <p>Hi ${firstName},</p>
    <p>This is a friendly reminder that we are still waiting for your documents to proceed with application <strong>${app.public_id}</strong>.</p>
    <p><strong>Still needed:</strong> ${missingList}</p>
    <p>The sooner you upload, the sooner we can start your IRS submission.</p>
    <a href="${portalUrl}/portal/documents" style="display:inline-block;background:#0F2A44;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">Upload Documents Now</a>
  </div>
  <div style="padding:16px 32px;background:#f9fafb;text-align:center;font-size:12px;color:#6b7280">
    ITIN Plus Inc. • apply@itinplus.com • +1 (305) 216-6992
  </div>
</div>`,
      }),
    })

    if (emailRes.ok) {
      const emailData = await emailRes.json()
      await supabase.from('email_logs').insert({
        template_key: 'reminder_documents',
        to_email: customer.email,
        application_id: app.id,
        subject: `Reminder: Documents Still Needed — ${app.public_id}`,
        provider_id: emailData.id,
        status: 'sent',
      })
      sent++
    }
  }

  return new Response(JSON.stringify({ sent, total: applications?.length || 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
