import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import {
  sendPaymentConfirmedEmail,
  sendStatusChangeEmail,
} from '@/lib/email/send'
import { STATUS_LABELS, STATUS_DESCRIPTIONS } from '@/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const applicationId = session.metadata?.application_id
      const customerId = session.metadata?.customer_id

      if (!applicationId || !customerId) break

      // Update payment record
      await supabase.from('payments').upsert({
        application_id: applicationId,
        stripe_session_id: session.id,
        stripe_payment_id: session.payment_intent as string,
        amount_cents: session.amount_total || 0,
        currency: session.currency || 'usd',
        status: 'paid',
        invoice_url: session.invoice as string,
      })

      // Advance application status to documents_pending
      await supabase
        .from('applications')
        .update({ status: 'documents_pending' })
        .eq('id', applicationId)

      // Get customer info for email
      const { data: customer } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', customerId)
        .single()

      const { data: application } = await supabase
        .from('applications')
        .select('public_id')
        .eq('id', applicationId)
        .single()

      if (customer && application) {
        const portalLink = `${process.env.NEXT_PUBLIC_APP_URL}/portal/dashboard`
        await sendPaymentConfirmedEmail(
          customer.email,
          customer.full_name,
          applicationId,
          application.public_id,
          portalLink
        )

        // Alert staff
        const { data: managers } = await supabase
          .from('profiles')
          .select('email, full_name')
          .in('role', ['manager', 'super_admin'])

        for (const mgr of managers || []) {
          await supabase.from('email_logs').insert({
            template_key: 'staff_new_application',
            to_email: mgr.email,
            application_id: applicationId,
            subject: `New paid application: ${application.public_id} from ${customer.full_name}`,
            status: 'sent',
          })
        }
      }
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      await supabase
        .from('payments')
        .update({ status: 'refunded', refunded_at: new Date().toISOString() })
        .eq('stripe_payment_id', charge.id)

      await supabase
        .from('applications')
        .update({ status: 'closed' })
        .eq('stripe_session_id', charge.payment_intent as string)
      break
    }
  }

  return NextResponse.json({ received: true })
}
