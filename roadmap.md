# AIRA — Implementation Roadmap

**Last updated:** 2026-06-13
**Sources:** [docs/PRD.md](./docs/PRD.md) v1.0 MVP, planning session 2026-05-25, progress sync 2026-06-09, S3 close-out + F25 deferral 2026-06-13.
**Companion docs:** [.mstack/design-system/DESIGN.md](./.mstack/design-system/DESIGN.md) · [TODOS.md](./TODOS.md) · [FORK_CHECKLIST.md](./FORK_CHECKLIST.md)

This is the living tracker. Update sprint statuses, check off features as they land, log decisions inline. Re-read it at the start of every sprint planning session.

---

## Working assumptions

- **Cadence:** 2-week sprints, small focused team.
- **Hosting:** Replit Reserved VM (per `.replit` `deploymentTarget = "vm"`). Single always-on process. Port 5000 prod, 3000 dev. Not Vercel.
- **Cron strategy:** `node-cron` in-process. The VM is always-on so polling jobs are reliable. If we outgrow this (or need horizontal scale), upgrade to `pg_cron` in Neon or an external worker.
- **Push:** Expo Notifications (no extra vendor account).
- **Auth (MVP):** email/password + email verification via Better Auth. Admin gets TOTP MFA on top. Phone OTP deferred to Sprint 1.5.
- **Payments (MVP):** manual / offline only — admin records `payment_status` per `BusinessSubscription`. No Stripe.
- **Reminders (MVP):** email-only via Postmark. SMS deferred to Sprint 1.5.

## Vendor / integration status

| Vendor | Status | Used for |
|---|---|---|
| Apple Developer | ✅ Exists | Mobile distribution, .well-known/apple-app-site-association |
| Google Play Console | ✅ Exists | Mobile distribution, .well-known/assetlinks.json |
| Neon Postgres | ✅ Exists | Database (dev + prod branches) |
| Postmark | ✅ Exists | Email (auth, reminders, broadcasts) |
| Google Maps Platform | ✅ Exists | Places Autocomplete in admin Business form |
| Expo / EAS | 🔧 Need init | Mobile builds — Sprint 0 |
| Replit Reserved VM | ✅ Exists | Production deployment |
| Twilio Verify | ⏸ Deferred | OTP — Sprint 1.5 pending client confirmation |
| Twilio Messaging | ⏸ Deferred | SMS reminders — Sprint 1.5 pending client confirmation |
| Stripe | ⏸ Phase 2 | Self-serve subscriptions, Customer Portal |
| Sentry | ⏸ Optional | Error tracking — Sprint 7 if budget allows |

## Status legend

- ⬜ Not started
- 🟦 In flight
- ✅ Done
- ⏸ Deferred
- ❌ Blocked

---

## Off-roadmap progress (2026-05-26 → 2026-06-09)

Significant work has shipped between the original sprint plan and now that isn't slotted into S0–S7. Captured here so the roadmap reflects reality.

### ✅ Auth-shell redesign (2026-05-26)
Plan: `.mstack/plans/2026-05-26-auth-shell-redesign.md`. Cormorant headings + Figma copy across web `(auth)` pages, tree-of-life logo + "AIRA by Nisarga" footer in the auth layout, shared `AuthShell` component wrapping the six mobile `(auth)` screens, and a new welcome hero (tree-of-life + dual CTAs + footer) on mobile. Post-login redirect flipped from `/messages` to `/home`.

### ✅ End-user app shell (2026-05-27)
Plan: `.mstack/plans/2026-05-26-end-user-app-shell.md`. The S3 "browse skeleton" note referenced this; it's now fully implemented:
- `(app)` layout restructured around a persistent 280px green-textured sidebar (desktop) + mobile drawer + 3-tab bottom bar (Home / Categories / Account)
- `/home` branded landing with featured directory
- `/categories` full-screen category browser
- `/listings/[category]` + `/listings/[category]/[id]` business detail
- `/account` profile hub with Account + Support menus
- `businesses` Drizzle table + server queries + listing UI components (card, detail, category row, stat card)

### ✅ Marketing page launch + waitlist (2026-05-25 → 2026-06-08)
Plans: `.mstack/plans/2026-05-25-marketing-page-launch.md`, `2026-06-08-business-waitlist-modal.md`. Marketing nav swapped Sign In / Get Started for a "Join Waitlist" modal; the Google Form CTA replaced by an in-app business sign-up modal. New `POST /api/v1/business-waitlist` route, `BusinessWaitlistSignupSchema` validator, extended `waitlist` table with business-side columns, and a Postmark `BusinessWaitlistWelcomeEmail` template.

### ✅ REST API migration (2026-06-07) — **architectural unlock**
Plan: `.mstack/plans/2026-06-07-rest-api-migration.md`. Every web Server Action surface migrated to `/api/v1/*` so web + mobile share one contract:
- `apiServerFetch` helper for in-process RSC op invocation; `apiClient` composition root at `apps/web/src/lib/api-client.ts`
- Listings, profile, admin (users + audit + mutations), messages, notifications all on REST
- `defineOperation.runFromAction` and the Server-Action plumbing **deleted**; lefthook `check-no-server-actions` gate added to prevent regression
- Recorded in [docs/decisions/0007-service-layer.md](./docs/decisions/0007-service-layer.md) and CLAUDE.md hard rule

