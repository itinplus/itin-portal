import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailOptions {
  templateKey: string
  to: string
  toName?: string
  applicationId?: string
  variables: Record<string, string>
  language?: string
}

export async function sendEmail(opts: SendEmailOptions) {
  const supabase = await createAdminClient()
  const lang = opts.language || 'en'

  // Fetch template
  const { data: template } = await supabase
    .from('email_templates')
    .select('subject, body_html')
    .eq('key', opts.templateKey)
    .eq('language', lang)
    .single()

  if (!template) {
    console.error(`Email template not found: ${opts.templateKey} (${lang})`)
    return null
  }

  // Replace variables in subject and body
  let subject = template.subject
  let body = template.body_html

  Object.entries(opts.variables).forEach(([key, value]) => {
    const re = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    subject = subject.replace(re, value)
    body = body.replace(re, value)
  })

  // Add branding wrapper
  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
      <!-- Header -->
      <tr><td style="background:#0F2A44;padding:24px 32px;text-align:center">
        <span style="font-size:22px;font-weight:700;color:#fff">ITIN Plus</span>
        <span style="display:block;font-size:12px;color:#f59e0b;margin-top:4px">IRS Certifying Acceptance Agent (CAA)</span>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px;color:#1f2937;font-size:15px;line-height:1.7">
        ${body}
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb">
        <p style="margin:0">ITIN Plus Inc. • IRS Certifying Acceptance Agent (CAA) • Florida, USA</p>
        <p style="margin:4px 0 0"><a href="mailto:apply@itinplus.com" style="color:#0F2A44">apply@itinplus.com</a> • +1 (305) 216-6992</p>
        <p style="margin:8px 0 0"><strong style="color:#e11d48">Security notice:</strong> We will never ask for your ITIN, passport number, or passwords via email.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'ITIN Plus <no-reply@itinplus.com>',
      reply_to: process.env.EMAIL_REPLY_TO || 'apply@itinplus.com',
      to: opts.toName ? `${opts.toName} <${opts.to}>` : opts.to,
      subject,
      html: htmlBody,
    })

    // Log the email
    await supabase.from('email_logs').insert({
      template_key: opts.templateKey,
      to_email: opts.to,
      to_name: opts.toName,
      application_id: opts.applicationId,
      subject,
      provider_id: data?.id,
      status: error ? 'failed' : 'sent',
      error: error?.message,
    })

    if (error) {
      console.error('Resend error:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Email send error:', err)
    return null
  }
}

// ── Convenience helpers ──────────────────────────────────────

export async function sendWelcomeEmail(email: string, name: string, verifyLink: string) {
  return sendEmail({
    templateKey: 'welcome',
    to: email,
    toName: name,
    variables: { client_first_name: name.split(' ')[0], verify_link: verifyLink },
  })
}

export async function sendPaymentConfirmedEmail(
  email: string, name: string, applicationId: string, publicId: string, portalLink: string
) {
  return sendEmail({
    templateKey: 'payment_success',
    to: email,
    toName: name,
    applicationId,
    variables: { client_first_name: name.split(' ')[0], application_id: publicId, portal_link: portalLink },
  })
}

export async function sendDocumentUploadedEmail(
  email: string, name: string, applicationId: string, publicId: string, documentName: string, portalLink: string
) {
  return sendEmail({
    templateKey: 'document_uploaded',
    to: email,
    toName: name,
    applicationId,
    variables: {
      client_first_name: name.split(' ')[0],
      document_name: documentName,
      application_id: publicId,
      portal_link: portalLink,
    },
  })
}

export async function sendDocumentRejectedEmail(
  email: string, name: string, applicationId: string, publicId: string,
  documentName: string, rejectionReason: string, portalLink: string
) {
  return sendEmail({
    templateKey: 'document_rejected',
    to: email,
    toName: name,
    applicationId,
    variables: {
      client_first_name: name.split(' ')[0],
      document_name: documentName,
      rejection_reason: rejectionReason,
      application_id: publicId,
      portal_link: portalLink,
    },
  })
}

export async function sendStatusChangeEmail(
  email: string, name: string, applicationId: string, publicId: string,
  statusLabel: string, statusDesc: string, portalLink: string
) {
  return sendEmail({
    templateKey: 'status_change',
    to: email,
    toName: name,
    applicationId,
    variables: {
      client_first_name: name.split(' ')[0],
      status: statusLabel,
      status_description: statusDesc,
      application_id: publicId,
      portal_link: portalLink,
    },
  })
}

export async function sendItinIssuedEmail(
  email: string, name: string, applicationId: string, publicId: string, portalLink: string
) {
  return sendEmail({
    templateKey: 'itin_issued',
    to: email,
    toName: name,
    applicationId,
    variables: { client_first_name: name.split(' ')[0], application_id: publicId, portal_link: portalLink },
  })
}
