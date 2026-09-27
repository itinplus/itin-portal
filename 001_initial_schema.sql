-- ============================================================
-- ITIN Plus Portal — Initial Schema
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('customer', 'agent', 'manager', 'super_admin');

create type application_status as enum (
  'account_created',
  'payment_pending',
  'documents_pending',
  'documents_uploaded',
  'under_review',
  'correction_required',
  'w7_prepared',
  'awaiting_signature',
  'documents_certified',
  'submitted_to_irs',
  'irs_processing',
  'itin_issued',
  'rejected_by_irs',
  'closed'
);

create type document_status as enum ('missing', 'uploaded', 'under_review', 'approved', 'rejected');

create type virus_scan_status as enum ('pending', 'clean', 'infected', 'error');

create type message_sender_type as enum ('customer', 'staff');

create type payment_status as enum ('pending', 'paid', 'refunded', 'failed');

create type email_delivery_status as enum ('pending', 'sent', 'delivered', 'bounced', 'failed');

create type applicant_relationship as enum ('primary', 'spouse', 'dependent');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null default 'customer',
  full_name     text not null default '',
  email         text not null,
  phone         text,
  country       text,
  language      text not null default 'en',
  two_fa_enabled boolean not null default false,
  two_fa_secret  text,          -- encrypted, set when 2FA enrolled
  avatar_url    text,
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- RLS
alter table profiles enable row level security;
create policy "Users see own profile"         on profiles for select using (auth.uid() = id);
create policy "Users update own profile"      on profiles for update using (auth.uid() = id);
create policy "Staff see all profiles"        on profiles for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','manager','super_admin'))
);
create policy "Super admin manages profiles"  on profiles for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin')
);

-- ============================================================
-- PACKAGES
-- ============================================================

create table packages (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  description     text,
  price_usd       integer not null,  -- cents
  stripe_price_id text unique,
  features        jsonb default '[]',
  sort_order      integer default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table packages enable row level security;
create policy "Anyone can read active packages" on packages for select using (active = true);
create policy "Super admin manages packages"    on packages for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin')
);

-- ============================================================
-- APPLICATIONS
-- ============================================================

create table applications (
  id                      uuid primary key default uuid_generate_v4(),
  public_id               text unique not null,  -- ITN-2026-000123
  customer_id             uuid not null references profiles(id),
  package_id              uuid references packages(id),
  status                  application_status not null default 'account_created',
  assigned_agent_id       uuid references profiles(id),
  reason_code             text,      -- W-7 reason codes a-h
  stage_entered_at        timestamptz not null default now(),
  expected_completion_date date,
  irs_tracking_number     text,
  courier                 text,
  submitted_to_irs_at     timestamptz,
  itin_issued_at          timestamptz,
  itin_encrypted          text,      -- AES-256 encrypted ITIN
  stripe_session_id       text,
  amount_paid_cents       integer,
  notes                   text,      -- internal staff notes
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Auto-generate public_id
create sequence application_seq start 1;
create or replace function generate_application_public_id() returns trigger as $$
begin
  new.public_id := 'ITN-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('application_seq')::text, 6, '0');
  return new;
end;
$$ language plpgsql;
create trigger set_application_public_id before insert on applications
  for each row when (new.public_id is null or new.public_id = '')
  execute function generate_application_public_id();

alter table applications enable row level security;
create policy "Customers see own applications" on applications for select
  using (auth.uid() = customer_id);
create policy "Customers insert own applications" on applications for insert
  with check (auth.uid() = customer_id);
create policy "Agents see assigned applications" on applications for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','manager','super_admin'))
  );
create policy "Staff update applications" on applications for update
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','manager','super_admin'))
  );

-- ============================================================
-- APPLICANTS (W-7 personal data — per person per application)
-- ============================================================

