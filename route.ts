import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Fetch document meta
  const { data: document } = await supabase
    .from('documents')
    .select('*, application:applications(customer_id)')
    .eq('id', id)
    .single()

  if (!document) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Check access: customer can only access their own docs
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isStaff = profile?.role && ['agent', 'manager', 'super_admin'].includes(profile.role)
  const isOwner = document.application?.customer_id === user.id

  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Log document view to audit log
  const adminClient = await createAdminClient()
  await adminClient.from('audit_logs').insert({
    actor_id: user.id,
    actor_email: user.email,
    action: 'document.download',
    entity: 'document',
    entity_id: id,
    metadata: { file_name: document.file_name },
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    user_agent: request.headers.get('user-agent') || '',
  })

  // Generate signed URL (5 min expiry)
  const { data: signedUrl, error } = await adminClient.storage
    .from('documents')
    .createSignedUrl(document.storage_path, 300)

  if (error || !signedUrl?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 })
  }

  return NextResponse.redirect(signedUrl.signedUrl)
}