### ✅ Business social links (2026-06-08)
Plan: `.mstack/plans/2026-06-08-business-social-links.md`. Added `facebook_url`, `instagram_url`, `whatsapp_number` columns + `SocialLinks` component with inline brand-coloured SVG icons. Wired into BusinessCard + BusinessDetail. Admin edit form at `/admin/businesses/[id]` shipped at the same time.

### ✅ Business detail visual rework + new editorial fields (2026-06-09)
Detail page redesigned to match Figma — multi-card layout (hero, About Us, Contact, AIRA Review), `image_url` hero, social icons in the header. Two new schema columns added via migration `0013`:
- `hours` — free-text opening hours, rendered with a Clock row in the Contact card
- `aira_review` — editorial blurb shown as its own card

Admin edit form gained an "Editorial" section + the `hours` input.

### ✅ Admin shell rework (2026-06-09)
`/admin` now uses the same green-textured sidebar shell as the user-facing `(app)` layout. New dashboard landing page (`/admin`) with stat tiles, quick-link cards, and a recent-businesses list. New components under `app/admin/_components/`: `admin-sidebar.tsx`, `admin-mobile-sidebar.tsx`, `admin-top-bar.tsx`.

### ✅ S3 — Listings pagination + scoped search (2026-06-09)
Plan: `.mstack/plans/2026-06-09-listings-pagination-search.md`. Paginated listing view (12/page default, configurable), URL-driven pagination with `page` param, server-side total count, `<Pagination>` component with first/last/current±1 truncation. Scoped keyword search with 300ms debounce, `q` URL param, React 19 derived-state sync between URL and input, `verified` boolean filter toggle. `listBusinessesOp` widened with `q`, `page`, `pageSize`, `verified` inputs; `BusinessListOutputSchema` widened with `total`, `page`, `pageSize`.

### ✅ S3 — Admin star rating (F11) (2026-06-09)
Plan: `.mstack/plans/2026-06-09-admin-star-rating.md`. `rating` numeric(2,1) column (migration `0014`) with 0–5 DB check constraint. `<RatingPill>` component (Star icon, warning token colour, `.toFixed(1)`, hidden when ≤ 0). `rating` field added to admin Business edit form with 0.5-step number input. Public read queries pass `rating` through; `BusinessSchema` widened.

### ✅ S3 — Business soft-delete + restore (F13 partial) (2026-06-09)
Plan: `.mstack/plans/2026-06-09-business-soft-delete.md`. `deleted_at timestamp` column + partial active-subset index (migration `0015`). All public reads filter `WHERE deleted_at IS NULL`. Admin archive/restore service mutations with audit log entries (`business.archived` / `business.restored`). `POST /api/v1/admin/businesses/[id]/archive` + `/restore` routes. `/admin/businesses` gains Status column (Active/Archived chip) + `?archived=1` toggle; uses new `listAllBusinessesAdminOp` (also fixes pre-existing "admin list only showed tier1+tier2" bug). `<ArchiveControl>` component in admin detail header — AlertDialog confirmation. QA: 9/9 scenarios pass.

### ✅ S2 — City scoping + Category tree + Homepage CMS (2026-06-09)
Plan + review: `.mstack/plans/2026-06-09-city-category-cms.md` / `.mstack/reviews/2026-06-09-city-category-cms.md`. `city`, `category` (self-FK + level 1–3 check), `app_setting` tables via migration `0016`. Admin pages: `/admin/cities` (CRUD), `/admin/categories` (tree manager + drag-reorder via `@dnd-kit/sortable` + deactivate dialog), `/admin/settings/homepage` (CMS). Public `(app)` sidebar + `/listings/[slug]` switched to DB-driven categories. Homepage reads `AppSetting` for About title/body and stat count overrides. QA: 15/15 Playwright scenarios pass.

### ✅ S4 — Membership, Sponsorship, sponsored sort (2026-06-10)
Plans: `.mstack/plans/2026-06-09-s4-membership-sponsorship.md` / `.mstack/reviews/2026-06-10-s4-membership-sponsorship.md`. Admin creates `MembershipPlan` and `SponsorshipTier` records; records manual subscriptions per business with `payment_status` and optional Zelle evidence URL; creates date-range `Sponsorship` records per business × category × tier. Public listing pages now gate visibility to businesses with an active paid subscription AND float sponsored businesses to the top of their category (tier.priority → amount_cents → name). Two cron jobs added: `sponsorship-status-rollover` (hourly) and `subscription-status-rollover` (daily). Migrations `0017` (membership + subscription tables) + `0018` (sponsorship_tier + sponsorship tables). QA: 20/20 Playwright scenarios pass.

