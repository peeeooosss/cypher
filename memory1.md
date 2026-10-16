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
   - Test keys in `.env`: `RAZORPAY_KEY_ID` (value redacted — see local `.env`, never commit secrets)

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
   - `PAYU_ENV=test`, `PAYU_MERCHANT_KEY` + `PAYU_MERCHANT_SALT` configured in Vercel env (values redacted — never commit secrets), `PAYU_BASE_URL=https://test.payu.in`

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

## Session 12: MC/Host Portal, Bracket & Leaderboard Fixes, Shareable Standings

### User requirements
- MC/Host portal must NOT be able to change anything — view + call names only (read-only, locked server-side too)
- Broad, laptop + mobile friendly MC/Host layout (no narrow/vertical text)
- Show the full roster + active bracket per category in the MC portal
- Fix the "Name the code first (e.g. Stage MC)" toast and every alert box rendering as a narrow vertical line
- Give each event card's leaderboard a proper shareable link to hand directly to artists

### 1. Control-room Advance button (`d0b1f37`)
- Advance-phase route rejected an empty POST body, so the Advance button failed. Now accepts an empty body.

### 2. Leaderboard / control-room cleanup + 3-way winners (`f5a3b94`)
- Dropped the duplicate matchup line; `run()` gained a `method` param.
- `ThreeWayDecider` gained 1st/2nd winner toggles + checkboxes.

### 3. Bracket: lone entries fold into a 1v1v1 (`5929fe9`)
- New `groupIntoLanes()` in `src/lib/bracket.ts`, wired into `generateBracket` + the bracket rebuild route, so a solitary entry no longer becomes a bye.

### 4. MC/Host layout broadening + clear match view (`ac449aa`)
- `mc-portal.tsx` container `max-w-4xl` → `max-w-6xl`.
- Match cards got a `Round X · Match Y` title plus status / 3-way badges.
- Lanes got corner left-borders, larger names, winner/runner-up highlight.
- `staff-codes-tab.tsx`: removed `max-w-xl` on Running order; mobile-friendly header.

### 5. Read-only MC portal + enriched state (`46979e1`)
- `mc-portal.tsx` fully rewritten as a read-only Control-Room style (`max-w-7xl`): phase line, progress bar, per-category artist search, seed-ordered roster with status badges, read-only bracket with `#seed` names + vote counts + winner rings. Removed Advance/Top-N, Push live, Winner/Runner-up, and 1/2-winner toggles.
- `GET /api/mc/state` now returns `eventId`, per-lane `seed`, and a seed-ordered `participants` roster per category.
- Deleted `src/app/api/mc/advance/route.ts` and `src/app/api/mc/match/route.ts` (server-side lock).
- Broadened MC layouts: `ui/empty-state.tsx` dropped the `max-w-sm` description cap + `SectionHeading` `max-w-xl`; `mc-entry-form.tsx` `max-w-md` → `max-w-2xl` and its entry error is now a bordered `role="alert"` box with `break-words`; `ui/toast.tsx` `max-w-md` → `max-w-lg` + `break-words`; `staff-codes-tab.tsx` share-code alert `break-words`, code `break-all`.

### 6. Tailwind named `max-w-*` collision fix (`c961e58`) — the vertical-alert root cause
- **ROOT CAUSE**: with the legacy `@config`, the default `maxWidth` theme function ends with `...theme("spacing")`. The custom spacing tokens (`xs/sm/md/lg/xl`) leaked into the named container scale, so `.max-w-xs`→`4px`, `.max-w-sm`→`8px`, `.max-w-md`→`16px`, `.max-w-lg`→`24px`, `.max-w-xl`→`32px`. Every alert/toast/box collapsed to one word per line. `max-w-2xl`+ were unaffected (they resolve from `--container-*`).
- Tried and **failed**: `theme.extend.maxWidth`, top-level `theme.maxWidth`, `theme.extend.container`, and `@utility` definitions — all lost to the spacing spread (the `@utility` variant emitted both declarations, core last).
- **FIX**: unlayered overrides in `src/app/globals.css` (`.max-w-xs..xl`). Unlayered CSS wins over Tailwind's `@layer utilities` regardless of source order. Verified in the built CSS: both rules exist and the override sits outside any `@layer`.
- Caveat noted: no responsive variants (`md:max-w-md`, etc.) of the colliding names existed, so the latent trap of an unlayered base rule beating a layered `md:max-w-*` is not currently hit.

