// ============================================================
// ITIN Plus — TypeScript Types
// ============================================================

export type UserRole = 'customer' | 'agent' | 'manager' | 'super_admin'

export type ApplicationStatus =
  | 'account_created'
  | 'payment_pending'
  | 'documents_pending'
  | 'documents_uploaded'
  | 'under_review'
  | 'correction_required'
  | 'w7_prepared'
  | 'awaiting_signature'
  | 'documents_certified'
  | 'submitted_to_irs'
  | 'irs_processing'
  | 'itin_issued'
  | 'rejected_by_irs'
  | 'closed'

export type DocumentStatus = 'missing' | 'uploaded' | 'under_review' | 'approved' | 'rejected'

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed'

// ── Labels and descriptions shown to customers ───────────────
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  account_created:    'Account Created',
  payment_pending:    'Payment Pending',
  documents_pending:  'Documents Pending',
  documents_uploaded: 'Documents Uploaded',
  under_review:       'Under Review',
  correction_required:'Correction Required',
  w7_prepared:        'W-7 Form Prepared',
  awaiting_signature: 'Awaiting Your Signature',
  documents_certified:'Documents Certified',
  submitted_to_irs:   'Submitted to IRS',
  irs_processing:     'IRS Processing',
  itin_issued:        'ITIN Issued ✓',
  rejected_by_irs:    'IRS Review Required',
  closed:             'Closed',
}

export const STATUS_DESCRIPTIONS: Record<ApplicationStatus, string> = {
  account_created:    'Welcome! Please select a service package to begin.',
  payment_pending:    'Your package is selected. Complete payment to proceed.',
  documents_pending:  'Payment confirmed. Please upload your required documents.',
  documents_uploaded: 'All documents received. Our team will review them within 24 hours.',
  under_review:       'Our team is reviewing your documents.',
  correction_required:'One or more documents need to be re-uploaded. See the action required below.',
  w7_prepared:        'Your W-7 form is ready. Please review and sign it.',
  awaiting_signature: 'Waiting for your signature on the W-7 form.',
  documents_certified:'Your identity documents have been certified by our CAA.',
  submitted_to_irs:   'Your application has been submitted to the IRS. Tracking details below.',
  irs_processing:     'The IRS is processing your application. Expected: 8–14 weeks from submission.',
  itin_issued:        'Congratulations! Your ITIN has been issued. Download your CP565 notice below.',
  rejected_by_irs:    'The IRS has flagged your application. Our team will contact you with next steps.',
  closed:             'This application has been closed.',
}

// Status pipeline order (for stepper display)
export const STATUS_PIPELINE: ApplicationStatus[] = [
  'account_created',
  'payment_pending',
  'documents_pending',
  'documents_uploaded',
  'under_review',
  'w7_prepared',
  'awaiting_signature',
  'submitted_to_irs',
  'irs_processing',
  'itin_issued',
]

// ── Database entity types ────────────────────────────────────

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  email: string
  phone?: string
  country?: string
  language: string
  two_fa_enabled: boolean
  avatar_url?: string
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface Package {
  id: string
  name: string
  description?: string
  price_usd: number  // cents
  stripe_price_id?: string
  features: string[]
  sort_order: number
  active: boolean
}

export interface Application {
  id: string
  public_id: string
  customer_id: string
  package_id?: string
  status: ApplicationStatus
  assigned_agent_id?: string
  reason_code?: string
  stage_entered_at: string
  expected_completion_date?: string
  irs_tracking_number?: string
  courier?: string
  submitted_to_irs_at?: string
  itin_issued_at?: string
  notes?: string
  created_at: string
  updated_at: string
  // joined
  customer?: Profile
  assigned_agent?: Profile
  package?: Package
  documents?: Document[]
  latest_status_history?: StatusHistory[]
}

export interface Applicant {
  id: string
  application_id: string
  relationship: 'primary' | 'spouse' | 'dependent'
  first_name: string
  last_name: string
  name_at_birth?: string
  date_of_birth?: string
  country_of_birth?: string
  city_of_birth?: string
  gender?: string
  country_of_citizenship?: string
  foreign_tax_id?: string
  passport_number?: string
  passport_last4?: string
  us_visa_number?: string
  us_visa_type?: string
  us_visa_expiry?: string
  foreign_address_line1?: string
  foreign_address_line2?: string
  foreign_city?: string
  foreign_state?: string
  foreign_postal?: string
  foreign_country?: string
  us_address_line1?: string
  us_address_line2?: string
  us_city?: string
  us_state?: string
  us_zip?: string
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  application_id: string
  applicant_id?: string
  requirement_code: string
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes?: number
  version: number
  status: DocumentStatus
  rejection_reason?: string
  rejection_note?: string
  virus_scan_status: 'pending' | 'clean' | 'infected' | 'error'
  uploaded_by?: string
  reviewed_by?: string
  reviewed_at?: string
  uploaded_at: string
  uploader_type: 'customer' | 'staff'
}

export interface DocumentRequirement {
  id: string
  package_id?: string
  code: string
  label: string
  description?: string
  required: boolean
  accepted_alternatives?: string[]
  sort_order: number
  active: boolean
}

export interface StatusHistory {
  id: string
  application_id: string
  from_status?: ApplicationStatus
  to_status: ApplicationStatus
  changed_by?: string
  note?: string
  client_visible: boolean
  created_at: string
  changed_by_profile?: Profile
}

export interface Message {
  id: string
  application_id: string
  sender_id: string
  body: string
  attachments: MessageAttachment[]
  is_internal_note: boolean
  read_at?: string
  created_at: string
  sender?: Profile
}

export interface MessageAttachment {
  name: string
  storage_path: string
  size: number
  mime_type: string
}

export interface Payment {
  id: string
  application_id: string
  stripe_session_id?: string
  stripe_payment_id?: string
  amount_cents: number
  currency: string
  status: PaymentStatus
  invoice_url?: string
  receipt_url?: string
  created_at: string
}

// ── Form / Wizard types ──────────────────────────────────────

export interface WizardStep {
  id: number
  title: string
  description: string
}

export interface ApplicationWizardData {
  packageId?: string
  // Personal info
  firstName?: string
  lastName?: string
  nameAtBirth?: string
  dateOfBirth?: string
  countryOfBirth?: string
  cityOfBirth?: string
  gender?: string
  countryOfCitizenship?: string
  foreignTaxId?: string
  // Contact
  phone?: string
  foreignAddressLine1?: string
  foreignCity?: string
  foreignCountry?: string
  // Reason
  reasonCode?: string
  // Documents
  documents?: Record<string, File>
}

// ── Admin dashboard types ────────────────────────────────────

export interface DashboardStats {
  newToday: number
  newThisWeek: number
  newThisMonth: number
  awaitingReview: number
  correctionRequired: number
  submittedToIrs: number
  issuedThisMonth: number
  overdue: number
  revenueThisMonth: number
  revenueLastMonth: number
  avgDaysToIssued: number
}

export interface AgentWorkload {
  agent_id: string
  agent_name: string
  assigned: number
  pending_review: number
  overdue: number
}