### ✅ S5 mini-sprint — Renewal reminder, homepage sponsored sort, sponsorship slot limits (2026-06-10)
Plan: `.mstack/plans/2026-06-10-s5-renewal-reminder-homepage-slots.md`. Three follow-on gaps from S4:
- **Renewal reminder cron (F17 partial):** `renewal-reminder` daily job (8 AM UTC) — queries `paid` subscriptions expiring within 7 days, sends a summary email to `brand.supportEmail` with a CTA deep-link to `/admin/businesses?renewing=7`. Logged to `cron_run`. Visible as the third card on `/admin/cron`.
- **Homepage sponsored sort:** `getFeaturedBusinesses` extended with correlated subqueries that float businesses with any active cross-category sponsorship to the top of the homepage featured tile (within the existing tier1+tier2 visibility filter). Sort: sponsored-flag → best-tier-priority → highest-bid → TIER_ORDER → name.
- **Sponsorship slot limits (accelerated from Phase 2):** `max_slots integer NULL` added to `sponsorship_tier` (migration `0019`). Enforced per-(tier, category) at create time — `409 sponsorship.tier_slots_full` if slot count ≥ max_slots. "Add sponsorship" dialog re-fetches tiers with slot annotation after category selection; full tiers disabled. "Max slots per category" field in tier admin form.

QA: 17/17 Playwright scenarios pass (`.mstack/qa/2026-06-10-0847/`). One high-severity issue found and fixed (missing `KNOWN_JOBS` entry for `renewal-reminder` on the admin cron page).

### Other notable items
- Drizzle migrations shipped since 2026-05-25: `0008` (session.last_activity_at), `0009` (user_role enum), `0011` (businesses table), `0012` (social fields), `0013` (hours + aira_review), `0014` (rating), `0015` (deleted_at + partial index), `0016` (city + category + app_setting), `0017` (membership_plan + business_subscription), `0018` (sponsorship_tier + sponsorship), `0019` (sponsorship_tier.max_slots), plus waitlist extensions.
- Businesses stat `COUNT` bigint-as-string fix (commit `233f144`): `@neondatabase/serverless` returns `COUNT(*)` as a string; wrapped in `Number()` in `packages/services/src/businesses/queries.ts`.
- React-email templates groundwork (`.mstack/plans/2026-05-24-react-email-templates.md`)
- Brand consolidation, primary-color darken, template hardening (May 23–24 cluster) — all merged
- Mobile welcome + session gate
- Replit-specific notes: `.claude/memory/replit-gh-push-auth.md` + `replit-truncated-history.md` document the gotchas from pushing to GitHub from the Replit workspace

---

## Sprint 0 — Foundation & accounts (~1 week)

**Status:** 🟦 In flight — most internal/config work done 2026-06-09. Outstanding items all need external account work (Apple Developer, Google Play Console, domain registration, EAS init).

**Project facts (locked 2026-06-09):**
- Prod host: `airabynisarga.com`
- Bundle ID (iOS + Android): `com.airabynisarga.app`

**Goal:** Everything with external lead time or one-time config is in motion before we start building features.

- ⬜ Register `airabynisarga.com` domain (in progress per user)
- ✅ Postmark sender signature + DKIM/SPF (Postmark server token set in Replit env)
- ⬜ EAS project init (`eas init`) + bundle ID registration with Apple/Google
- ✅ Bundle identifiers in `apps/mobile/app.config.ts` — `com.airabynisarga.app` (iOS + Android), associated domain `airabynisarga.com`
- 🟦 `.well-known/apple-app-site-association` — bundle ID filled; `{{APPLE_TEAM_ID}}` waiting on Apple Developer
- 🟦 `.well-known/assetlinks.json` — package filled; `{{ANDROID_CERT_SHA256}}` waiting on Play Console signing
- ✅ Env secrets: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `POSTMARK_SERVER_TOKEN`, `GOOGLE_MAPS_API_KEY`, `INITIAL_ADMIN_EMAIL` set in Replit prod
- ✅ Neon database — dev branch live; prod handled via Replit env
- ✅ Replit production env wiring verified
- ✅ `pnpm db:migrate` clean (migrations 0001–0013 applied)
- 🟦 [FORK_CHECKLIST.md](./FORK_CHECKLIST.md) — internal items ticked; external blockers (Apple Team ID, Android SHA-256, EAS init, OAuth apps) called out

**Risk gate:** None — pure setup. But blockers here cascade into S6 mobile shipping, so finish before S1 ends.

**Libs to add:** none in code; account/CLI setup only.

---

## Sprint 1 — Auth, RBAC, sessions (2 weeks)

**Status:** ✅ Done — RBAC + idle-timeout + audit shipped via `feat/auth-rbac-hardening` (now on `main`); admin idle-timeout verified end-to-end on the deployed Replit URL (`/mlabs-qa` run 2026-05-26-1020). **MFA split into Sprint 1.5** (see plan `.mstack/plans/2026-05-26-auth-rbac-hardening.md` + review).

