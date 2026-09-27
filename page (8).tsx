import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentUploadZone } from '@/components/customer/document-upload-zone'
import { DocumentCard } from '@/components/customer/document-card'
import { Upload, FolderOpen } from 'lucide-react'

const DOCUMENT_LABELS: Record<string, string> = {
  passport:        'Valid Passport',
  national_id:     'National ID Card',
  drivers_license: 'Driver\'s License',
  us_visa:         'US Visa',
  birth_cert:      'Birth Certificate',
  tax_return:      'US Tax Return (1040-NR)',
  bank_letter:     'US Bank Letter',
  exception_doc:   'Exception Documentation',
}

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: application } = await supabase
    .from('applications')
    .select('id, public_id, status, package_id')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('application_id', application?.id || '')
    .order('uploaded_at', { ascending: false })

  const { data: requirements } = await supabase
    .from('document_requirements')
    .select('*')
    .eq('active', true)
    .order('sort_order')

  // Group docs by requirement code — take latest version per code
  const docsByCode: Record<string, typeof documents> = {}
  documents?.forEach(doc => {
    if (!docsByCode[doc.requirement_code]) {
      docsByCode[doc.requirement_code] = []
    }
    docsByCode[doc.requirement_code]!.push(doc)
  })

  // Company-issued documents (staff uploaded)
  const companyDocs = documents?.filter(d => d.uploader_type === 'staff') || []
  const customerDocs = documents?.filter(d => d.uploader_type === 'customer') || []

  const canUpload = application && !['itin_issued', 'closed', 'rejected_by_irs'].includes(application.status)

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Documents</h1>
        {application && (
          <p className="text-muted-foreground text-sm mt-1">Application {application.public_id}</p>
        )}
      </div>

      {!application && (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border p-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Start an application to upload documents.</p>
        </div>
      )}

      {application && (
        <>
          {/* Required document slots */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-navy-700" />
              Your Documents
              <span className="text-sm font-normal text-muted-foreground">
                ({customerDocs.filter(d => d.status === 'approved').length} of {requirements?.length || 0} approved)
              </span>
            </h2>

            <div className="space-y-4">
              {requirements?.map(req => {
                const docs = docsByCode[req.code] || []
                const latestDoc = docs[0] || null

                return (
                  <DocumentCard
                    key={req.id}
                    requirement={req}
                    document={latestDoc}
                    allVersions={docs}
                    applicationId={application.id}
                    canUpload={canUpload}
                  />
                )
              })}
            </div>
          </section>

          {/* Upload zone for new documents */}
          {canUpload && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Upload a Document</h2>
              <DocumentUploadZone applicationId={application.id} />
              <p className="text-xs text-muted-foreground mt-3">
                Accepted: PDF, JPG, PNG, HEIC. Max 10 MB per file.
                Your documents are encrypted and stored securely.
              </p>
            </section>
          )}

          {/* Company documents */}
          {companyDocs.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">From Our Team</h2>
              <div className="space-y-3">
                {companyDocs.map(doc => (
                  <div key={doc.id} className="bg-white dark:bg-navy-900 rounded-xl border p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{DOCUMENT_LABELS[doc.requirement_code] || doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