create table applicants (
  id                    uuid primary key default uuid_generate_v4(),
  application_id        uuid not null references applications(id) on delete cascade,
  relationship          applicant_relationship not null default 'primary',
  -- W-7 fields (sensitive fields stored encrypted)
  first_name            text not null,
  last_name             text not null,
  name_at_birth         text,
  date_of_birth         text,      -- encrypted: YYYY-MM-DD
  country_of_birth      text,
  city_of_birth         text,
  gender                text,
  country_of_citizenship text,
  foreign_tax_id        text,      -- encrypted
  passport_number       text,      -- encrypted: last 4 shown unencrypted below
  passport_last4        text,      -- plain text for search/display
  us_visa_number        text,
  us_visa_type          text,
  us_visa_expiry        text,
  foreign_address_line1 text,
  foreign_address_line2 text,
  foreign_city          text,
  foreign_state         text,
  foreign_postal        text,
  foreign_country       text,
  us_address_line1      text,
  us_address_line2      text,
  us_city               text,
  us_state              text,
  us_zip                text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table applicants enable row level security;
create policy "Customers see own applicants" on applicants for select
  using (exists (select 1 from applications a where a.id = application_id and a.customer_id = auth.uid()));
create policy "Staff see all applicants" on applicants for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','manager','super_admin')));
create policy "Staff update applicants" on applicants for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','manager','super_admin')));
create policy "Customers insert applicants" on applicants for insert
  with check (exists (select 1 from applications a where a.id = application_id and a.customer_id = auth.uid()));

-- ============================================================
-- DOCUMENT REQUIREMENTS (configurable checklist)
-- ============================================================

create table document_requirements (
  id                   uuid primary key default uuid_generate_v4(),
  package_id           uuid references packages(id),  -- null = applies to all
  code                 text not null,
  label                text not null,
  description          text,
  required             boolean not null default true,
  accepted_alternatives text[],
  sort_order           integer default 0,
  active               boolean not null default true
);

alter table document_requirements enable row level security;
create policy "Anyone reads doc requirements" on document_requirements for select using (true);
create policy "Super admin manages requirements" on document_requirements for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'));

-- ============================================================
-- DOCUMENTS
-- ============================================================

create table documents (
  id                uuid primary key default uuid_generate_v4(),
  application_id    uuid not null references applications(id) on delete cascade,
  applicant_id      uuid references applicants(id),
  requirement_code  text not null,
  -- storage
  storage_path      text not null,  -- private bucket path
  file_name         text not null,
  mime_type         text not null,
  size_bytes        bigint,
  version           integer not null default 1,
  -- status
  status            document_status not null default 'uploaded',
  rejection_reason  text,           -- from preset list
  rejection_note    text,           -- free-text
  -- virus scan
  virus_scan_status virus_scan_status not null default 'pending',
  -- who / when
  uploaded_by       uuid references profiles(id),
  reviewed_by       uuid references profiles(id),
  reviewed_at       timestamptz,
  uploaded_at       timestamptz not null default now(),
  -- uploader type: 'customer' or 'staff'
  uploader_type     text not null default 'customer'
);

alter table documents enable row level security;
create policy "Customers see own documents" on documents for select
  using (exists (select 1 from applications a where a.id = application_id and a.customer_id = auth.uid()));
create policy "Customers upload to own application" on documents for insert
  with check (exists (select 1 from applications a where a.id = application_id and a.customer_id = auth.uid()));
create policy "Staff see all documents" on documents for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','manager','super_admin')));
create policy "Staff manage documents" on documents for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','manager','super_admin')));

-- ============================================================
-- STATUS HISTORY
-- ============================================================

create table status_history (
  id              uuid primary key default uuid_generate_v4(),
  application_id  uuid not null references applications(id) on delete cascade,
  from_status     application_status,
  to_status       application_status not null,
  changed_by      uuid references profiles(id),
  note            text,
  client_visible  boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table status_history enable row level security;
create policy "Customers see visible history" on status_history for select
  using (
    client_visible = true
    and exists (select 1 from applications a where a.id = application_id and a.customer_id = auth.uid())
  );
create policy "Staff see all history" on status_history for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','manager','super_admin')));
create policy "Staff insert history" on status_history for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','manager','super_admin')));

-- ============================================================
-- MESSAGES
-- ============================================================

create table messages (
  id               uuid primary key default uuid_generate_v4(),
  application_id   uuid not null references applications(id) on delete cascade,
  sender_id        uuid not null references profiles(id),
  body             text not null,
  attachments      jsonb default '[]',  -- [{name, storage_path, size}]
  is_internal_note boolean not null default false,  -- staff-only
  read_at          timestamptz,  -- when customer/staff read it
  created_at       timestamptz not null default now()
);

alter table messages enable row level security;
create policy "Customers see non-internal messages" on messages for select
  using (
    is_internal_note = false
    and exists (select 1 from applications a where a.id = application_id and a.customer_id = auth.uid())
  );
create policy "Customers send messages" on messages for insert
  with check (
    is_internal_note = false
    and exists (select 1 from applications a where a.id = application_id and a.customer_id = auth.uid())
    and auth.uid() = sender_id
  );
create policy "Staff see all messages" on messages for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','manager','super_admin')));
create policy "Staff send messages" on messages for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','manager','super_admin')));

-- ============================================================
-- PAYMENTS
-- ============================================================

create table payments (
  id                uuid primary key default uuid_generate_v4(),
  application_id    uuid not null references applications(id) on delete cascade,
  stripe_session_id text unique,
  stripe_payment_id text,
  amount_cents      integer not null,
  currency          text not null default 'usd',
  status            payment_status not null default 'pending',
  invoice_url       text,
  receipt_url       text,
  refund_id         text,
  refunded_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table payments enable row level security;
create policy "Customers see own payments" on payments for select
  using (exists (select 1 from applications a where a.id = application_id and a.customer_id = auth.uid()));
create policy "Staff see all payments" on payments for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','manager','super_admin')));
create policy "Service role manages payments" on payments for all
  using (auth.role() = 'service_role');

-- ============================================================
-- EMAIL TEMPLATES
-- ============================================================

create table email_templates (
  id         uuid primary key default uuid_generate_v4(),
  key        text not null,      -- e.g. 'document_uploaded'
  language   text not null default 'en',
  subject    text not null,
  body_html  text not null,
  variables  text[] default '{}',  -- available template variables
  active     boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(key, language)
);

alter table email_templates enable row level security;
create policy "Staff read templates" on email_templates for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','manager','super_admin')));
create policy "Super admin manages templates" on email_templates for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'));

-- ============================================================
-- EMAIL LOGS
-- ============================================================

create table email_logs (
  id              uuid primary key default uuid_generate_v4(),
  template_key    text,
  to_email        text not null,
  to_name         text,
  application_id  uuid references applications(id),
  subject         text not null,
  provider_id     text,   -- Resend message ID
  status          email_delivery_status not null default 'pending',
  error           text,
  sent_at         timestamptz not null default now()
);

alter table email_logs enable row level security;
create policy "Staff see email logs" on email_logs for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','manager','super_admin')));
create policy "Service role inserts logs" on email_logs for insert
  using (auth.role() = 'service_role');

-- ============================================================
-- AUDIT LOGS
-- ============================================================

create table audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  actor_id    uuid references profiles(id),
  actor_email text,
  action      text not null,    -- e.g. 'document.view', 'status.change', 'login'
  entity      text,             -- e.g. 'document', 'application'
  entity_id   text,
  metadata    jsonb default '{}',
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

alter table audit_logs enable row level security;
create policy "Super admin reads audit logs" on audit_logs for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'));
create policy "Service role inserts audit logs" on audit_logs for insert
  using (auth.role() = 'service_role');
-- Also allow authenticated users to insert their own audit events
create policy "Auth users insert own audit logs" on audit_logs for insert
  with check (auth.uid() = actor_id);

-- ============================================================
-- SETTINGS
-- ============================================================

create table settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

alter table settings enable row level security;
create policy "Anyone reads settings" on settings for select using (true);
create policy "Super admin manages settings" on settings for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'));

-- ============================================================
-- REFERRAL CODES (Phase 2)
-- ============================================================

create table referral_codes (
  id            uuid primary key default uuid_generate_v4(),
  code          text unique not null,
  owner_id      uuid references profiles(id),
  discount_pct  integer not null default 10,
  uses          integer not null default 0,
  max_uses      integer,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table referral_codes enable row level security;
create policy "Anyone reads active referral codes" on referral_codes for select using (active = true);
create policy "Super admin manages referrals" on referral_codes for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'));

-- ============================================================
-- HELPER FUNCTION: auto-update updated_at
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_profiles_updated        before update on profiles        for each row execute function update_updated_at();
create trigger trg_applications_updated    before update on applications    for each row execute function update_updated_at();
create trigger trg_applicants_updated      before update on applicants      for each row execute function update_updated_at();
create trigger trg_payments_updated        before update on payments        for each row execute function update_updated_at();

-- ============================================================
-- FUNCTION: on new auth user → create profile
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- FUNCTION: log application status change → status_history
-- ============================================================

create or replace function log_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into status_history (application_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
    new.stage_entered_at := now();
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_log_status_change before update on applications
  for each row execute function log_status_change();

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_applications_customer    on applications(customer_id);
create index idx_applications_status      on applications(status);
create index idx_applications_agent       on applications(assigned_agent_id);
create index idx_applications_public_id   on applications(public_id);
create index idx_documents_application    on documents(application_id);
create index idx_documents_status         on documents(status);
create index idx_status_history_app       on status_history(application_id);
create index idx_messages_application     on messages(application_id);
create index idx_audit_logs_actor         on audit_logs(actor_id);
create index idx_audit_logs_entity        on audit_logs(entity, entity_id);
create index idx_email_logs_application   on email_logs(application_id);
