# CYPHR Project Memory — Full Conversation Log

## Project Overview
- **Stack**: Next.js 16 App Router (`src/app`), Prisma 7.9 + Postgres (Neon), Socket.io (separate `server/socket.ts`), NextAuth, Tailwind, `"type": "module"`
- **Project root**: `/Users/apple/Developer/Cyphr/callout` (NOTE: older notes say Desktop path, actual is Developer)
- **GitHub**: `https://github.com/peeeooosss/cypher.git`
- **Live site**: `https://www.joincyphr.in`
- **Vercel project**: `dhanda/cypher` (auto-deploys from `main` branch)
- **DB**: Neon Postgres, schema synced via `prisma migrate deploy` (deploy) / `prisma db push` (local dev)
- **PRISMA WARNING**: `prisma migrate dev` FAILS locally (P3006, shadow DB broken by migration `20260806180000_add_event_billing`, "relation Gig does not exist") → always use `npx prisma db push` + `npx prisma generate` locally
- **ESLINT RULE**: `react-hooks/set-state-in-effect` is an ERROR — no `setState()` directly inside `useEffect`; use `useMemo`/render-time computation or the async+cancel-flag pattern
- **IMAGE RULE**: `next.config.ts` has NO `remotePatterns` → `next/image` will NOT render external `ufs.sh` (UploadThing) URLs. All user-uploaded images must use plain `<img>` with `// eslint-disable-next-line @next/next/no-img-element`
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
   - Deployed to Vercel (manual `vercel --prod`)

---

## Session 2: Payment Automation + Admin Analytics

### User requirements
- Organizers should get automatic access after Razorpay payment (no admin verification)
- Artists should get marketplace access after Razorpay payment (no admin verification)
- Admin panel should show all data/analytics professionally
- Commission payment via Razorpay should unlock event completion

### Current state (from audit)
- **Razorpay already automates** flat fee, commission, gig posting, gig work, gig connection
- **Event registration entry fees** still use UPI/manual flow
- **Commission gate**: checks `commissionPaymentStatus === "VERIFIED"` before allowing COMPLETED status
- **Gig work expiry**: `gigWorkExpiresAt` is set on payment verification

### Admin analytics gaps identified
- "Categories by registrations" chart counts category rows, not registrations (bug)
- Organizer detail "Regs" column shows category count (bug)
- No actual event entry-fee revenue metric
- No gig-work days remaining display anywhere
- Payment model completely unused in admin reporting

---

## Session 3: Avatar Upload + Public/Private Profiles

### What was implemented
1. **Schema Change**: `isProfilePublic Boolean @default(true)` on User model
2. **UploadThing Storage**: avatars, studio logos, event posters via UploadThing (replaced Vercel Blob)
3. **Avatar Upload API**: `POST/DELETE /api/users/me/avatar` (JPG/PNG/WebP, <=5MB, UploadThing)
4. **Profile Form**: avatar upload/remove/change, public/private visibility toggle
5. **Privacy Enforcement**: visitors/judges see public only; logged-in users see all
6. **Auth/Session**: `avatarUrl` in NextAuth JWT + session

### Commit: `ae24885` — 19 files, +675/-56

---

## Session 4: Favicon Fix

### What was implemented
- Created `public/Favicon.svg` and `public/apple-icon.svg` (CYPHR brand mark)
- Updated `src/app/layout.tsx` metadata

### Commits: `3d1b125`, `c37e3dd`

---

## Session 5: Razorpay Credentials + Checkout Improvements

### What was completed
1. Razorpay credentials updated to new test keys
2. `payment.failed` handler added to `razorpay-checkout.tsx`

---

## Session 6: Pricing Model Overhaul

### New pricing model
| Item | Price | Notes |
|---|---|---|
| Event — Workshop | Rs 99 | flat fee at creation |
| Event — Underground Battle | Rs 199 | flat fee at creation |
| Event — Competition (Dance/Music) | Rs 249 | flat fee at creation |
| Event commission | 2.99% | on confirmed entry fees, settled at completion |
| Gig posting | Rs 199 | flat fee to publish |
| Gig commission | **removed** | was 10% of awarded amount |
| Marketplace access | Rs 99 / 3 months | artist subscription |
| Connection (unlock chat) | Rs 49 | per accepted gig |