### 7. Shareable per-event standings link (`e61344c`)
- New public route `src/app/events/[slug]/standings/page.tsx` → shareable URL `/events/<slug>/standings`. Server component; fetches the event by slug; renders the full `LiveLeaderboard` (`live` when status LIVE, final otherwise); `generateMetadata` for nice link previews.
- New reusable `src/components/copy-link-button.tsx` — copies the absolute URL and shows "Copied".
- `event-card-leaderboard.tsx`: the card leaderboard's "Copy link" button and "Full results →" now point to `/events/<slug>/standings` (was `/events/<slug>`).
- This was implemented as the **alternative** to moving the leaderboard to the top of the event card — the move-to-top change was NOT done.

### Build / verification
- `npx tsc --noEmit`, `npx eslint`, `npx next build` all clean; `/events/[slug]/standings` registered in the route manifest; compiled CSS verified.

### Commits
- `d0b1f37` — fix(control-room): accept empty body in advance-phase to fix Advance button
- `f5a3b94` — fix(leaderboard,control-room): drop duplicate matchup line; add 3-way 1/2 winner checkboxes
- `5929fe9` — feat(bracket): fold lone entries into a 1v1v1 instead of a bye
- `ac449aa` — feat(mc): broaden MC/host layout and clarify match view
- `46979e1` — feat(mc): read-only MC portal with roster, seeds & brackets; broaden MC layouts
- `c961e58` — fix(tailwind): restore named max-w-* scale broken by spacing collision
- `e61344c` — feat(events): add shareable per-event standings page

---

## Session 13: Event Card Redesign, Judges, Leaderboard Toggle, Gallery

### User requirements
- Beautiful, sectioned event card (no walls of text) with a **Results/Leaderboard button on top**
- Organizer toggle to enable/disable the **public live leaderboard** (artist dashboards unaffected — artists always see their own scores)
- **Judges** section with photo + description, addable by the organizer
- **Homepage gallery slider** of past-event photos
- **/gallery page** for past-event photos & videos, maintained by the founder (ADMIN)

### 1. Schema + migration (`20261015000000_event_presentation`)
- `Event.showPublicLeaderboard Boolean @default(true)`
- `EventJudge` (name, title, bio, photoUrl, photoFileKey, socialLinks Json, displayOrder, isPublic) + `Event.judges`, `JudgeSlot.eventJudgeId` (onDelete SetNull) linking a judge to a scoring slot
- `GalleryItem` + `GalleryItemType { PHOTO VIDEO }` (title, caption, type, url, fileKey, thumbnailUrl, sourceLink, eventId?, isFeaturedHomepage, displayOrder, isPublished, createdById?)
- **Applied manually**: `npx prisma migrate dev` is broken (shadow-DB replay fails `P3006`/`P3018` on historical `20260806180000_add_event_billing`, `ERROR: relation "Gig" does not exist`). Migration SQL was hand-written in repo DDL style, then `npx prisma migrate deploy` + `npx prisma generate`.

### 2. UploadThing routers
- `judgePhotoUploader` (ORGANIZER, image, 1 file, 2MB, JPG/PNG/WebP)
- `galleryImageUploader` (ADMIN, image, 10 files, config ceiling 8MB but middleware enforces 5MB each)

