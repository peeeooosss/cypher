# CYPHR Project Memory — Full Conversation Log

## Project Overview
- **Stack**: Next.js 16 App Router (`src/app`), Prisma + Postgres (Neon), Socket.io (separate `server/socket.ts`), NextAuth, Tailwind, `"type": "module"`
- **Project root**: `/Users/apple/Desktop/Cyphr/callout`
- **GitHub**: `https://github.com/peeeooosss/cypher.git`
- **Live site**: `https://www.joincyphr.in`
- **Vercel project**: `dhanda/cypher` (auto-deploys from `main` branch)
- **DB**: Neon Postgres, schema synced via `prisma db push` (not migrations)
- **Socket.io server**: separate process (`npm run socket`), not part of Vercel

---

## Session 1: Razorpay + Judge Feedback + Marketplace Features

### What was completed
1. **Razorpay Payment Integration**
   - Installed `razorpay` npm package
   - Created `src/lib/razorpay.ts` — singleton client, `toPaise()`, `verifyRazorpaySignature()`
   - Created `POST /api/payments/create-order` — creates Razorpay orders for: EVENT_FLAT_FEE, EVENT_COMMISSION, GIG_POST, GIG_WORK, GIG_COMMISSION, GIG_CONNECTION
   - Created `POST /api/payments/verify` — HMAC-SHA256 signature check, marks Payment PAID, applies side effects idempotently
   - Created `src/components/razorpay-checkout.tsx` — loads checkout.js, opens modal, calls verify
   - Replaced all manual UPI flows: event flat fee, event commission, gig posting, gig work access
   - Test keys in `.env`: `RAZORPAY_KEY_ID=rzp_test_TQlzpeIASLHzRi`

2. **Judge Feedback (Both Corners)**
   - `MatchScore` model extended with `feedbackRed`/`feedbackBlue` fields
   - `judge-dashboard.tsx` renders two `FeedbackSelect` components (Red + Blue)
   - `feedback-select.tsx` allows template + custom text simultaneously
   - Socket handler resolves per-corner feedback with template fallbacks + backward compat
   - Leaderboard renders per-judge feedback for both dancers

3. **Judge Code with Name**
   - `POST /api/events/[eventId]/judge-slots` accepts `judgeUserId` (links artist) or `name` (manual)
   - `GET /api/artists/search` — organizer-accessible autocomplete
   - `JudgeCodeForm` component with directory/manual toggle replaced `GenerateJudgeCodeButton`

4. **Artist Scoreboard**
   - `src/components/artist-scoreboard.tsx` — detailed per-round per-judge scores
   - Artist dashboard shows roster rounds and battle matches with scores

5. **Artist Availability & Min Pricing**
   - `ArtistAvailability` model added to schema
   - `GET/POST /api/me/availability`, `DELETE /api/me/availability/[id]`
   - `src/components/artist-availability.tsx` — date ranges + min judging/workshop rates
   - `PATCH /api/users/me` extended for `minJudgingPricePerDay`/`minWorkshopPricePerDay`

6. **In-App Messaging**
   - `Conversation`/`Message` models added
   - Auto-created on gig application accept
   - `GET /api/conversations`, `GET/POST /api/conversations/[id]`
   - `MessagesPanel` component integrated into `/artist/gigs` and `/organizer/gigs`

7. **Commission Flow**
   - `POST /api/gigs/[gigId]/award` — computes 10% commission from awarded amount
   - `GigAwardPanel` in `gig-manager.tsx` — shows award form + RazorpayCheckout for commission

8. **Deployment**
   - Pushed `b2e4e37` (48 files, +3000/-604) to `origin/main`
   - Deployed to Vercel (manual `vercel --prod` — auto-deploy had transient Vercel infra issues with 0ms build duration)

---

## Session 2: Payment Automation + Admin Analytics

### User requirements
- Organizers should get automatic access after Razorpay payment (no admin verification)
- Artists should get marketplace access after Razorpay payment (no admin verification)
- Admin panel should show all data/analytics professionally
- Commission payment via Razorpay should unlock event completion