### Commits: `2b2be4f` — 11 files, +70/-88

---

## Session 7: Marketplace Chat + Auto-Refresh + Unread Badges + Payment Status

### What was completed
1. **Marketplace Chat Box with Connection Fee Gate**
   - Messages panel locked until Rs 49 connection fee is paid via PayU
   - `GET /api/conversations/[id]` returns agreement data for locked state

2. **Auto-Refresh Messages**
   - Open message thread polls every 10s, deduplicates messages, auto-marks read

3. **Unread Count Badges**
   - Artist marketplace tabs (Offers, Active, Messages) show unread counts
   - Organizer Messages section header shows unread badge

4. **Payment Status in Completed Tab**
   - Artist's Completed tab shows PAID / Reported / Not reported status

5. **CONFIRM_PAID API Fix**
   - Allows COMPLETED agreement status for payment confirmation

6. **Open Chat Scroll**
   - "Open Chat" button in GigManager scrolls smoothly to `#messages-section`

### Commits: `3a68c4c`, `3a7d8b1`

---

## Session 8: Studio Logo + Organizer Profile

### What was implemented
1. **Schema**: `studioName`, `studioLogoUrl`, `studioFoundedAt` on User model
2. **API**: `POST/DELETE /api/users/me/studio-logo` (UploadThing, 2MB max), `GET/PATCH /api/users/me/profile`
3. **UI**: `OrganizerProfileForm` on `/organizer` page with name, logo upload, founded year
4. **Event Detail**: Shows circular logo + studio name + "Est. YYYY" after poster

### Commit: `549135e`

---

## Session 9: PayU Hosted Checkout Integration

### What was implemented
Replaced manual UPI for CYPHR platform fees with PayU Hosted Checkout. Registration fees and artist-organizer work payments remain manual.

1. **Schema Changes**
   - Provider-neutral `Payment` model: `merchantTransactionId`, `providerPaymentId`, `providerSignature`, `providerStatus`, `metadata`, `provider` fields
   - `razorpayOrderId` now nullable
   - Migration `20260821000000_add_payu_payment_fields` applied

2. **PayU Hash & Helpers**
   - `src/lib/payu.ts` — SHA-512 hash generation, response verification, amount formatting, callback URL
   - `src/lib/payu-processing.ts` — shared callback/webhook processing
   - `src/lib/payment-side-effects.ts` — idempotent payment activation for all 5 payment types

3. **API Routes**
   - `POST /api/payments/payu/create` — validates type/ownership, calculates amount server-side, creates pending Payment, returns PayU form fields
   - `POST /api/payments/payu/callback` — processes PayU redirect (POST form-encoded + GET query params), verifies hash/amount
   - `POST /api/payments/payu/webhook` — processes async PayU notifications

4. **Frontend**
   - `src/components/payu-checkout.tsx` — phone input + dynamic form submission to PayU hosted page
   - `src/app/payments/result/page.tsx` — success/failure/pending display

5. **Replaced ManualPayment with PayuCheckout in**
   - Event bill page (flat fee + commission)
   - Gig posting fee
   - Marketplace access fee
   - Connection fee (messages panel)

6. **Vercel Env Vars Added**
   - `PAYU_ENV=test`, `PAYU_MERCHANT_KEY=sBHgqC`, `PAYU_MERCHANT_SALT=obozUDIe7liefvQ5vtA9EFTecCfdQlmK`, `PAYU_BASE_URL=https://test.payu.in`

7. **Documentation**
   - `PAYU.md` — integration docs and deployment checklist

### Commit: `981b76c`

---

## Session 10: Prize Pool Fix + Prize Display + Google Maps Directions

### What was completed

1. **Prize Pool Fix** (`305f512`)
   - API Zod schema expected `pct` but frontend sends `percentage` — fixed field name mismatch
   - Added `isPaid` to create schema so it persists on first save

2. **Prize Pool Display on Events** (`e2ab4c6`)
   - Events listing cards show total prize pool in green
   - Event detail page shows per-category prize pool + total in sidebar