### 3. APIs
- `GET/POST /api/events/[eventId]/judges` + `PATCH/DELETE .../judges/[judgeId]` — organizer-scoped (`getEventForOwner`); delete/patch cleans up the old UploadThing file; photo URLs must be UploadThing
- `GET /api/gallery` — public, filters `featured`/`type`/`limit`, published only
- `GET/POST /api/admin/gallery` + `PATCH/DELETE /api/admin/gallery/[id]` — `requireAdmin()`; file cleanup on replace/delete
- `PATCH /api/events/[eventId]` accepts `showPublicLeaderboard` and emits `leaderboard_visibility` over the socket when it changes

### 4. Leaderboard gating
- `src/lib/leaderboard-access.ts` — `canViewLeaderboard(eventId, gate)` + `LEADERBOARD_HIDDEN_CODE` + `leaderboardHiddenResponse()` (403). Public when `showPublicLeaderboard`; when hidden, only ADMIN, the owning organizer, and artists registered in the event (captain or PENDING/ACCEPTED member) can see it.
- Gated: `GET /api/events/[eventId]/leaderboard`, `/events/[slug]/live`, `/events/[slug]/standings`; homepage compact boards skipped when hidden.
- Socket: `leaderboard_visibility` added to `ServerToClientEvents`; `live-leaderboard.tsx` refetches on it and renders a "Results paused" panel on a 403 `LEADERBOARD_HIDDEN`. `event-card-leaderboard.tsx` shows "Results paused by the organizer."

### 5. Event Card redesign (`/events/[slug]/page.tsx`, fully rewritten)
- Sections: hero (blurred poster backdrop, status/type/city chips, countdown, CTA row incl. Results), sticky sub-nav, About + stat tiles, Meet the judges, Categories (prize banner, fees, spots-left), day-grouped Schedule timeline with "happening now", gallery teaser strip, Notices, Rules/info accordions, Results, sticky aside, mobile sticky CTA bar. `generateMetadata` with OG poster.
- New components: `event-hero`, `event-countdown`, `event-sub-nav`, `section-heading`, `event-judges`, `event-categories`, `event-schedule`, `event-info-accordion`, `event-aside`, `event-gallery-strip`.

### 6. Organizer dashboard
- Overview tab: **Public leaderboard** on/off toggle (`handleBoardToggle`).
- New **Judges** tab: `event-judges-manager.tsx` (CRUD, social links, order, public flag) + `judge-photo-upload.tsx`.
- `EventWithRelations` gained `showPublicLeaderboard` + `judges`; dashboard + organizer pages include `judges`.

### 7. Gallery
- `src/app/gallery/page.tsx` (public, All/Photos/Videos filter → `GalleryGrid` with lightbox)
- `src/app/admin/gallery/page.tsx` + `gallery-manager.tsx` (multi-photo upload, add video by link, feature/hide/delete)
- `gallery-slider.tsx` wired into homepage (featured items); "Gallery" added to `nav.tsx` + admin sidebar; `video-modal.tsx` gained optional `description`

### Known constraints / notes
- **Playwright not run**: `playwright.config.ts` requires an isolated `E2E_DATABASE_URL` which is not configured locally. Run in CI.
- **Prisma migrations**: use the manual-SQL + `migrate deploy` workaround (above) until the shadow-DB history is repaired.
- Full Playwright coverage for the toggle/judges/gallery flows is still a TODO.

### Build / verification
- `npx tsc --noEmit` clean, `npm run lint` 0 errors (6 pre-existing `no-img-element` warnings), `npm run build` passes and registers `/gallery` + `/admin/gallery`.
- Ran production `next start` smoke: event/standings/gallery pages 200, `/api/gallery` 200, judges API 401 unauthenticated, hero + `#results`/`#categories` sections render.

### Commits
- `784deb1` — feat(events): redesign event card with judges, leaderboard toggle & gallery

---

## Session 14: Strict Leaderboard Hiding, Photos Dashboard Section, Event Highlights