### Current state (from audit)
- **Razorpay already automates** flat fee, commission, gig posting, gig work, gig connection — `/api/payments/verify` applies side effects immediately after signature verification
- **Event registration entry fees** still use UPI/manual flow (organizer clicks "Mark paid") — this is the remaining manual step
- **Commission gate**: `PATCH /api/events/[eventId]/route.ts` checks `commissionPaymentStatus === "VERIFIED"` before allowing COMPLETED status — already works with Razorpay
- **Gig work expiry**: `gigWorkExpiresAt` is set on payment verification; access check is `expiresAt > now()`
- **Missing from admin**: payment ledger from `Payment` model, revenue by type, organizer funnel, marketplace metrics, days remaining for gig work

### Files audited
- `src/app/api/payments/verify/route.ts` — all side effects mapped
- `src/app/api/events/[eventId]/route.ts` — completion gate at line 94-117
- `src/app/api/payments/create-order/route.ts` — all payment types mapped
- `src/lib/admin.ts` — all current queries and gaps identified
- `src/app/admin/**` — all pages reviewed

### Admin analytics gaps identified
- "Categories by registrations" chart counts category rows, not registrations (bug)
- Organizer detail "Regs" column shows category count (bug)
- No actual event entry-fee revenue metric
- No gig-work days remaining display anywhere
- Payment model completely unused in admin reporting
- No date comparison, no pagination, no export

---

## Session 3: Avatar Upload + Public/Private Profiles

### What was implemented

1. **Schema Change**
   - Added `isProfilePublic Boolean @default(true)` to `User` model
   - Ran `prisma db push` + `prisma generate`

2. **Vercel Blob Storage**
   - Installed `@vercel/blob`
   - Created blob store `cypher-avatars` (public, iad1) via `vercel blob create-store`
   - `BLOB_READ_WRITE_TOKEN` auto-linked to project

3. **Avatar Upload API**
   - `POST /api/users/me/avatar` — validates type (JPG/PNG/WebP, ≤5MB), uploads to Vercel Blob, stores URL in `User.avatarUrl`
   - `DELETE /api/users/me/avatar` — removes blob + nulls field

4. **Profile Form Updated**
   - `ArtistProfileForm` now has: avatar upload/remove/change preview, public/private visibility toggle
   - Upload happens immediately on file selection (autosave avatar)
   - Privacy toggle with plain-language explanation

5. **Privacy Enforcement (Server-Side)**
   - `src/lib/artists.ts`: `getDirectoryArtists(viewerRole?)` and `getArtistProfile(userId, viewerRole?)`
   - Visitors/judges → public profiles only
   - Logged-in organizers/artists/admins → all profiles
   - Private profiles return 404 to anonymous visitors
   - Suspended artists excluded
   - Removed `email` from public profile projection

6. **Avatar Display Locations**
   - Artist dashboard (with upload/remove UI)
   - Public directory cards
   - Public profile page (header)
   - Organizer gig applicant cards
   - Navigation bar (small circle next to sign-out)
   - Admin artist list + detail pages
   - Judge live-match view (already worked via `avatarUrl` field)

7. **Auth/Session**
   - Added `avatarUrl` to NextAuth JWT + session
   - Updated `src/types/next-auth.d.ts` with `avatarUrl` field
   - Updated `src/lib/auth.ts` to include `avatarUrl` in authorize, jwt, session callbacks

### Commit: `ae24885` — 19 files, +675/-56

---

## Session 4: Favicon Fix

### What was implemented
- Removed default `src/app/favicon.ico` (was serving Vercel triangle)
- Created `public/Favicon.svg` — square black bg, white broken ring, red center dot (CYPHR brand mark)
- Created `public/apple-icon.svg` — 180px version for iOS home screen
- Updated `src/app/layout.tsx` metadata: `icons: { icon: "/Favicon.svg", apple: "/apple-icon.svg" }`
- Note: moved from `src/app/icon.svg` to `public/` per user preference

### Commit: `3d1b125` (initial), `c37e3dd` (move to public/)

---

## Session 5: Razorpay Credentials + Checkout Improvements

