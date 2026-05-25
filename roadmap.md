# AIRA — Implementation Roadmap

**Last updated:** 2026-05-25
**Sources:** [docs/PRD.md](./docs/PRD.md) v1.0 MVP, planning session 2026-05-25.
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

## Sprint 0 — Foundation & accounts (~1 week)

**Status:** ⬜ Not started

**Goal:** Everything with external lead time or one-time config is in motion before we start building features.

- ⬜ Register `aira.app` (or final chosen) domain
- ⬜ Postmark sender signature for the production domain + DKIM/SPF records
- ⬜ EAS project init (`eas init`) + bundle ID registration with Apple/Google
- ⬜ Bundle identifiers in `apps/mobile/app.config.ts` (`ios.bundleIdentifier`, `android.package`)
- ⬜ `.well-known/apple-app-site-association` filled with real Apple Team ID + bundle ID
- ⬜ `.well-known/assetlinks.json` filled with real Android package + signing-cert SHA-256
- ⬜ GitHub Actions secrets: `DATABASE_URL` (dev + prod), `BETTER_AUTH_SECRET`, `POSTMARK_SERVER_TOKEN`, `GOOGLE_MAPS_API_KEY`, `INITIAL_ADMIN_EMAIL`
- ⬜ Neon production branch created + connection string captured
- ⬜ Replit production deployment env-var wiring verified (vs dev secrets)
- ⬜ `pnpm db:migrate` against the new Neon prod branch (sanity)
- ⬜ Walk and tick remaining items in [FORK_CHECKLIST.md](./FORK_CHECKLIST.md)

**Risk gate:** None — pure setup. But blockers here cascade into S6 mobile shipping, so finish before S1 ends.

**Libs to add:** none in code; account/CLI setup only.

---

## Sprint 1 — Auth, RBAC, sessions (2 weeks)

**Status:** ⬜ Not started

**Goal:** A new user signs up with email + verifies via Postmark + reaches an empty home screen. An admin logs in at `/admin` with email + password + TOTP MFA + reaches an empty admin dashboard. Role-based route guards work.

**Features (PRD refs):**
- ⬜ F1 (amended) — **Email/password auth + email verification** (not phone OTP). Better Auth handles out-of-box.
- ⬜ F2 — Admin MFA (TOTP) + RBAC (`role` enum: end_user, admin, super_admin; super_admin manual bootstrap)
- ⬜ F3 — Session management + logout + inactivity timeout (admin 30min, user 7d background)

**Schema additions:** extend `user` table (role, mfa_enabled, is_business_contact); add `user_device` (for push registration later).

**Libs to add:**
- Better Auth `two-factor` plugin (TOTP)
- `qrcode` (for TOTP QR rendering in admin setup flow)

**Cron jobs:** none yet.

**Risk gate:** End-to-end signup → verify email → login → access role-gated route works on the deployed Replit URL (not just localhost).

**Decision deferred for client:** Sprint 1.5 — should phone OTP replace email/password, or live alongside as an alternative login method?

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

**Status:** ⬜ Not started

**Goal:** Admin creates a Business with full details (Google Places address, multi-category, ≤3 gallery images, verify tick, rating). End-user opens the matching category page and sees the listing card with tap-to-call, WhatsApp, social, More Info modal.

**Features (PRD refs):**
- ⬜ F7 — Listing page (cards, pagination ≥10/page, default sort A-Z — sponsored sort lands S4)
- ⬜ F8 — Scoped keyword search (in-category, contains/starts-with, case-insensitive)
- ⬜ F9 — Business Listing Card with quick actions (tel:, wa.me, social links, More info)
- ⬜ F10 — More Info modal (address, directions via place_id or formatted_address, email, phone, website, short description, ≤3 images carousel)
- ⬜ F11 — Verified badge + admin star rating (hide stars if 0/null)
- ⬜ F13 — Business CRUD (multi-category attach, soft delete/restore, gallery, status)
- ⬜ F25 (web half) — City-aware slugs + deep links (`/city/category/subcategory`)
- ⬜ F27 — Google Places Autocomplete (admin Business form)

**Schema additions:** `business`, `business_image`, `business_category` (join with unique constraint).

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
