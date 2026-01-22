# Exam Vocab Boost

A TOEFL/IELTS Context + Usage Trainer that teaches test-safe vocabulary usage (collocations, register, grammar frames) via 10-minute adaptive drills, with a diagnostic "Score Leak Report" and one-time purchase upgrades.

## Features

- **Smart Diagnostic**: 6-8 minute test identifies vocabulary usage gaps
- **Score Leak Report**: Shows top weaknesses with personalized fix plans
- **Adaptive Practice**: 10-minute drills targeting your weakest areas
- **Progress Dashboard**: Track improvement across all categories
- **Cloud Sync**: Save progress across devices (with account)
- **One-time Purchase**: No subscriptions - pay once for lifetime access

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Auth**: Google OAuth via shared Supabase instance
- **Database**: Supabase (PostgreSQL with RLS)
- **Payments**: Stripe (one-time purchases)
- **Deploy**: Vercel

## File Structure

```
exam-vocab-boost/
├── app/
│   ├── api/
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts    # Create Stripe checkout session
│   │   │   └── webhook/route.ts     # Handle Stripe webhooks
│   │   └── sync/
│   │       ├── push/route.ts        # Push local data to cloud
│   │       └── pull/route.ts        # Pull cloud data to local
│   ├── checkout/
│   │   ├── success/page.tsx         # Purchase success page
│   │   └── cancel/page.tsx          # Purchase cancelled page
│   ├── dashboard/page.tsx           # Progress dashboard
│   ├── diagnostic/page.tsx          # Diagnostic test flow
│   ├── drill/page.tsx               # Adaptive practice drills
│   ├── pricing/page.tsx             # Pricing tiers
│   ├── report/page.tsx              # Score Leak Report
│   ├── globals.css                  # Global styles
│   ├── layout.tsx                   # Root layout with header
│   └── page.tsx                     # Landing page
├── components/
│   ├── GoogleAuth.tsx               # Google OAuth button
│   ├── Header.tsx                   # Site header/navigation
│   └── SyncPrompt.tsx               # Cloud sync prompt modal
├── data/
│   ├── seed-bundles.json            # Vocabulary bundles
│   ├── seed-passages.json           # Reading passages
│   └── seed-usage-items.json        # Standalone drill items
├── lib/
│   ├── adaptive.ts                  # Adaptive algorithm/SRS
│   ├── auth.ts                      # Auth utilities
│   ├── constants.ts                 # App constants
│   ├── storage.ts                   # localStorage utilities
│   └── types.ts                     # TypeScript types
├── supabase/
│   ├── schema.sql                   # Database schema
│   └── rls.sql                      # Row-level security policies
├── public/                          # Static assets
├── .env.example                     # Environment variables template
├── .gitignore
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## Database Schema

```sql
-- User profiles
profiles (user_id, exam_type, exam_date, target_score, l1, level_estimate)

-- Content
usage_bundles (id, exam_type, level, headword, tags, content)
bundle_items (id, bundle_id, item_type, prompt, choices, answer, explanation, error_tag)

-- User data
diagnostic_attempts (id, user_id, started_at, completed_at, results)
drill_sessions (id, user_id, created_at, mode, duration_sec, results)
user_bundle_state (user_id, bundle_id, ease, interval_days, due_at, last_result)

-- Purchases
entitlements (user_id, tier, active, purchased_at, stripe_customer_id, stripe_session_id)

-- Cloud sync
cloud_kv (user_id, key, value, updated_at)
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/stripe/checkout` | POST | Create Stripe checkout session |
| `/api/stripe/webhook` | POST | Handle Stripe webhook events |
| `/api/sync/push` | POST | Push local data to cloud |
| `/api/sync/pull` | POST | Pull cloud data to local |

## UI Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with "Try it now" CTA |
| `/diagnostic` | Diagnostic test flow (reading + usage scan) |
| `/report` | Score Leak Report with weakness analysis |
| `/drill` | Adaptive practice drills |
| `/dashboard` | Progress tracking dashboard |
| `/pricing` | Pricing tiers for one-time purchase |
| `/checkout/success` | Purchase success page |
| `/checkout/cancel` | Purchase cancelled page |

## Environment Variables

### From Shared Team (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | App-specific Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | App-specific Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | App-specific Supabase service role key |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |

### Project-Specific (New)

| Variable | Required | Feature |
|----------|----------|---------|
| `NEXT_PUBLIC_STRIPE_TIER1_PRICE_ID` | No | Pricing page - Full Access tier |
| `NEXT_PUBLIC_STRIPE_TIER2_PRICE_ID` | No | Pricing page - Full Access + Cram Mode tier |
| `NEXT_PUBLIC_APP_URL` | No | Stripe redirect URLs (defaults to localhost) |

## Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Deployment

```bash
# Deploy to Vercel
npx vercel --prod
```

## Auth Flow

1. User clicks "Sign in with Google"
2. Supabase redirects to Google OAuth
3. On success, user is redirected back
4. Auth state is stored globally (`window.AUTH_USER`)
5. User login is tracked in shared `user_tracking` table

## Sync Flow

1. Anonymous user data is stored in localStorage
2. After meaningful engagement, user is prompted to sign in
3. On sign in, sync prompt offers to save local data
4. Data is pushed to `cloud_kv` table and normalized tables
5. On new device sign-in, data is pulled and merged

---

**ACTIVE**: Supabase (auth + database), Stripe (payments), Vercel (hosting)

**INACTIVE (needs setup)**:
- `NEXT_PUBLIC_STRIPE_TIER1_PRICE_ID`: Create Stripe price for Full Access ($39.99)
- `NEXT_PUBLIC_STRIPE_TIER2_PRICE_ID`: Create Stripe price for Full Access + Cram Mode ($59.99)