### User requirements
- When the organizer hides the leaderboard it must be hidden for **everyone** except the organizer — visitors, signed-in users and registered artists all lose access (competitions sometimes don't want winners shown). Admins keep access for support.
- Judge **bio & photo** must live in a new dashboard **Photos** section, not in the judge-code-generation (Judges) section.
- New organizer dashboard section **Photos** with two subsections: **Judge bio & photo** and **Event highlights** — the organizer can upload event photos, each **under 3.5MB**.

### 1. Strict leaderboard hiding (`src/lib/leaderboard-access.ts`)
- `canViewLeaderboard` rewritten: public while `showPublicLeaderboard`; once hidden only `ADMIN` and the event's own `ORGANIZER` pass. Removed the registered-artist lookup (and the unused `prisma` import). `eventId` kept for signature stability but unused.
- Call sites unchanged (API, `/live`, `/standings`, homepage skip, 403 `LEADERBOARD_HIDDEN` handling). Event page `canViewBoard` changed from `... || registeredCategoryIds.size > 0` to `... || isOwner || isAdmin`.
- Artist **own** personal scores are unaffected: they render from the `/artist` server page (`artist-event-card` → `artist-scoreboard`), which never touches the gated aggregate leaderboard route.
- Verified via prod `next start`: anonymous `/api/events/<id>/leaderboard` → 403 `LEADERBOARD_HIDDEN`; `/standings` + `/live` show "Results paused"; flipping `showPublicLeaderboard` true → 200 with no paused text, then restored.

### 2. Dashboard Photos section
- `event-dashboard.tsx`: added `"Photos"` to `TABS` (after `"Judges"`). `EventJudgesManager` moved out of the Judges tab into Photos under the subsection **Judge bio & photo**; the Judges tab now holds only `JudgesTab` (codes/slots). Photos is visible for workshop events too, but the judge-bio subsection is hidden for workshops.
- `EventJudgesManager` internal duplicate heading removed (the Photos subsection provides it).
- `judgePhotoUploader` limit raised 2MB → **3.5MB** (`core.ts` config `4MB`, middleware 3.5MB; `judge-photo-upload.tsx` client guard + copy updated).

### 3. Event highlights (`EventPhoto`, max 6, ≤3.5MB, event page + global gallery)
- **Schema**: `model EventPhoto` (`eventId` Cascade, `caption?`, `photoUrl`, `photoFileKey?`, `displayOrder`, `isPublic`, timestamps, `@@index([eventId, displayOrder])`) + `Event.eventPhotos`. Migration `20261016000000_event_highlights` (hand-written SQL + `prisma migrate deploy`, 21 migrations total).
- **UploadThing**: new `eventPhotoUploader` (ORGANIZER, up to 6 files, config 4MB, middleware enforces 3.5MB + JPG/PNG/WebP).
- **APIs** (organizer-scoped via `getEventForOwner`, UploadThing-URL enforced, file cleanup on replace/delete): `GET/POST /api/events/[eventId]/photos` (POST 400s past `MAX_EVENT_PHOTOS = 6`) + `PATCH/DELETE /api/events/[eventId]/photos/[photoId]`.
- **Dashboard**: new `event-photos-manager.tsx` (grid, "N of 6 · X left" hint, add form with optional caption, inline caption edit (blur→PATCH), Show/Hide, Delete). Wired as the **Event highlights** subsection; `EventWithRelations` + dashboard/organizer queries include `eventPhotos`.
- **Public surfaces**: event page includes public `eventPhotos`, merges them (mapped as `type: "PHOTO"`, caption→title) **ahead of** `galleryItems` into `EventGalleryStrip`; sub-nav Gallery shows when either source is non-empty. `GET /api/gallery` and `/gallery` also return public highlight photos (founder-curated items first, highlights appended by recency; `featured` and `type=VIDEO` filters exclude highlights since they're photos).
- Verified via prod smoke: `/photos` all four methods 401 anonymous; `/`, `/gallery`, `/api/gallery`, `/events/<slug>` 200.

### Known constraints / notes
- Founder's admin gallery manager still manages `GalleryItem` only; organizer highlights surface automatically (organizer controls their own visibility via `isPublic`).
- Homepage featured slider remains founder-curated (`GalleryItem.isFeaturedHomepage`); highlights are not featured there.
- Playwright still not run locally (needs `E2E_DATABASE_URL`).

### Build / verification
- `npx tsc --noEmit` clean, `npm run lint` 0 errors (6 pre-existing `no-img-element` warnings), `npm run build` exit 0 (routes compiled). DB at 21 migrations.

### Commits
- `ccbd061` — feat(events): strict leaderboard hiding, Photos section & event highlights

---

## Session 15: TRIO Format, GROUP Min-4, Upload Progress Everywhere, Organizer Bio, Auditions

### User requirements
- Upload progress bar must show in **all** upload spots (Overview/Event Info poster, Photos, studio logo, artist avatar/cover/works, admin gallery) — not just event highlights + judge photo.
- New team type **TRIO**; DUO/TRIO/GROUP keep artist-username search + optional team name (already generic — no flow change needed).
- **GROUP minimum 4 artists** enforced end to end.
- Event card gets an **Organizer bio section** (below Judges), edited by organizers in the organizer dashboard.
- New event **BORN TO DANCE CHAMPIONSHIP** (Sizzler Dance Academy): auditions = city (offline) + online. New **Audition Detail** section on the event card: Offline → city dropdown → details or "announced later" note; Online → pick category → pay fee → WhatsApp redirect with payment + category + audition details. **Auditions optional per event** via organizer dashboard enable/disable; when off, plain registration + existing WhatsApp flow.

### 1. TRIO (`CategoryFormat`, migration `20261017000000_trio_format`, 22 migrations total)
- Schema enum += `TRIO`; hand-written `ALTER TYPE … ADD VALUE 'TRIO'` + `migrate deploy` + `prisma generate` (generated client committed, verified `TRIO` in `enums.ts`).
- `event-types.ts`: `TRIO: "Trio"` label, added to `COMPETITION_FORMATS`, `defaultRosterSize` → `{min:3,max:3}`.
- Category POST/PATCH competition error strings now "Solo, Duo, Trio, or Group".
- Pickers (`event-form.tsx`, dashboard), `registration-form.tsx` roster builder, `/api/registrations` (teamName required, roster check, invites), cart, leaderboard all pick TRIO up via `isTeamFormat`/`min/max` — no changes.
- DB proof: created + deleted a TRIO category on `kinetic-vol1` via script; roster helper returns `{3,3}`.

### 2. GROUP min 4
- Server floor already 4 via `defaultRosterSize(GROUP)={4,12}` + `/api/registrations` `max(roster.min, category.minMembers)` — but category create/PATCH exempted GROUP, so organizers could save `minMembers: 2` and the form displayed it (then the API rejected).
- Fixed: both category routes now 400 `"Group entries need at least 4 members"` when `format === GROUP && minMembers < 4`.
- `registration-form.tsx`: effective min = `max(category.minMembers, defaultRosterSize(format).min)` for validation AND the per-category label, so UI can never promise fewer than the API accepts.
- No existing GROUP categories in DB to backfill (checked).

### 3. Upload progress everywhere (`UploadProgress` shared component)
- Already existed from session 14 follow-up (`62d4bc1`) for event highlights + judge photo.
- Added to: `poster-upload.tsx` (Event Info poster), `organizer-profile-form.tsx` (studio logo — state already had `success`), `artist-profile-form.tsx` (avatar + cover — unions extended with `success`, shared hook mirrors progress into both, only active one renders), `artist-works.tsx` (thumbnail), `gallery-manager.tsx` (batch bar with `saving` phase for the per-file POSTs).
- All 7 `useUploadThing` call sites now show bar + status text. `NextSSRPlugin` confirmed optional (runtime `useRouteConfig` fetch) — not mounted, not needed.

### 4. Organizer bio section (reuses `User.bio`, no migration)
- `PATCH/GET /api/users/me/profile`: `bio` (trim, max 1000, nullish) persisted/returned.
- `OrganizerProfileForm` += bio textarea (1000-char counter, copy notes it shows below Judges); `/organizer` page selects + passes `bio`.
- New `event-organizer.tsx` (logo/initial avatar, studio name + est. year, bio prose) rendered **below `<EventJudges/>`** + `organizer` sub-nav link; both hidden when bio empty.

### 5. Auditions (generic, optional; migration `20261017000001_auditions`, 23 migrations total)
- **Schema**: `Event.auditionsEnabled Boolean @default(false)` + `model Audition` (`eventId` Cascade, `mode: AuditionMode` OFFLINE/ONLINE, `city?`, `categoryId?` SetNull, `details?` Text, `announcementText?` Text, `whatsappNumber?`, `displayOrder`, `isPublished`, `@@index([eventId, displayOrder])`) + `Category.auditions` back-relation.
- **APIs**: `PATCH /api/events/[eventId]` accepts `auditionsEnabled`; owner-guarded `GET/POST /api/events/[eventId]/auditions` (OFFLINE requires city; categoryId must belong to event) + `PATCH/DELETE …/[auditionId]`.
- **Dashboard**: new `Auditions` tab (after Categories) with `event-auditions-manager.tsx` — Enable/Disable toggle (PATCH + refresh, mirrors leaderboard toggle) + entry CRUD (mode/city/linked category/details/announcement/WhatsApp override, Show/Hide, Delete). Includes added to dashboard API + organizer page queries.
- **Event card**: new `event-auditions.tsx` (Offline/Online toggle, city `<select>`, details or "Details dropping soon" + announcement + WhatsApp updates button; online entries with fee + Register & pay link) rendered after Categories + `auditions` sub-nav link; shown only when `auditionsEnabled && published.length > 0`.
- **Registration flow**: `register/page.tsx` accepts `?audition=` (validated: this event + published + flag on) → banner + `auditionId` → `registration-form.tsx` appends to cart URL → `cart/page.tsx` loads audition, shows context banner, appends `Audition: Online (City) — Category. details…` to the organizer WhatsApp message. Flag OFF = today's flow byte-identical.

### Build / verification
- `tsc` clean, `lint` 0 errors (6 pre-existing warnings), `next build` exit 0.
- Prod smoke (`next start -p 3101`): `/`, event page, register page, `/gallery`, `/api/gallery`, `/login` 200; all 4 audition methods + photos GET + event PATCH 401 anonymous; profile POST 405 (correct); event page has no auditions/organizer sections when flag off / bio empty (correct).
- Playwright still not run locally (needs `E2E_DATABASE_URL`).

### Commits
- `f9aef62` — feat: TRIO format, GROUP min-4, upload progress everywhere, organizer bio, auditions

---

## Session 16: Custom Audition Flow for born-to-dance (Generic Tab Removed)

### User pivot
- Drop the generic dashboard **Auditions tab**; build a custom flow for **BORN TO DANCE CHAMPIONSHIP** (`born-to-dance`, Sizzler Dance Studio) only.
- Register click → must pick **Offline / Online**. Offline → city dropdown (**Guwahati, Dibrugarh, Tezpur**) → category → pay → WhatsApp. Online → category → pay → WhatsApp.
- WhatsApp verification message carries: category, artist or group name, audition type, city.

### Removal (tab UI only — no migration revert, live-DB safe)
- Deleted `event-auditions-manager.tsx` + `event-auditions.tsx`; dropped `"Auditions"` from dashboard TABS + tab block; removed generic `<EventAuditions>` section, `auditions` sub-nav/include, and the `audition`-id threading (register/registration-form/cart).
- Dormant but kept: `Audition` model, `auditionsEnabled` flag + PATCH support, `/api/events/[eventId]/auditions*` CRUD (still owner-guarded, 401 anonymous).

### Custom flow (slug-gated, offline-city fixed)
- New `src/lib/audition-events.ts`: `CUSTOM_AUDITION_EVENT_SLUG = "born-to-dance"`, `CUSTOM_AUDITION_CITIES = [Guwahati, Dibrugarh, Tezpur]`, `isCustomAuditionEvent` / `isCustomAuditionCity` guards.
- New `audition-type-step.tsx` (Offline/Online cards; offline requires city + Continue) + `audition-register-flow.tsx` (gates `RegistrationForm` behind the step, with a Change reset).
- `register/page.tsx`: builds shared `formProps`, renders `AuditionRegisterFlow` only for this slug, plain `RegistrationForm` otherwise.
- `registration-form.tsx`: optional `auditionMode`/`auditionCity` → `audmode`/`audcity` cart params.
- `cart/page.tsx`: honors audition params **only** for the gated slug (forged values ignored); context banner; WhatsApp message now `Hi <Studio>, I'm <artist>. I've paid ₹X for <event> entry. Team: <name>. Audition: Offline (Guwahati). Categories: TRIO. Sharing my payment screenshot…` (team + categories were missing from the message before).
- DB context (read-only check): event PUBLISHED, organizer WhatsApp `+916000303932`, categories SOLO ×2 (₹1000) + DUO/TRIO/GROUP (₹2000), GROUP 4–12, TRIO 3–3. Note: "DUO" category is saved as format SOLO/1-member — organizer data fix, out of scope.
- **Follow-up**: SEND SCREENSHOT WhatsApp text for `born-to-dance` is now a structured multi-line message (`Hi, <studio>` / `Name:` / `Team:` / `Category:` / `Payment:` / `Audition Type:` / screenshot line) via new `customMessage` prop on `PaymentAside`; other events keep the one-line message.

### Build / verification
- `tsc` clean, `lint` 0 errors (6 pre-existing warnings), `next build` exit 0.
- Prod smoke: `/`, event pages, register page, `/api/gallery` 200; dormant audition APIs 401; `born-to-dance` page has no generic auditions section; no `Auditions` tab/dashboard references remain in `src` outside dormant APIs + custom flow.

### Commits
- `5e8b747` — feat(born-to-dance): custom offline/online audition register flow; remove generic auditions tab

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
- `src/app/events/[slug]/page.tsx` — redesigned event card (hero, sub-nav, judges, categories, schedule, accordions, aside, results)
- `src/app/events/[slug]/standings/page.tsx` — public shareable standings page (`/events/<slug>/standings`), gated by `canViewLeaderboard`
- `src/app/events/[slug]/live/page.tsx` — live spectator + standings, gated by `canViewLeaderboard`
- `src/app/events/page.tsx` — events listing with prize pool
- `src/components/event-card.tsx` — event card with directions link + prize pool + (completed) card leaderboard
- `src/components/event-card-leaderboard.tsx` — compact card standings; "Copy link" + "Full results →" point to `/events/<slug>/standings`; 403 → "Results paused"
- `src/components/live-leaderboard.tsx` — full live/final leaderboard (reused on event page, `/live`, `/standings`); handles `leaderboard_visibility` + hidden state
- `src/components/copy-link-button.tsx` — reusable copy-absolute-URL button
- `src/app/page.tsx` — homepage with event cards + gallery slider

### Event Presentation (Judges + Leaderboard toggle)
- `src/lib/leaderboard-access.ts` — `canViewLeaderboard` (public, else only ADMIN + owning organizer), `LEADERBOARD_HIDDEN_CODE`, `leaderboardHiddenResponse()`
- `src/app/api/events/[eventId]/judges/route.ts` + `.../judges/[judgeId]/route.ts` — judge CRUD (organizer)
- `src/app/api/events/[eventId]/photos/route.ts` + `.../photos/[photoId]/route.ts` — event highlight photos CRUD (organizer, max 6)
- `src/components/event-hero.tsx`, `event-countdown.tsx`, `event-sub-nav.tsx`, `section-heading.tsx` — event card chrome
- `src/components/event-judges.tsx`, `event-categories.tsx`, `event-schedule.tsx`, `event-info-accordion.tsx`, `event-aside.tsx`, `event-gallery-strip.tsx` — event card sections
- `src/components/event-judges-manager.tsx` + `judge-photo-upload.tsx` — dashboard Judges-tab judge manager (now rendered under Photos → Judge bio & photo)
- `src/components/event-photos-manager.tsx` — dashboard Photos → Event highlights manager

### Gallery
- `src/app/gallery/page.tsx` — public gallery (All/Photos/Videos)
- `src/app/api/gallery/route.ts` — public gallery feed
- `src/app/api/admin/gallery/route.ts` + `.../[id]/route.ts` — admin gallery CRUD
- `src/components/gallery-slider.tsx` — homepage featured slider
- `src/components/gallery-grid.tsx` — grid + lightbox (video → VideoModal)
- `src/app/admin/gallery/page.tsx` + `src/components/gallery-manager.tsx` — founder gallery manager


### MC / Host
- `src/components/mc-portal.tsx` — read-only MC portal (phase line, roster, seed-ordered bracket)
- `src/app/api/mc/state/route.ts` — read-only MC state (`eventId`, lane `seed`, `participants` roster)
- DELETED (server-side lock): `src/app/api/mc/advance/route.ts`, `src/app/api/mc/match/route.ts`
- `src/lib/bracket.ts` — `groupIntoLanes()` (folds lone entries into a 1v1v1)
- `src/components/mc-entry-form.tsx` — code entry (`max-w-2xl`, bordered `role="alert"` error)
- `src/components/staff-codes-tab.tsx` — running order + share-code alert

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
- `src/app/globals.css` — dark + `[data-theme="light"]` CSS vars, radius tokens, UNLAYERED `.max-w-xs..xl` overrides (see Session 12 collision fix)
- `tailwind.config.ts` — colors → `var(--*)`, radius/shadows

### Homepage
- `src/app/page.tsx` — hero, stats strip, value props, demo, events tabs, gallery slider, testimonials, footer CTA
- `src/components/home-events.tsx` — Live/Upcoming/Past event tabs (skips compact board when `showPublicLeaderboard === false`)
- `src/components/event-card.tsx` — poster `object-contain` + directions + prize pool

### Admin
- `src/app/admin/page.tsx` — dashboard
- `src/app/admin/analytics/page.tsx` — analytics charts
- `src/app/admin/payments/page.tsx` — payment verification
- `src/app/admin/artists/page.tsx` — artist list (with avatar + privacy)
- `src/app/admin/gallery/page.tsx` — gallery manager (photos + video links)
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
- Tailwind `max-w-xs/sm/md/lg/xl` collide with the custom `spacing` tokens under the legacy `@config` (see Session 12). They are patched with unlayered overrides in `globals.css`; if anyone adds a responsive variant (e.g. `md:max-w-md`) the unlayered base rule would win and break it — add a matching `@media` override if that happens.

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
- `f71e22c` — feat(born-to-dance): structured multi-line WhatsApp verification message
- `5e8b747` — feat(born-to-dance): custom offline/online audition register flow; remove generic auditions tab
- `f9aef62` — feat: TRIO format, GROUP min-4, upload progress everywhere, organizer bio, auditions
- `62d4bc1` — feat: add upload progress + success/failure status for photos
- `ccbd061` — feat(events): strict leaderboard hiding, Photos section & event highlights
- `784deb1` — feat(events): redesign event card with judges, leaderboard toggle & gallery
- `af824d8` — docs: record session 13 in memory1.md
- `e61344c` — feat(events): add shareable per-event standings page
- `c961e58` — fix(tailwind): restore named max-w-* scale broken by spacing collision
- `46979e1` — feat(mc): read-only MC portal with roster, seeds & brackets; broaden MC layouts
- `ac449aa` — feat(mc): broaden MC/host layout and clarify match view
- `5929fe9` — feat(bracket): fold lone entries into a 1v1v1 instead of a bye
- `f5a3b94` — fix(leaderboard,control-room): drop duplicate matchup line; add 3-way 1/2 winner checkboxes
- `d0b1f37` — fix(control-room): accept empty body in advance-phase to fix Advance button
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
