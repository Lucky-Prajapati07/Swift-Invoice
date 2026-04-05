# Swift-Invoice

Swift-Invoice is a multi-tenant SaaS invoicing and business operations platform for Indian businesses. It supports GST-aware invoice generation, client and transaction management, reports/export, email OTP signup verification, and subscription billing with Razorpay.

## Highlights

- Multi-tenant architecture (one business workspace per user)
- Role-based access (`USER`, `ADMIN`)
- Email/password auth with NextAuth credentials provider
- OTP-based email verification during signup
- 30-day trial subscription lifecycle
- Razorpay payment-link based plan upgrades (`MONTHLY`, `YEARLY`)
- Razorpay webhook handling with event deduplication
- Client management (customer/supplier)
- Invoice creation and detailed GST-compatible PDF generation
- Public shareable invoice links via token
- Transaction tracking (income/expense)
- Reports with filters and CSV/PDF export
- Business logo upload API (JPG/PNG up to 5 MB)
- Admin console for users, subscriptions, pricing, notifications, and analytics

## Tech Stack

- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Runtime/UI: React 19, Tailwind CSS 4, Radix UI
- Auth: NextAuth v5 (credentials)
- Database: PostgreSQL (Neon serverless driver)
- Email: Nodemailer (SMTP)
- Payments: Razorpay payment links + webhooks
- PDF: `pdf-lib`, `jspdf`, `jspdf-autotable`

## Project Structure

```text
app/
  (auth)/           # login, signup, verify-email
  (dashboard)/      # main business dashboard pages
  (admin)/          # admin panel
  api/
    auth/[...nextauth]/
    invoices/[id]/pdf/
    payments/razorpay/webhook/
    reports/export/
    upload/logo/
  invoice/[token]/  # public invoice view
components/
  dashboard/
  ui/
lib/
  actions/          # server actions
  auth.ts           # NextAuth config + guards
  db.ts             # Neon SQL client with retry/backoff
  mailer.ts         # SMTP OTP email delivery
scripts/            # ordered SQL migrations (001..021)
public/uploads/     # uploaded assets (e.g., logos)
```

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database (Neon recommended, but any compatible Postgres works)
- SMTP credentials for email OTP in production
- Razorpay account for paid subscription flows

## Environment Variables

Create `.env.local` in the project root.

Required for core app:

```env
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
AUTH_SECRET="replace_with_a_long_random_string"
OTP_SECRET="replace_with_a_strong_random_string"
```

Required for email OTP (production):

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your_app_password"
SMTP_FROM="Swift-Invoice <no-reply@yourdomain.com>"
```

Required for billing/payment flow:

```env
RAZORPAY_KEY_ID="rzp_xxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxx"
RAZORPAY_WEBHOOK_SECRET="whsec_xxxxx"
APP_BASE_URL="http://localhost:3000"
# or NEXTAUTH_URL="http://localhost:3000"
```

Notes:

- In non-production, if SMTP is not configured, OTP is logged to server console for development.
- `APP_BASE_URL` is used for Razorpay callback URLs.

## Installation

```bash
npm install
```

## Database Setup

SQL migrations are in `scripts/` and are versioned in execution order (`001-...sql` through `021-...sql`).

### Option A: Run manually (recommended)

Execute each script in ascending order against your database.

### Option B: PowerShell one-liner with `psql`

```powershell
Get-ChildItem .\scripts\*.sql |
  Sort-Object Name |
  ForEach-Object { psql "$env:DATABASE_URL" -f $_.FullName }
```

Important:

- Ensure extension `uuid-ossp` is available (created by initial migration).
- If you already have an older schema, later migrations include `IF NOT EXISTS` safeguards for incremental upgrades.

## Running the App

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

Lint:

```bash
npm run lint
```

## Default Scripts

From `package.json`:

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm start` - run production server
- `npm run lint` - run ESLint

## Core Routes

- `/login` - user sign in
- `/signup` - user registration
- `/verify-email` - OTP verification flow
- `/dashboard` - main overview
- `/dashboard/clients` - client management
- `/dashboard/invoices` - invoices list/manage
- `/dashboard/transactions` - income/expense tracking
- `/dashboard/reports` - reporting + exports
- `/dashboard/settings` - business settings
- `/dashboard/settings/billing` - subscription & upgrades
- `/admin` - admin control center (admin role only)
- `/invoice/[token]` - public invoice view by share token

## API Endpoints

- `POST /api/auth/[...nextauth]` - NextAuth handler
- `GET /api/invoices/[id]/pdf` - generate/download invoice PDF
- `GET /api/reports/export` - export reports (`format=csv|pdf`)
- `POST /api/upload/logo` - upload business logo (JPG/PNG, max 5 MB)
- `POST /api/payments/razorpay/webhook` - Razorpay webhook receiver

## Subscription and Billing Flow

1. New user signup creates a trial subscription (30 days).
2. Billing page creates Razorpay payment links for monthly/yearly plans.
3. Razorpay webhook verifies signature and updates subscription state.
4. Duplicate webhook events are safely ignored using stored event IDs.

## Admin Capabilities

Admin module includes:

- Dashboard KPIs (users, subscription split, revenue)
- User management (search, block/unblock, delete)
- Business directory and GST/non-GST filtering
- Broadcast and reminder notifications
- Subscription oversight and plan status tracking
- Global pricing settings (`monthly_price`, `yearly_price`)

## File Upload Behavior

Business logos are stored under `public/uploads/logos`.

Validation:

- Allowed MIME types: `image/png`, `image/jpeg`, `image/jpg`
- Max upload size: 5 MB
- Returned URL format: `/uploads/logos/<generated-file>`

## Security Notes

- Passwords are hashed with `bcryptjs`.
- OTPs are hashed with SHA-256 + secret salt (`OTP_SECRET`).
- Webhooks are HMAC-verified (`x-razorpay-signature`).
- DB access is scoped through business/user context in server actions.
- Admin area enforces role checks (`requireAdmin`).

## Deployment Notes

- Set all production environment variables before deploy.
- Use HTTPS in production for callbacks and secure auth cookies.
- Ensure webhook endpoint is publicly reachable:
  - `https://<your-domain>/api/payments/razorpay/webhook`
- Configure `RAZORPAY_WEBHOOK_SECRET` from Razorpay dashboard.
- Ensure persistent writable storage strategy for uploaded files if deploying to ephemeral environments.

## Troubleshooting

- `DATABASE_URL environment variable is not set`:
  - Confirm `.env.local` exists and `DATABASE_URL` is valid.
- OTP emails not sending in production:
  - Verify SMTP vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).
- Payment does not activate subscription:
  - Validate webhook secret and endpoint URL.
  - Check webhook event delivery logs in Razorpay.
- Missing DB columns/tables:
  - Re-run pending SQL migrations in order.

## Current Status

The repository currently uses `main` as both working and default branch.

## License

No license file is currently included in this repository. Add one if you plan to open-source or distribute under specific terms.