**Goal:** A new user signs up with email + verifies via Postmark + reaches an empty home screen. An admin logs in at `/admin` with email + password + reaches an empty admin dashboard, with 30-min idle-timeout and an audit trail. Role-based route guards work. (TOTP MFA on top of password lands in **Sprint 1.5** before any external admin sign-in.)

**Features (PRD refs):**
- ✅ F1 (amended) — **Email/password auth + email verification** (not phone OTP). Better Auth handles out-of-box. (Template-shipped pre-S1; no new work in this sprint.)
- ✅ F2 (RBAC half) — `user_role` pgEnum (`end_user`, `admin`, `super_admin`) + `super_admin` env-bootstrap on `main`. **MFA component split out to S1.5** — see below.
- ✅ F3 — Sliding 30-min admin idle-timeout via `session.last_activity_at` + signed audit on stale-bounce; 7d Better Auth default for end-users; logout flow audits as `session.revoked.reason = "logout"`. Verified end-to-end on Replit.

**Schema additions:** `user_role` Postgres enum migration (0009); `session.last_activity_at` column (0008). `mfa_enabled` + `user_device` deferred (MFA in S1.5, push registration in S5).

**Libs to add:**
- (Deferred to S1.5) Better Auth `two-factor` plugin (TOTP)
- (Deferred to S1.5) `qrcode` (for TOTP QR rendering in admin setup flow)

**Cron jobs:** none yet.

**Risk gate:** End-to-end signup → verify email → login → access role-gated route works on the deployed Replit URL (not just localhost). Admin idle-timeout verified via `/mlabs-qa`.

**Decision deferred for client:** Sprint 1.5 — should phone OTP replace email/password, or live alongside as an alternative login method?

---

## Sprint 1.5 — Admin MFA (DROPPED FROM MVP)

**Status:** ⏸ Dropped from MVP scope on **2026-06-09**. Sliding 30-min idle-timeout (S1, F3) + audit trail (S1, F2) are the controls relied upon for admin security until a post-launch revisit. Reopen if the deployment ever exposes admin accounts to non-internal staff.

**Original scope (retained for reference):** TOTP via Better Auth `two-factor` plugin, `/admin/setup-mfa` enrollment, force-redirect existing admins on next login, QR code + recovery codes.

---

## Sprint 2 — Data model + Categories admin (2 weeks)

**Status:** ✅ Done — F4 (city scoping), F6 (categories CRUD + drag-reorder), F24 (homepage CMS) shipped on `feat/rest-api-migration` (2026-06-09). `/mlabs-qa` smoke pass 15/15 verified same day. F5 web sidebar is DB-driven; native mobile category tree pending.

**Goal:** Admin creates City "Atlanta", builds a Category > Subcategory > Sub-subcategory tree, reorders by drag, activates/deactivates. Mobile shows the tree (empty listings page). Homepage About text and counts editable.

**Features (PRD refs):**
- ✅ F4 — City scoping (`city` table + admin CRUD at `/admin/cities` + Atlanta seeded active, migration `0016`)
- 🟦 F5 — Multi-level Category nav (web public sidebar + `/listings/[slug]` now DB-driven; native mobile sidebar pending)
- ✅ F6 — Categories CRUD (admin tree manager, drag-reorder via `@dnd-kit/sortable`, slug auto-from-name, level constraint ≤3, deactivate dialog)
- ✅ F24 — Homepage CMS (`AppSetting` key/value table; About title + body + stat count overrides; verified live on `/home`)

**Schema additions:** ✅ `city`, `category` (self-FK `parent_id`, level 1–3 check constraint), `app_setting` (key/value + optional `city_id`) — migration `0016`.

**Libs added:** ✅ `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (category drag-reorder). Slugify done inline (no extra lib needed).

**Cron jobs:** none.

**Risk gate:** ✅ Migration `0016` applied cleanly; Playwright smoke pass confirms all CRUD flows.

---

## Sprint 3 — Listings: admin CRUD + end-user browse (2 weeks)

**Status:** ✅ Done (2026-06-13) — all MVP scope shipped. F25 city-aware slugs deliberately deferred (see note below).

**Goal:** Admin creates a Business with full details (Google Places address, multi-category, ≤3 gallery images, verify tick, rating). End-user opens the matching category page and sees the listing card with tap-to-call, WhatsApp, social, More Info modal.

**Features (PRD refs):**
- ✅ F7 — Listing page pagination + A-Z sort (12/page, URL-driven; sponsored sort lands S4)
- ✅ F8 — Scoped keyword search (in-category, debounced, URL-driven, verified filter)
- ✅ F9 — Business Listing Card with quick actions (tel:, wa.me, social links — More Info → detail page)
- ✅ F10 — More Info (detail page: Hero, About Us, Contact, AIRA Review cards; ≤3 image carousel via `BusinessImageCarousel`; address is a clickable Google Maps directions link — 2026-06-13)
- ✅ F11 — Verified badge + admin star rating (RatingPill hidden when ≤ 0; 0.5-step input in admin form)
- ✅ F13 — Business CRUD (soft-delete/restore + audit log + admin list Status column; gallery upload via `GallerySection` + `react-dropzone` + `/api/v1/admin/businesses/[id]/images` POST/DELETE; multi-category attach via `CategorySection` + `business_category` join — all shipped)
- ✅ F27 — Google Places Autocomplete (`PlacesAddressInput` component wired in admin Business form; falls back to plain input when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` absent)
- ⏸ F25 (web half) — City-aware slugs **deferred to S6** — see decision note below

