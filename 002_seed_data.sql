-- ============================================================
-- ITIN Plus — Seed Data
-- ============================================================

-- ── Packages ────────────────────────────────────────────────
insert into packages (name, description, price_usd, features, sort_order) values
  ('ITIN New Application',     'Full ITIN application for first-time applicants',        9900, '["CAA-certified","No passport mailing","Direct IRS submission","8–14 week processing"]', 1),
  ('ITIN Renewal',             'Renew an expired or expiring ITIN',                      19900,'["Full renewal service","CAA-certified"]', 2),
  ('ITIN + Tax Return',        'ITIN application bundled with 1040-NR filing',           19900,'["ITIN application","1040-NR preparation","CAA-certified"]', 3),
  ('ITIN for Dependents',      'Apply for a dependent spouse or child ITIN',              9900,'["Dependent W-7 preparation","CAA-certified"]', 4),
  ('ITIN + US LLC Bundle',     'ITIN plus US LLC formation and EIN',                     34900,'["ITIN application","LLC formation","EIN","Operating agreement"]', 5),
  ('EIN Add-on',               'Federal Employer Identification Number add-on',           5000,'["SS-4 preparation","IRS submission"]', 6);

-- ── Document requirements (default for all packages) ────────
insert into document_requirements (code, label, description, required, sort_order) values
  ('passport',         'Valid Passport',              'Full-colour scan of all pages. Must be valid (not expired).',       true,  1),
  ('national_id',      'National ID Card',            'Front and back. One of two alternative identity documents.',        false, 2),
  ('drivers_license',  'Driver''s License',           'Front and back. Foreign or US. One of two alternative documents.',  false, 3),
  ('us_visa',          'US Visa',                     'Copy of the visa page in your passport.',                          false, 4),
  ('birth_cert',       'Birth Certificate',           'Required for dependents under 18.',                                 false, 5),
  ('tax_return',       'US Tax Return (1040-NR)',     'Most recent filed return if reason code b applies.',                false, 6),
  ('bank_letter',      'US Bank Letter',              'Letter from US bank requiring ITIN. For exception applicants.',    false, 7),
  ('exception_doc',    'Exception Documentation',    'Proof of treaty benefit, business letter, etc.',                   false, 8);

-- ── Settings ────────────────────────────────────────────────
insert into settings (key, value) values
  ('irs_processing_weeks_min',    '8'),
  ('irs_processing_weeks_max',    '14'),
  ('reminder_days',               '[2, 5, 10]'),
  ('stage_expected_days', '{
    "account_created": 1,
    "payment_pending": 2,
    "documents_pending": 5,
    "documents_uploaded": 2,
    "under_review": 3,
    "correction_required": 5,
    "w7_prepared": 2,
    "awaiting_signature": 3,
    "documents_certified": 1,
    "submitted_to_irs": 3,
    "irs_processing": 98
  }'),
  ('company_name',    '"ITIN Plus Inc."'),
  ('support_email',   '"apply@itinplus.com"'),
  ('whatsapp',        '"+13052166992"'),
  ('logo_url',        '"/logo.png"'),
  ('primary_color',   '"#0F2A44"'),
  ('accent_color',    '"#f59e0b"'),
  ('data_retention_days', '730');

-- ── Email templates ──────────────────────────────────────────
insert into email_templates (key, language, subject, body_html, variables) values
  ('welcome', 'en',
   'Welcome to ITIN Plus — Verify Your Email',
   '<h2>Welcome, {{client_first_name}}!</h2><p>Please verify your email to get started.</p><p><a href="{{verify_link}}">Verify Email</a></p>',
   array['client_first_name','verify_link']),

  ('payment_success', 'en',
   'Payment Confirmed — Upload Your Documents | {{application_id}}',
   '<h2>Payment received — thank you!</h2><p>Your application <strong>{{application_id}}</strong> is confirmed. Next step: upload your documents.</p><p><a href="{{portal_link}}">Upload Documents Now</a></p>',
   array['client_first_name','application_id','portal_link']),

  ('document_uploaded', 'en',
   'We received your {{document_name}} — {{application_id}}',
   '<p>Hi {{client_first_name}},</p><p>We received your <strong>{{document_name}}</strong>. Our team will review it within 24 hours.</p><p><a href="{{portal_link}}">View Application</a></p>',
   array['client_first_name','document_name','application_id','portal_link']),

  ('document_rejected', 'en',
   'Action Required: Please Re-upload {{document_name}} — {{application_id}}',
   '<p>Hi {{client_first_name}},</p><p>Your <strong>{{document_name}}</strong> could not be accepted.</p><p><strong>Reason:</strong> {{rejection_reason}}</p><p>Please re-upload a corrected version.</p><p><a href="{{portal_link}}">Re-upload Now</a></p>',
   array['client_first_name','document_name','rejection_reason','application_id','portal_link']),

  ('status_change', 'en',
   'Application Update: {{status}} — {{application_id}}',
   '<p>Hi {{client_first_name}},</p><p>Your application <strong>{{application_id}}</strong> status has been updated to: <strong>{{status}}</strong>.</p><p>{{status_description}}</p><p><a href="{{portal_link}}">View Status</a></p>',
   array['client_first_name','status','status_description','application_id','portal_link']),

  ('itin_issued', 'en',
   'Your ITIN Has Been Issued! — {{application_id}}',
   '<p>Congratulations {{client_first_name}}!</p><p>Your ITIN has been issued by the IRS. Log in to your portal to download your CP565 notice.</p><p><strong>Never share your ITIN by email.</strong> It is available securely in your portal.</p><p><a href="{{portal_link}}">Download CP565 Notice</a></p>',
   array['client_first_name','application_id','portal_link']),

  ('reminder_documents', 'en',
   'Reminder: Documents Still Needed — {{application_id}}',
   '<p>Hi {{client_first_name}},</p><p>We are still waiting for your documents to proceed with application <strong>{{application_id}}</strong>.</p><p>Missing: {{missing_documents}}</p><p><a href="{{portal_link}}">Upload Now</a></p>',
   array['client_first_name','application_id','missing_documents','portal_link']),

  ('new_message', 'en',
   'New Message from ITIN Plus — {{application_id}}',
   '<p>Hi {{client_first_name}},</p><p>You have a new message from our team regarding application <strong>{{application_id}}</strong>.</p><p>Log in to read and reply.</p><p><a href="{{portal_link}}">Read Message</a></p>',
   array['client_first_name','application_id','portal_link']);