3. **Google Maps Directions Link** (`4296d66` + `49df163`)
   - Added `googleMapsUrl String?` field to Event model + migration
   - Added URL input to organizer create and edit forms
   - Added field to create and update API Zod schemas
   - Event detail page: highlighted "Open in Google Maps" button with map pin icon in sidebar
   - Event cards: "Get Directions" link below venue/city/state
   - Fixed Next.js 16 server component error: removed `onClick` handler from EventCard `<a>` tag

### Commits: `305f512`, `e2ab4c6`, `4296d66`, `49df163`

---

## Session 11: Brand Refresh — Theme Toggle, My Works Portfolio, Professional Artist Profiles, Homepage, Poster Fit

### User requirements
- Dark/Light theme toggle site-wide (red accent stays; light accent = `#C00` for WCAG AA)
- "MY WORKS" video portfolio section on artist dashboard
- Public artist profile redesigned professional (Freelancer/Instagram hybrid)
- Homepage replan with good vibes
- Fix poster images to fit full screen (like KINETIC VOL.1) — `object-contain`
- Circular avatar on artist dashboard (already circular in profile form)
- Soften brutalist radius 0px → 4/8/12/16px via CSS vars

### Phase 0 — Schema (via `prisma db push`, NOT migrate dev)
- New `ArtistWork` model: `id, userId, title, description, videoUrl, thumbnailUrl, platform, order, isPublished(default true), createdAt, updatedAt`, `@@index([userId])`, `onDelete: Cascade`
- `User` gained: `bio @db.Text`, `coverUrl`, `coverFileKey`, `hourlyRate Int?`, `responseTime String?`, `socialLinks Json?`, relation `works ArtistWork[]`

### Phase 1 — Theme system
- `globals.css`: CSS vars for dark (paper `#0B0B0F`, ink `#F2F2F2`, line, accent `#FF2B2B`) and `[data-theme="light"]` overrides (paper `#FFFFFF`, ink `#111`, line `rgba(0,0,0,.12)`, accent `#C00`), radius vars (`radius-sm 4/md 8/lg 12/xl 16`)
- `tailwind.config.ts`: mapped colors to `var(--*)`, new radius tokens, card shadow tokens
- `src/components/theme-provider.tsx`: ThemeProvider via `useSyncExternalStore`, reads `localStorage("theme")` → falls back to `prefers-color-scheme`; exposes `useTheme()` with `theme/toggleTheme/setTheme`, sets `data-theme` attribute on `documentElement`
- `src/components/theme-toggle.tsx`: sun/moon toggle button
- `src/app/layout.tsx`: wrapped body in `<ThemeProvider>`, added pre-hydration inline `<script>` that sets `data-theme` from localStorage + `suppressHydrationWarning` on `<html>` (prevents flash + hydration mismatch)

### Phase 2 — API routes (new)
- `POST/GET /api/artist/works` — create + list works (ownership-scoped)
- `GET/PATCH/DELETE /api/artist/works/[id]` — per-work management
- `PATCH /api/artist/works/reorder` — transactional reorder
- `POST/DELETE /api/users/me/cover` — cover photo upload/remove via UploadThing `avatarUploader` (5MB, jpg/png/webp)
- `PATCH /api/users/me` extended: `bio`, `hourlyRate`, `responseTime`, `socialLinks`

### Phase 3 — Artist Dashboard "My Works"
- `src/components/artist-works.tsx`: works grid (thumbnail hover + watch/edit/delete), add/edit modal, thumbnail auto-fetch (`img.youtube.com/vi/{id}/maxresdefault.jpg` for YT) + manual upload, loading skeleton, empty state
- `src/components/video-modal.tsx`: portal-based player, auto-detects platform (youtube/vimeo/instagram/other), ESC to close
- `src/components/artist-profile-form.tsx`: added cover upload/preview/remove, bio, hourlyRate, responseTime, socialLinks (instagram/youtube/soundcloud/twitter) fields
- `src/app/artist/page.tsx`: Prisma query extended with new fields, renders `<ArtistWorks />` after achievements
- Platform detection: `youtube.com|youtu.be` / `vimeo.com` / `instagram.com` else `other`