**F25 deferral note (2026-06-13):** AIRA is Atlanta-only for MVP. Adding `/atlanta/` as a URL prefix to `/listings/[category]` buys zero user benefit at this stage and introduces redirect complexity + mobile deep-link coordination. Current URLs (`/listings/[category]`) are stable and shareable. **Revisit in S6** when Universal Links / App Links activation needs a stable, city-scoped URL contract for the mobile deep-link wiring. At that point, add a single `[city]` segment, seed the Atlanta slug, and add 301 redirects from the old paths.

**Schema additions:** ✅ `businesses` (`0011`); ✅ social (`0012`); ✅ `hours` + `aira_review` (`0013`); ✅ `rating` (`0014`); ✅ `deleted_at` + partial index (`0015`); ✅ `business_image` (`0020` — gallery); ✅ `business_category` join (`0020` — multi-category).

**Libs added:** ✅ `react-dropzone` (gallery upload UI); ✅ vanilla Places SDK via `<Script>` in admin layout (no extra npm package needed).

**Cron jobs:** none.

**Risk gate:** ✅ Google Places billing alarm set in GCP. Image upload pipeline handles ≤3 images with 8 MB cap + Sharp resize to 1200×800.

---

## Sprint 4 — Membership, Sponsorship, sponsored sort (2 weeks)

**Status:** ✅ Done (2026-06-10) — QA 20/20

**Goal:** Admin sets membership prices + durations, records manual payments, assigns sponsorships to businesses for date ranges + tiers. Listings page respects active subscription gate AND sponsored-first sort within a category.

**Features (PRD refs):**
- ✅ F15 — Membership management + activation rules (visibility = `status=active` AND `BusinessSubscription` ACTIVE covering now)
- ✅ F16 — Manual payment recording + renewal tracking + filter "renewals due in X days" + CSV export light
- ✅ F18 — Sponsorship management (admin CRUD per business + category + date range + tier)
- ✅ F12 — Sponsored placement + sorting rules (tier.priority asc, amount_cents desc, name asc, then organic name asc)
- ✅ F19 — Pricing configuration (`MembershipPlan` + `SponsorshipTier` editable in admin)
- ✅ Add `payment_evidence_url` field to `BusinessSubscription` (Zelle screenshot upload — risk mitigation for manual payment disputes)

**Schema additions:** `membership_plan`, `business_subscription` (migration `0017`); `sponsorship_tier`, `sponsorship` (migration `0018`).

**Libs to add:**
- `node-cron` (in-process scheduler — first sprint that needs it)

**Cron jobs added:**
- `sponsorship_status_rollover` (hourly): SCHEDULED → ACTIVE on start_date; ACTIVE → EXPIRED on end_date+1
- `subscription_status_rollover` (daily): set EXPIRED when now > end_date

**Risk gate:** Cron jobs survive a redeploy of the Replit VM. Confirm they actually fire on schedule (not just on a manual trigger).

---

## Sprint 5 — Renewals, Posts board, Broadcasts (2 weeks)

**Status:** 🟦 In flight — F17 (renewal reminder, 7-day fixed window) and homepage sponsored sort shipped in the S5 mini-sprint (2026-06-10). Community Requests Board, Notifications broadcast, and purge cron remain.

**Goal:** Renewal reminder emails go out on the configurable schedule. Community Requests Board live with submission + moderation queue + auto-expiry. Admin broadcasts a push notification to a segment of business users and it lands on real devices.

**Features (PRD refs):**
- 🟦 F17 (amended) — Renewal reminder automation, **email-only** via Postmark. **7-day fixed window shipped** (daily cron, admin inbox, deep-link to renewing filter). Configurable schedule (`AppSetting.reminder_schedule`) and individual business-owner emails remain.
- ⬜ F20 — Community Requests Board (submission with PENDING status, admin moderation, auto-expire after `posts_expiry_days`, search/pagination)
- ⬜ F21 — Notifications broadcast to business users (audience: city / categories / specific businesses; channel: Expo Push). Log to `Notification` + `NotificationDelivery`.
- ⬜ F14 — Lifecycle: `purge_soft_deleted` cron (default 180 days)

**Schema additions:** `post`, `notification`, `notification_delivery` (optional but recommended for delivery tracking). Note: `sponsorship_tier.max_slots` (migration `0019`) shipped in S5 mini-sprint.

**Libs to add:**
- `expo-server-sdk` (push delivery from the Next.js server)
- Postmark template additions for the 3 reminder windows

