# ITIN Plus Portal

A production-ready ITIN application portal for **ITIN Plus Inc.** — built with Next.js 14, Supabase, Stripe, and Resend.

## What's included

### Customer Portal (`/portal/*`)
- Sign up / login with email, password, Google OAuth, magic link
- Multi-step application wizard (package → personal info → W-7 reason → documents → payment)
- Real-time application status with visual stepper
- Drag-and-drop document upload with client-side validation
- Secure document viewer with signed URLs (5-min expiry)
- In-app messaging with staff
- Billing history and invoices
- Profile management with 2FA

### Admin / Staff Portal (`/admin/*`)
- KPI dashboard with Recharts charts
- Applications table view + Kanban board
- Application detail: docs viewer, status change, W-7 generator, messages, timeline
- Client management
- Staff management (Super Admin)
- Settings: packages, prices, document checklists, email templates, branding
- Audit log (all document views, downloads, status changes)
- CSV export

### Automated emails (via Resend)
- Welcome + verify email
- Payment confirmed → upload your documents
- Document uploaded (to client + assigned agent)
- Document rejected with reason + re-upload link
- Status change notifications
- ITIN issued (no ITIN in email body — portal link only)
- Day 2, 5, 10 reminders for missing documents

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 App Router + TypeScript |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (private bucket) |
| Email | Resend |
| Payments | Stripe Checkout |
| UI | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Deployment | Vercel |

---

## Setup Instructions

### 1. Clone and install

```bash
git clone <your-repo>
cd itin-portal
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your project URL and anon key
3. In the Supabase dashboard → Storage: create a **private** bucket named `documents`
4. Run migrations:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

This runs `migrations/001_initial_schema.sql` and `002_seed_data.sql` automatically.

### 3. Set up Stripe

1. [stripe.com](https://stripe.com) → Create account
2. Create products/prices matching your packages. Copy the `price_id` for each.
3. Set up webhook endpoint: `https://portal.itinplus.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `charge.refunded`

### 4. Set up Resend

1. [resend.com](https://resend.com) → Create account
2. Add and verify your domain `itinplus.com`
3. Create API key

### 5. Configure environment variables

```bash
cp .env.example .env.local
# Fill in all values
```

Required values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `ENCRYPTION_KEY` (32 random characters for field encryption)

### 6. Deploy to Vercel

```bash
npx vercel --prod
```

Add all env vars in the Vercel dashboard.

### 7. Deploy Supabase Edge Functions

```bash
npx supabase functions deploy send-reminders
```

Set up the daily cron in Supabase dashboard → Edge Functions → Schedules:
- Function: `send-reminders`  
- Schedule: `0 9 * * *` (9am UTC daily)

### 8. Create first Super Admin

After deploying, sign up with your email, then in Supabase dashboard → Table Editor → `profiles` → update `role` to `super_admin` for your user.

---

## Security notes

- All document files are in a **private** storage bucket — never publicly accessible
- Signed URLs expire after 5 minutes and are logged in `audit_logs`
- Sensitive fields (passport number, ITIN, foreign tax ID, date of birth) are encrypted at rest
- Row Level Security is enabled on every table — customers can NEVER see other customers' data
- Staff sessions auto-expire after 30 minutes of inactivity (configure in Supabase Auth settings)
- 2FA is required for all staff (enforce in Supabase Auth → MFA settings)

**Important:** This application handles passport data, ITINs and tax information. Before going live, have a qualified security professional review the implementation and confirm compliance with IRS Publication 4557 and the FTC Safeguards Rule.

---

## Branding

Colors defined in `tailwind.config.ts`:
- Primary: `#0F2A44` (navy)
- Accent: `#f59e0b` (gold)

To update, change the CSS variables in `src/styles/globals.css`.

---

## Processing time

IRS processing time is configured in the `settings` table:
- `irs_processing_weeks_min`: 8
- `irs_processing_weeks_max`: 14

Change these in Admin → Settings, **not** in code.

---

## Support

- Email: apply@itinplus.com
- WhatsApp: +1 (305) 216-6992