### Phase 4 — Public Artist Profile (Redesign)
- `src/lib/artists.ts`: `getArtistProfile` now selects `coverUrl, bio, socialLinks, hourlyRate, responseTime, isProfilePublic, createdAt` + `works` (drafts hidden to non-privileged unless organizer/artist/admin)
- `src/components/artist-profile-hero.tsx`: cover image + gradient, rounded avatar (rounded-2xl, border-paper, shadow-card), name/style/crew/location/experience row, bio, action buttons (Edit profile / Book / Message), stats strip (Battles/Wins/Win-rate/Achievements)
- `src/components/artist-profile-view.tsx`: sticky tab nav — About / Works (count) / Achievements (count) / Battles; renders About + Works + Achievement cards + battle record (WIN/LOSS badge per round)
- `src/components/artist-profile-about.tsx`: bio, specialties chips (keywords), skills chips, Availability card (₹/session + response time), Connect card (social handle + social links)
- `src/components/artist-profile-works.tsx`: public read-only works grid + VideoModal
- `src/app/artist/directory/[userId]/page.tsx`: rewritten to pass data into `ArtistProfileView`; `canHire` = ORGANIZER/ADMIN
- IMAGE RULE: hero avatar/cover use plain `<img>` (not `next/image`) — see rule at top

### Phase 5 — Homepage Restructure
- `src/app/page.tsx`: hero + "Meet the artists" CTA, social-proof stats strip (events / artists / registrations / open gigs via counts), value-prop cards (Organizers/Artists/Opportunities), platform demo CTA, ArtistSlider, events tabs, testimonials, footer CTA (artist signup + organizer guide)
- `src/components/home-events.tsx`: client tabs Live now / Upcoming / Past with counts, grids, live leaderboards; disabled past/live tabs when empty
- Uses `EventStatus.LIVE | COMPLETED`, `RegistrationStatus` enum in counts

### Phase 6 — Poster Fit
- `src/components/event-card.tsx`: poster `object-cover` → `object-contain` on `bg-line/20` backdrop so full poster shows
- `src/app/events/[slug]/page.tsx`: event poster wrapped in bordered `bg-line/20` container (was `w-full` already, no crop)

### Phase 7 — Polish
- Circular avatars already in dashboard form (`rounded-full`)
- Radius softening via CSS vars (Phase 1)
- Pre-hydration theme script + `suppressHydrationWarning`

### Known follow-ups / gotchas
- `ArtistWork.createdAt` returns `Date` from Prisma but `Work` zui type uses `string` — page maps `.toISOString()` before passing
- `artist-works.tsx` exports `Work` type; `artist-profile-works.tsx` re-exports as `ArtistProfileWork`
- Registration count query uses `RegistrationStatus.CONFIRMED | PENDING`
- Build verified: `npx tsc --noEmit` clean, `npm run lint` 0 errors (only pre-existing `<img>` + unused `router` warnings), `npm run build` succeeds

### Commits
- `97ba45d` — feat(artist): theme toggle, my works portfolio, and professional profile pages (26 files, +2274/-358)
- `08bb633` — fix(profile): hero avatar/cover as plain `<img>` (next/image has no remotePatterns for ufs.sh)

---

## Key Files Reference (Updated)

### Schema
- `prisma/schema.prisma` — all models, enums, fields

### Payment System (PayU — current)
- `src/lib/payu.ts` — PayU hash helpers, amount formatting, callback URL
- `src/lib/payu-processing.ts` — shared callback/webhook processing
- `src/lib/payment-side-effects.ts` — idempotent payment activation
- `src/lib/pricing.ts` — `COMMISSION_RATE` (0.0299), `GIG_FLAT_FEE` (199), `EVENT_TYPE_FEES`, `GIG_WORK_FEE`, `GIG_CONNECTION_FEE`
- `src/app/api/payments/payu/create/route.ts` — PayU checkout creation
- `src/app/api/payments/payu/callback/route.ts` — PayU redirect handler
- `src/app/api/payments/payu/webhook/route.ts` — PayU async notifications
- `src/app/payments/result/page.tsx` — payment result display
- `src/components/payu-checkout.tsx` — phone input + PayU form submission