**Cron jobs added:**
- `expire_posts` (hourly): status PENDING/APPROVED with `expires_at < now` → EXPIRED
- ✅ `renewal-reminder` (daily 08:00 UTC): query paid subscriptions expiring within 7 days, dispatch summary email to admin inbox — **shipped in S5 mini-sprint**
- `renewal_reminders` full (daily): configurable multi-window schedule offsets + per-business-owner emails — remaining
- `purge_soft_deleted` (daily): hard-delete businesses with `status=soft_deleted AND deleted_at > now - purge_days`

**Risk gate:** Push notification arrives on a real iOS device AND a real Android device. Renewal email lands in Postmark + delivers to a real inbox (not just localhost test).

---

## Sprint 6 — Mobile shipping + admin polish (2 weeks)

**Status:** ⬜ Not started

**Goal:** First TestFlight build + Play Internal Track build in QA's hands. Admin console feels finished. All TODO items from `TODOS.md` cleared.

**Features (PRD refs):**
- ⬜ F26 — Mobile app distribution + update prompt (`AppSetting.min_supported_build_*`, blocking dialog with store links if behind)
- ⬜ F25 (mobile half) — Deep links wiring (Universal Links + App Links activation via .well-known files filled in S0)
- ⬜ F22 — Audit log UI (filterable by date / actor / entity / action, search, CSV export)
- ⬜ F23 — Full CSV export (Listings, Categories, Memberships, Sponsorships, Posts — apply current filters)
- ⬜ AppSetting admin UI (reminder schedule, posts expiry, purge days, min builds, homepage counts override)
- ⬜ Clear all open items from [TODOS.md](./TODOS.md) — brand strings, mobile fonts via `@expo-google-fonts/*`, dark theme client review

**Schema additions:** none — AuditLog already exists from S2.

**Libs to add:**
- `@expo-google-fonts/lato` + `@expo-google-fonts/cormorant-garamond` + `expo-font` (mobile native typography per TODO)

**Cron jobs:** none new.

**Risk gate:** EAS build succeeds for both iOS and Android. Deep link from a manually-shared URL opens the correct screen on a real device.

---

## Sprint 7 — Beta, hardening, store submission (2 weeks)

**Status:** ⬜ Not started

**Goal:** App Store + Play Store submitted. Internal bug bash complete. Performance targets met. First review-cycle feedback addressed.

**Features:**
- ⬜ Playwright E2E pass across all critical flows (signup → verify → browse → post request → admin moderate)
- ⬜ Performance tuning: listings page < 2s P50 on 4G; image lazy-loading; query indices verified
- ⬜ Sentry (or alternative) instrumentation if budget allows
- ⬜ Push notification + deep link testing on physical iOS + Android devices in TestFlight / Play Internal
- ⬜ App Store metadata: app name, description, screenshots, keywords, privacy nutrition label
- ⬜ Play Store metadata: short + full description, screenshots, content rating, data safety form
- ⬜ Submit to App Store (expect 1-3 day initial review)
- ⬜ Submit to Play Store (expect same-day to 7-day review for new apps)
- ⬜ Address review-cycle feedback (plan for cycle 2 — new apps often need it)

**Schema additions:** none.

**Libs to add:**
- Sentry (optional)

**Cron jobs:** none new.

**Risk gate:** Both stores accept the build (or send actionable feedback we can fix in days, not weeks). See "Apple App Store reviewer pushback" in Risks tracker below.

---

# Post-MVP

## Sprint 1.5 — Phone OTP + Twilio (TBD — gated on client confirmation)

**Status:** ⏸ Deferred — pending client conversation in week starting 2026-06-01 (approx).

**Goal:** Add phone OTP login as an alternative to (or replacement for) email/password. Enable SMS renewal reminders alongside email.

**Why deferred from MVP:** User decision 2026-05-25 — wanted to avoid Twilio account dependency for the initial launch. Email-only flow is faster to ship; OTP can be added incrementally without breaking existing users.

**Features:**
- Better Auth `phone-number` plugin + Twilio Verify driver
- Migration: add `phone_e164` field on user, allow phone OR email as login identifier
- OTP screens in mobile (request, verify, resend with throttling)
- Rate limiting (5/min, 10/hour per number) — Better Auth helpers
- SMS renewal reminders via Twilio Messaging API (extends F17 from email-only to email+SMS)
- iOS Autofill domain prefix on `aira.app/.well-known/apple-app-site-association` for one-tap OTP

**Vendor additions:** Twilio account + Verify Service SID + Messaging service.

**Schema additions:** `phone_e164` (nullable text, unique when set) on user.

## Phase 2 (per [PRD § Roadmap](./docs/PRD.md))

Out-of-scope for MVP; revisit after launch + 1-2 months of usage data:

- Email/password recovery flows for end users
- Masked call routing via Twilio proxy numbers (call logging + basic analytics)
- Anti-spam for Posts board (rate limiting, keyword checks, reject-reason UI)
- Multi-city UI switcher + cross-city slug handling + city-aware admin analytics
- ~~Sponsorship tiers with slot limits~~ — **shipped in S5 mini-sprint** (per-category max_slots + 409 enforcement + dialog slot annotation); richer rotation / rotation algorithms remain Phase 2
- Stripe subscriptions (memberships + sponsorship add-ons), Checkout, Customer Portal, revenue dashboards, ACH/check/wire invoicing
- Business-owner self-edit portals
- Algolia / Typesense if scoped search needs fuzzy / fault-tolerant matching