### What was completed
1. **Razorpay credentials updated** — switched to new test keys in `.env`:
   - `RAZORPAY_KEY_ID=rzp_test_TRePXGGkL6L3Dw`
   - `RAZORPAY_KEY_SECRET=SRdtJ4LTbd8w5C0RkIGH9Tch`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_TRePXGGkL6L3Dw`

2. **payment.failed handler added** to `src/components/razorpay-checkout.tsx`:
   - `Window.Razorpay` type extended with `on()` method
   - `rzp.on("payment.failed", ...)` shows error message to user
   - Handles modal dismiss and payment failures gracefully

---

## Session 6: Pricing Model Overhaul

### What changed
Replaced category-count-based event flat fee with event-type-based pricing. Removed gig commission (10%). Bumped event commission from 1.5% → 2.99%.

### New pricing model
| Item | Price | Notes |
|---|---|---|
| Event — Workshop | ₹99 | flat fee at creation |
| Event — Underground Battle | ₹199 | flat fee at creation |
| Event — Competition (Dance/Music) | ₹249 | flat fee at creation |
| Event commission | 2.99% | on confirmed entry fees, settled at completion |
| Gig posting | ₹199 | flat fee to publish |
| Gig commission | **removed** | was 10% of awarded amount |
| Marketplace access | ₹99 / 3 months | artist subscription |
| Connection (unlock chat) | ₹49 | per accepted gig |

### Marketing copy added
- **Gig posting** (`gig-manager.tsx`): "Why spend on Meta ads? You'll get your target audience right here. No extra commission, no extra tension for organizers."
- **Event form** (`event-form.tsx`): "Unlimited categories and unlimited phases — one flat fee. Later, just 2.99% per confirmed entry — taken at event completion."

### Files modified
1. `src/lib/pricing.ts` — replaced `EVENT_FLAT_FEES` + `flatFeeForCategoryCount` with `EVENT_TYPE_FEES` + `flatFeeForEventType`; `GIG_FLAT_FEE` 149→199; removed `GIG_COMMISSION_RATE`, `commissionFor`
2. `src/app/api/events/route.ts` — `eventType` now required; `flatFee` derived from type; removed `categoryCount`
3. `src/app/api/events/[eventId]/route.ts` — PATCH recomputes `flatFee` on type change if not paid
4. `src/components/event-form.tsx` — event type required (drives live fee display); removed category-count input
5. `src/app/api/payments/create-order/route.ts` — removed `GIG_COMMISSION` case
6. `src/app/api/payments/verify/route.ts` — removed `GIG_COMMISSION` side-effect
7. `src/app/api/gigs/[gigId]/award/route.ts` — no more commission calc; award just sets `awardedAmount` + `status: FILLED`
8. `src/components/gig-manager.tsx` — dynamic ₹199 fee + marketing copy
9. `src/components/razorpay-checkout.tsx` — `payment.failed` handler + `on()` type

### Commits: `2b2be4f` — 11 files, +70/-88

### Notes
- No DB migration — `GIG_COMMISSION`/`commissionDue`/`categoryCount` columns retained but unused
- Event commission fields (`commissionDue`, `commissionPaid`, etc.) still active
- `PaymentType.GIG_COMMISSION` enum value remains in schema (no migration needed)

---

## Key Files Reference

### Schema
- `prisma/schema.prisma` — all models, enums, fields

### Payment System
- `src/lib/razorpay.ts` — Razorpay singleton + helpers
- `src/lib/pricing.ts` — `COMMISSION_RATE` (0.0299), `GIG_FLAT_FEE` (199), `EVENT_TYPE_FEES`, `GIG_WORK_FEE`, `GIG_CONNECTION_FEE`
- `src/app/api/payments/create-order/route.ts` — order creation per type (EVENT_FLAT_FEE, EVENT_COMMISSION, GIG_POST, GIG_WORK, GIG_CONNECTION)
- `src/app/api/payments/verify/route.ts` — signature verification + side effects
- `src/components/razorpay-checkout.tsx` — frontend checkout component with `payment.failed` handler

### Profile & Privacy
- `src/app/api/users/me/avatar/route.ts` — avatar upload/delete
- `src/app/api/users/me/route.ts` — profile PATCH (includes isProfilePublic)
- `src/components/artist-profile-form.tsx` — avatar + privacy UI
- `src/lib/artists.ts` — privacy-aware directory + profile queries
- `src/components/artist-directory.tsx` — directory cards with avatars
- `src/app/artist/directory/[userId]/page.tsx` — public profile page
- `src/lib/auth.ts` — NextAuth config with avatarUrl in session
- `src/types/next-auth.d.ts` — augmented session/JWT types

### Messaging
- `src/app/api/conversations/route.ts` — list conversations
- `src/app/api/conversations/[id]/route.ts` — thread + send
- `src/components/messages-panel.tsx` — chat UI

### Judge System
- `server/socket.ts` — real-time scoring, feedback resolution
- `src/components/judge-dashboard.tsx` — dual-corner feedback
- `src/components/feedback-select.tsx` — template + custom feedback
- `src/components/artist-scoreboard.tsx` — detailed per-round scores

### Gig Marketplace
- `src/components/gig-manager.tsx` — organizer gig/applicant management + marketing copy
- `src/app/api/gigs/[gigId]/apply/route.ts` — apply with gig work check
- `src/app/api/gigs/[gigId]/award/route.ts` — award + set status FILLED (no commission)
- `src/components/artist-availability.tsx` — availability + pricing

### Admin
- `src/app/admin/page.tsx` — dashboard
- `src/app/admin/analytics/page.tsx` — analytics charts
- `src/app/admin/payments/page.tsx` — payment verification
- `src/app/admin/artists/page.tsx` — artist list (with avatar + privacy)
- `src/app/admin/artists/[userId]/page.tsx` — artist detail
- `src/lib/admin.ts` — all admin queries

### Deployment
- `vercel.json` — `{ "buildCommand": "prisma generate && next build", "regions": ["sin1"] }`
- `.env` — local env vars (gitignored)
- `.env.local` — Vercel Blob token (auto-generated)
- `.gitignore` — covers `.env*`, `/src/generated/prisma`, `.next`, etc.

### Auth & Middleware
- `src/proxy.ts` — NextAuth middleware, public `/artist/directory` exception
- `src/lib/rbac.ts` — `getCurrentUser()`, `requireRole()`

### Seeding
- `prisma/seed.ts` — 20 artists, 2 organizers, 4 events, 6 gigs
- Run: `npm run db:seed` or `tsx -r dotenv/config prisma/seed.ts`

---

## Pending / Future TODOs

### User-requested features not yet implemented
1. **Artist proof of work in gig applications** — add `proofOfWorkUrl` (Google Drive link) to `GigApplication` schema + apply form
2. **Event registration entry fees via Razorpay** — remaining manual step (artist pays UPI, organizer marks paid). Needs: `EVENT_REGISTRATION` PaymentType, create-order + verify branches, cart UI update
3. **Gig work days remaining display** — artist bill page, marketplace, admin artist list/detail
4. **Admin analytics overhaul** — professional information architecture for sales (organizer funnel, revenue by type, marketplace metrics, retention, competition metrics)

### Known bugs
- Admin analytics "Categories by registrations" chart counts category rows, not registrations
- Organizer detail "Regs" column shows category count, not registrations
- Vercel auto-deploy from GitHub occasionally errors with 0ms build (transient infra issue) — `vercel --prod` CLI deploy always works

### Required env vars for production
- `DATABASE_URL` — Neon Postgres
- `NEXTAUTH_SECRET` — auth secret
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — Razorpay test/live keys
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` — client-side key
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob store token
- `NEXT_PUBLIC_SOCKET_URL` — Socket.io server URL
- `REDIS_URL` — Redis for Socket.io adapter

### Deployment notes
- `prisma db push` for schema changes (not `prisma migrate dev` — history is broken)
- `npx prisma generate` before build
- Manual `vercel --prod` deploy is more reliable than auto-deploy from GitHub pushes
- Hard refresh (Cmd+Shift+R) needed for favicon/image cache invalidation