### Payment System (Razorpay — legacy, still in codebase)
- `src/lib/razorpay.ts` — Razorpay singleton + helpers (unused but kept for existing records)
- `src/app/api/payments/create-order/route.ts` — Razorpay order creation
- `src/app/api/payments/verify/route.ts` — Razorpay signature verification

### Event Display
- `src/app/events/[slug]/page.tsx` — event detail with Google Maps link + prize pool + studio logo
- `src/app/events/page.tsx` — events listing with prize pool
- `src/components/event-card.tsx` — event card with directions link + prize pool
- `src/app/page.tsx` — homepage with event cards

### Organizer
- `src/components/event-form.tsx` — event creation with Google Maps URL input
- `src/components/event-dashboard.tsx` — event edit with Google Maps URL input + prize pool management
- `src/components/organizer-profile-form.tsx` — studio name, logo upload, founded year
- `src/app/api/users/me/studio-logo/route.ts` — logo upload/delete via UploadThing
- `src/app/api/users/me/profile/route.ts` — studio profile PATCH/GET

### Messaging
- `src/app/api/conversations/route.ts` — conversations list with unread counts
- `src/app/api/conversations/[id]/route.ts` — conversation detail with agreement data
- `src/components/messages-panel.tsx` — chat with PayU connection fee, auto-refresh

### Marketplace
- `src/components/marketplace-dashboard.tsx` — connection fee with PayU, tab badges, Completed payment status
- `src/components/gig-manager.tsx` — gig posting with PayU, Open Chat scrolls to messages

### Profile & Privacy
- `src/app/api/users/me/avatar/route.ts` — avatar upload/delete
- `src/app/api/users/me/cover/route.ts` — cover photo upload/delete
- `src/components/artist-profile-form.tsx` — avatar + privacy + cover/bio/rates/socials UI
- `src/lib/artists.ts` — privacy-aware directory + profile queries
- `src/lib/auth.ts` — NextAuth config with avatarUrl in session

### Artist Portfolio ("My Works")
- `src/app/api/artist/works/route.ts` — create + list works
- `src/app/api/artist/works/[id]/route.ts` — get/patch/delete work
- `src/app/api/artist/works/reorder/route.ts` — reorder works
- `src/components/artist-works.tsx` — dashboard works grid + modal (exports `Work` type)
- `src/components/video-modal.tsx` — video player modal (portal, auto platform detect)

### Artist Public Profile (Redesign)
- `src/app/artist/directory/[userId]/page.tsx` — server page → ArtistProfileView
- `src/components/artist-profile-view.tsx` — tabs (About/Works/Achievements/Battles)
- `src/components/artist-profile-hero.tsx` — cover + avatar hero, stats, CTAs
- `src/components/artist-profile-about.tsx` — bio/skills/specialties/availability/socials
- `src/components/artist-profile-works.tsx` — public works grid (re-exports `ArtistProfileWork`)

### Theme System
- `src/components/theme-provider.tsx` — useSyncExternalStore theme provider
- `src/components/theme-toggle.tsx` — dark/light toggle button
- `src/app/layout.tsx` — ThemeProvider + pre-hydration `data-theme` script
- `src/app/globals.css` — dark + `[data-theme="light"]` CSS vars, radius tokens
- `tailwind.config.ts` — colors → `var(--*)`, radius/shadows

### Homepage
- `src/app/page.tsx` — hero, stats strip, value props, demo, events tabs, testimonials, footer CTA
- `src/components/home-events.tsx` — Live/Upcoming/Past event tabs
- `src/components/event-card.tsx` — poster `object-contain` + directions + prize pool

### Admin
- `src/app/admin/page.tsx` — dashboard
- `src/app/admin/analytics/page.tsx` — analytics charts
- `src/app/admin/payments/page.tsx` — payment verification
- `src/app/admin/artists/page.tsx` — artist list (with avatar + privacy)
- `src/lib/admin.ts` — all admin queries