---

# Risks tracker

| Risk | Owner | Mitigation |
|---|---|---|
| **Apple App Store §4.0 / §5.1.1 pushback** on community-trust login model | PM | Prepare clear "community trust + spam prevention" justification; have reviewer demo account; pre-emptively design a "browse 3 sample listings as guest" escape hatch we can ship if reviewers reject |
| Mobile shipping is 4-6 weeks elapsed from "code ready" → "in store" | Tech lead | Start Apple/Google account work + EAS init in S0; budget 2 review cycles in S7 |
| Manual-payment dispute risk ("I paid" vs "no you didn't") | PM | `payment_evidence_url` field added in S4 (Zelle screenshot upload); AuditLog covers admin-side actions |
| node-cron jobs miss firings if VM restarts during job window | Tech lead | Make all cron handlers idempotent (re-running them gives the same result); log `cron_run` per job to detect skipped windows |
| Older demographic + email-only auth = forgotten password friction | PM | Generous session TTL (7 days mobile); clear "forgot password?" flow; consider phone-OTP as a follow-up specifically because of this persona (Sprint 1.5) |
| Image hosting cost + bandwidth on S3 | Tech lead | Resize on upload via Sharp (already wired); set max image dimension; CDN if bandwidth becomes an issue |
| "Operated by Nisarga Group LLC" implies multi-tenant later | PM | Data model is already city-scoped (good); flag if Phase 2 multi-city happens without the UI switcher landing first |

---

# Decision log

Append-only. Add each architecture/scope decision with date + why.

