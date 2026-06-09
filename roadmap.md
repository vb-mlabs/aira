# AIRA — Implementation Roadmap

**Last updated:** 2026-06-09
**Sources:** [docs/PRD.md](./docs/PRD.md) v1.0 MVP, planning session 2026-05-25, progress sync 2026-06-09.
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

### Other notable items
- Drizzle migrations shipped since 2026-05-25: `0008` (session.last_activity_at), `0009` (user_role enum), `0011` (businesses table), `0012` (social fields), `0013` (hours + aira_review), plus waitlist extensions.
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

**Status:** ⬜ Not started

**Goal:** Admin creates City "Atlanta", builds a Category > Subcategory > Sub-subcategory tree, reorders by drag, activates/deactivates. Mobile shows the tree (empty listings page). Homepage About text and counts editable.

**Features (PRD refs):**
- ⬜ F4 — City scoping (start with Atlanta seeded active)
- ⬜ F5 — Multi-level Category nav + breadcrumbs (mobile)
- ⬜ F6 — Categories CRUD (admin, drag-reorder, slug auto-from-name, level constraint, uniqueness)
- ⬜ F24 — Homepage CMS (About text + counts override via `AppSetting`)

**Schema additions:** `city`, `category` (with parent self-FK + level), `app_setting` (key/value/city), `audit_log` (created here but heavily used from S4 onward).

**Libs to add:**
- `@dnd-kit/sortable` (admin category reorder)
- `slug` or inline slugify util

**Cron jobs:** none yet.

**Risk gate:** Drizzle migrations from this sprint apply cleanly to a Neon branch that was migrated from the empty MVP starting state. Establish the "never hand-edit a shipped migration" discipline.

---

## Sprint 3 — Listings: admin CRUD + end-user browse (2 weeks)

**Status:** 🟦 In flight — substantial off-roadmap progress (see Off-roadmap progress section above). Browse shell + business detail + social links + editorial fields + admin Business edit are live. Remaining S3 scope: pagination + scoped search (F7/F8), More Info modal (F10), admin star rating (F11 half), multi-category join + soft-delete/restore + gallery (F13 advanced), city-aware slugs (F25), Google Places Autocomplete (F27).

**Goal:** Admin creates a Business with full details (Google Places address, multi-category, ≤3 gallery images, verify tick, rating). End-user opens the matching category page and sees the listing card with tap-to-call, WhatsApp, social, More Info modal.

**Features (PRD refs):**
- 🟦 F7 — Listing page **(cards + A-Z sort live; pagination ≥10/page TODO — sponsored sort lands S4)**
- ⬜ F8 — Scoped keyword search (in-category, contains/starts-with, case-insensitive)
- ✅ F9 — Business Listing Card with quick actions (tel:, wa.me, social links — More Info link goes to detail page, modal optional)
- 🟦 F10 — More Info **(detail page live with Hero, About Us, Contact, AIRA Review cards; ≤3 images carousel + directions deep-link TODO)**
- 🟦 F11 — Verified badge live; **admin star rating TODO** (hide stars if 0/null)
- 🟦 F13 — Business CRUD **(single-category + core fields + social + hours + AIRA Review editable via `/admin/businesses/[id]`; multi-category attach, soft delete/restore, gallery, status workflow TODO)**
- ⬜ F25 (web half) — City-aware slugs + deep links (`/city/category/subcategory`)
- ⬜ F27 — Google Places Autocomplete (admin Business form)

**Schema additions:** ✅ `businesses` (migration `0011`); ✅ social columns (`0012`); ✅ `hours` + `aira_review` (`0013`). **TODO:** `business_image` table for gallery, `business_category` join for multi-category attach.

**Libs to add:**
- `@react-google-maps/api` OR vanilla Places SDK (admin Business form)
- `react-dropzone` (gallery image upload UI)
- Sharp already wired in `apps/web/src/features/avatar/server/pipeline.ts` — reuse for business image processing

**Cron jobs:** none yet.

**Risk gate:** Google Places billing alarm set in GCP. Image upload pipeline handles ≤3 images with size limits.

---

## Sprint 4 — Membership, Sponsorship, sponsored sort (2 weeks)

**Status:** ⬜ Not started

**Goal:** Admin sets membership prices + durations, records manual payments, assigns sponsorships to businesses for date ranges + tiers. Listings page respects active subscription gate AND sponsored-first sort within a category.

**Features (PRD refs):**
- ⬜ F15 — Membership management + activation rules (visibility = `status=active` AND `BusinessSubscription` ACTIVE covering now)
- ⬜ F16 — Manual payment recording + renewal tracking + filter "renewals due in X days" + CSV export light
- ⬜ F18 — Sponsorship management (admin CRUD per business + category + date range + tier)
- ⬜ F12 — Sponsored placement + sorting rules (tier.priority asc, amount_cents desc, name asc, then organic name asc)
- ⬜ F19 — Pricing configuration (`MembershipPlan` + `SponsorshipTier` editable in admin)
- ⬜ Add `payment_evidence_url` field to `BusinessSubscription` (Zelle screenshot upload — risk mitigation for manual payment disputes)

**Schema additions:** `membership_plan`, `business_subscription`, `sponsorship_tier`, `sponsorship`.

**Libs to add:**
- `node-cron` (in-process scheduler — first sprint that needs it)

**Cron jobs added:**
- `sponsorship_status_rollover` (hourly): SCHEDULED → ACTIVE on start_date; ACTIVE → EXPIRED on end_date+1
- `subscription_status_rollover` (daily): set EXPIRED when now > end_date

**Risk gate:** Cron jobs survive a redeploy of the Replit VM. Confirm they actually fire on schedule (not just on a manual trigger).

---

## Sprint 5 — Renewals, Posts board, Broadcasts (2 weeks)

**Status:** ⬜ Not started

**Goal:** Renewal reminder emails go out on the configurable schedule. Community Requests Board live with submission + moderation queue + auto-expiry. Admin broadcasts a push notification to a segment of business users and it lands on real devices.

**Features (PRD refs):**
- ⬜ F17 (amended) — Renewal reminder automation, **email-only** via Postmark. Configurable schedule (`AppSetting.reminder_schedule`, default `[-14d, -3d, +7d]`)
- ⬜ F20 — Community Requests Board (submission with PENDING status, admin moderation, auto-expire after `posts_expiry_days`, search/pagination)
- ⬜ F21 — Notifications broadcast to business users (audience: city / categories / specific businesses; channel: Expo Push). Log to `Notification` + `NotificationDelivery`.
- ⬜ F14 — Lifecycle: `purge_soft_deleted` cron (default 180 days)

**Schema additions:** `post`, `notification`, `notification_delivery` (optional but recommended for delivery tracking).

**Libs to add:**
- `expo-server-sdk` (push delivery from the Next.js server)
- Postmark template additions for the 3 reminder windows

**Cron jobs added:**
- `expire_posts` (hourly): status PENDING/APPROVED with `expires_at < now` → EXPIRED
- `renewal_reminders` (daily): query subscriptions matching the configured schedule offsets, dispatch Postmark email
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
- Sponsorship tiers with slot limits + richer ordering / rotation
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