### Deployment
- `PAYU.md` — PayU integration documentation and deployment checklist
- `.env` — local env vars (gitignored)
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
2. **Event registration entry fees via PayU** — remaining manual step (artist pays UPI, organizer marks paid). Needs: `EVENT_REGISTRATION` PaymentType, PayU create + callback branches, cart UI update
3. **Gig work days remaining display** — artist bill page, marketplace, admin artist list/detail
4. **Admin analytics overhaul** — professional information architecture for sales (organizer funnel, revenue by type, marketplace metrics, retention, competition metrics)
5. **Rotate PayU test salt** — exposed in chat, must be regenerated before production use
6. **Rotate Vercel access token** — shared in chat, must be regenerated

### Known bugs
- Admin analytics "Categories by registrations" chart counts category rows, not registrations
- Organizer detail "Regs" column shows category count, not registrations
- Vercel auto-deploy from GitHub occasionally errors with 0ms build (transient infra issue) — `vercel --prod` CLI deploy always works

### Required env vars for production
- `DATABASE_URL` — Neon Postgres
- `DIRECT_URL` — Neon direct connection (for migrations)
- `NEXTAUTH_SECRET` — auth secret
- `NEXTAUTH_URL` — auth callback URL
- `NEXT_PUBLIC_APP_URL` — public app URL
- `UPLOADTHING_TOKEN` — UploadThing API token (for avatars, studio logos, event posters)
- `RESEND_API_KEY` — Resend API key for email verification (live key)
- `RESEND_FROM` — Verified Resend sender: `admin@tryauraai.in` (domain `tryauraai.in` verified in Resend, LIVE mode)
- `NEXT_PUBLIC_SOCKET_URL` — Socket.io server URL
- `SOCKET_INTERNAL_URL` — Socket.io internal URL
- `PAYU_ENV` — test or production
- `PAYU_MERCHANT_KEY` — PayU merchant key
- `PAYU_MERCHANT_SALT` — PayU merchant salt
- `PAYU_BASE_URL` — https://test.payu.in or https://secure.payu.in

### Deployment notes
- `prisma migrate deploy` for schema changes
- `npx prisma generate` before build
- Manual `vercel --prod` deploy is more reliable than auto-deploy from GitHub pushes
- Hard refresh (Cmd+Shift+R) needed for favicon/image cache invalidation
- **Next.js 16 rule**: event handlers (onClick, onChange) cannot be used in server components — only client components with `"use client"`

### Git History (Recent)
- `08bb633` — fix: artist profile hero avatar/cover with plain <img> (next/image no remotePatterns)
- `97ba45d` — feat: theme toggle, My Works portfolio, professional artist profiles, homepage restructure, poster fit
- `f65bf35` — feat(signup): only name, username, email & password — battle profile moves to dashboard
- `7842d71` — refactor(events): remove organizer flat fee from public event cards
- `52718b3` — feat(admin): configurable pricing + remove PayU test mode
- `e0087ad` — feat(events): event info/schedule/notice persistence, card summaries, bulk WhatsApp
- `1d887d7` — fix(payu): accept amount from amt or amount; persist callback payload on mismatch
- `b76ab49` — fix(payu): verify return hash with PayU v2 format (unmappedstatus + reversed udf1-5)
- `7230bb6` — fix(payu): stop swallowing callbacks; apply effects on callback + webhook
- `9993b97` — feat: PayU checkout across all payment flows with ₹1 test mode
- `5d55cf8` — ci: init test DB schema with prisma db push before e2e
- `3c9b6cd` — feat: platform repositioning, structured event details, and PayU production payments
- `49df163` — fix: remove onClick from server component EventCard
- `4296d66` — feat: add Google Maps directions link to events
- `e2ab4c6` — feat: show prize pool on event detail page and events listing cards
- `305f512` — fix: prize pool distribution field name mismatch (pct -> percentage)
- `981b76c` — feat: replace manual UPI with PayU Hosted Checkout for platform fees
- `549135e` — feat: studio logo on events + organizer profile + open chat scroll
- `3a7d8b1` — feat: marketplace chat box with connection fee gate + notification badges