- **2026-05-25** — Phone OTP auth deferred from MVP to Sprint 1.5. Start with email/password + email verification (Better Auth out-of-box). *Why:* avoid Twilio account dependency, faster Sprint 1, allow client conversation to confirm whether OTP is a hard requirement.
- **2026-05-25** — Twilio entirely deferred from MVP (no OTP, no SMS reminders). *Why:* tied to OTP deferral. Email-only reminders for MVP. Reopen on client confirmation next week. Admin can use CSV export of "renewals due" to make phone calls manually if needed.
- **2026-05-25** — Push vendor = Expo Notifications, not OneSignal. *Why:* native fit for Expo app, no extra vendor, scales to MVP needs.
- **2026-05-25** — Cron runner = `node-cron` in-process. *Why:* Replit Reserved VM is always-on; no Vercel Cron available; pg_cron in Neon would add SQL layer for logic that's cleaner in TS. Upgrade path to pg_cron or Inngest if we outgrow.
- **2026-05-25** — Deployment target = Replit Reserved VM, not Vercel. *Why:* existing setup, cost-effective for MVP scale, supports always-on cron in-process.
- **2026-05-25** — Sprint structure locked: 8 sprints (S0 + S1–S7), ~15 weeks engineering + 2-3 weeks app review cycles → ~18 weeks elapsed to live in stores.
- **2026-05-25** — Design system v1.0 locked as CSS approximation of Figma (not pixel-exact). Iteration cycles built in for client feedback. See `.mstack/design-system/DESIGN.md`.
- **2026-06-07** — REST API migration: every web Server Action surface moved to `/api/v1/*` so web + mobile share one contract. `defineOperation.runFromAction` deleted; lefthook `check-no-server-actions` gate added. *Why:* the monorepo ships both `apps/web` and `apps/mobile` — Server Actions split them onto two code paths. RSCs now call `apiServerFetch` (in-process, same Zod pipeline); Client Components call `apiClient`. Recorded in `docs/decisions/0007-service-layer.md` + CLAUDE.md hard rule.
- **2026-06-08** — Business detail card design split into multiple cards (Hero, About Us, Contact, AIRA Review) to match Figma. *Why:* single bordered card didn't match the Figma's stacked-card hierarchy; multi-card maps better to optional content (e.g. detail page works even when only a subset of fields are populated).
- **2026-06-09** — `--card` token aligned to Figma `#F3EBDD` (was `#F8F2E4`). *Why:* surface contrast against page cream `--background` matches the Figma intent.
- **2026-06-09** — `next-themes` dropped from `apps/web/src/app/providers.tsx`. *Why:* `forcedTheme="light"` with `enableSystem={false}` provided no dynamic behaviour; React 19 flagged the injected `<script>` tag. `colorScheme: "light"` on `<html>` carries light mode. Re-add if/when a real dark-mode toggle ships.
- **2026-06-09** — Admin shell adopts the same green-textured sidebar pattern as the user-facing `(app)` layout. New default landing page at `/admin` (dashboard tiles + recent businesses). *Why:* admins moving between `/home` and `/admin` should feel one product; previous top-bar layout was visually disconnected.
- **2026-06-09** — Prod host locked to `airabynisarga.com`; bundle ID locked to `com.airabynisarga.app` (iOS + Android). Substituted into `apps/mobile/app.config.ts`, `apple-app-site-association`, `assetlinks.json`. Apple Team ID + Android signing-cert SHA-256 remain placeholders pending external account work.
- **2026-06-09** — Sprint 1.5 (Admin MFA) **dropped from MVP scope**. Sliding 30-min idle-timeout + audit trail are the controls relied upon. *Why:* admin accounts are internal-only for launch; MFA adds engineering + recovery-code policy work that isn't justified pre-launch. Reopen if external admins ever get enrolled.
- **2026-06-09** — Listings pagination uses URL-driven state (`?page=N&q=...&verified=1`) with React 19 derived-state pattern (compare-and-set in render, not `useEffect`) for prop → input sync. *Why:* URL-driven state makes browser back/forward and shareable URLs work without extra client state machinery.
- **2026-06-09** — Business soft-delete pattern: `deleted_at timestamp NULL` column + partial index on `(category, tier) WHERE deleted_at IS NULL`. All public reads filter `isNull(deleted_at)`; admin reads use a bypass variant (`getBusinessByIdIncludingArchived`). *Why:* reversible, audit-friendly, no parallel table needed; partial index keeps the common public-side query fast as the archived row count grows.
- **2026-06-09** — `AlertDialog.Trigger render={<Button>}` pattern dropped from `ArchiveControl`. Using two `@base-ui/react` primitives nested via `render=` races the click → onOpenChange cycle. Since `open` is controlled state, `Trigger` adds no value — plain `<Button onClick={() => setOpen(true)}>` is deterministic. *Why:* intermittent dialog-open failure in Playwright (30% flake rate), fixed after removing the wrapper.
- **2026-06-09** — S2: `AppSidebar` is `"use client"` so the `(app)/layout.tsx` RSC owns the `listCategoriesOp` fetch and passes active root categories as a prop; fallback to static `CATEGORIES_ORDERED` on error. *Why:* Server Components can't be rendered inside a client component tree — the RSC wrapper must fetch and push data down.
- **2026-06-09** — `isValidCategory` guards removed from `businesses/queries.ts` (S2). After `BusinessCategorySchema` widened to `z.string()`, any admin-created category slug would have been silently rejected (no results returned) and `toBusiness()` would have reclassified rows to "shopping". *Why:* the whitelist guards were designed for a hardcoded enum and break as soon as the category set is DB-driven.
- **2026-06-09** — `@neondatabase/serverless` returns `COUNT(*)` as a JavaScript string, not a number. `Number.isFinite("12")` = false, causing the `/home` businesses stat card to render "—". Fixed by wrapping `count()` results in `Number()` in `packages/services/src/businesses/queries.ts`. *Why:* PostgreSQL `bigint` has no safe JS representation so the driver returns it as string; Drizzle's `count()` helper inherits this.
- **2026-06-10** — Sponsorship slot limits (max_slots per category) accelerated from Phase 2 into the S5 mini-sprint. *Why:* small migration + service-layer change; admin was about to sell exclusive tiers without capacity controls, which would have required a data-fix later. Slot limits are per-(tier_id, category_id) — global limits rejected because the sponsorship model is per-category.
- **2026-06-10** — `apps/web/src/app/admin/cron/page.tsx` uses a static `KNOWN_JOBS` array — adding a handler to the cron registry does **not** auto-surface it on the admin page. Must add an entry to `KNOWN_JOBS` (name + human schedule string) alongside every new cron job. *Why:* discovered when `renewal-reminder` was missing from the cron page despite the handler being registered; caught in QA and fixed before shipping.
- **2026-06-13** — F25 (city-aware slugs) deferred from S3 to S6. *Why:* AIRA is Atlanta-only for MVP; `/listings/[category]` is stable and shareable; adding a `/[city]/` prefix now would require redirect handling and mobile deep-link re-coordination with no user-visible benefit. Revisit in S6 when Universal Links + App Links activation needs a stable city-scoped URL contract. At that point seed the Atlanta slug, add a `[city]` route segment, and 301 from old paths.
- **2026-06-13** — S3 marked ✅ Done. Gallery upload (`GallerySection` + `react-dropzone` + image pipeline), multi-category attach (`CategorySection` + `business_category` join), and Google Places Autocomplete (`PlacesAddressInput`) were all shipped during the off-roadmap sprint and not reflected in the tracker. Directions deep-link added to the public business detail page (address → `maps.google.com/?q=...`).
- **2026-06-10** — Homepage sponsored sort uses correlated subqueries (not LATERAL JOIN) to match Drizzle's `.orderBy()` builder, which has no LATERAL support. Three SQL fragments (`homepageSponsoredFlag`, `homepageSponsoredPriority`, `homepageSponsoredAmountCents`) follow the same pattern as S4's per-category sort helpers. The tier1+tier2 visibility filter is unchanged — sponsored sort lifts paying sponsors within the curated set, not beyond it.
