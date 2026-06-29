# AIRA — Implementation Roadmap

**Last updated:** 2026-06-29 (`airabynisarga.com` registered + live; universal-link follow-ups shipped — AASA Content-Type pinned via next.config headers(), www → apex 301 redirect, CLAUDE.md apex-only convention, Android App Signing key SHA-256 pasted into assetlinks.json. Only S0 follow-up still open: EAS prod rebuild for both platforms.)
**Sources:** [docs/PRD.md](./docs/PRD.md) v1.0 MVP, planning session 2026-05-25, progress sync 2026-06-09, S3 close-out + F25 deferral 2026-06-13, F20 Community Board ship 2026-06-14, F17 configurable schedule + F20 v2 admin hardening 2026-06-14, S6 scope trim 2026-06-15 (AppSetting hub + F23 reframe to in-UI renewal queue), S6 in-flight 2026-06-15 (F22 + F23′ + feature image + requireAdminJSON cleanup), G1 owner reachability + community v2 + Post-on-AIRA rebrand + category drift fix shipped 2026-06-16 → 2026-06-21, listing contact-person + admin edit-categories subs + listing favorites shipped 2026-06-22, S0 EAS init shipped 2026-06-23, F21 push broadcasts shipped 2026-06-23, Expo SDK 54 downgrade shipped 2026-06-23.
**Companion docs:** [.mstack/design-system/DESIGN.md](./.mstack/design-system/DESIGN.md) · [TODOS.md](./TODOS.md) · [FORK_CHECKLIST.md](./FORK_CHECKLIST.md)

This is the living tracker. Update sprint statuses, check off features as they land, log decisions inline. Re-read it at the start of every sprint planning session.

## What's pending (as of 2026-06-29)

**Sprint 5 — ✅ Done (2026-06-23).** F14 + F17 + F20 + F20 v2 + F21 all shipped. S5 closed.

**Sprint 0 — almost done; two follow-ups outstanding:**
- ✅ Register `airabynisarga.com` domain — live and resolving to Replit deploy as of 2026-06-29
- ✅ EAS project init + Apple/Google bundle ID registration
- ✅ Apple Team ID → filled into `.well-known/apple-app-site-association` (`C529274M9Y`)
- ✅ AASA served with `Content-Type: application/json` via `apps/web/next.config.mjs` `headers()` rule (2026-06-29) — Apple swcd CDN already cached the file end-to-end
- ✅ `www.airabynisarga.com/*` → apex 301 redirect wired via `next.config.mjs` `redirects()` (dormant until DNS for www catches up; CLAUDE.md apex-only convention locked alongside)
- ✅ Android signing-cert SHA-256 filled into `.well-known/assetlinks.json` (2026-06-29; captured from Play Console App Signing)
- 🟦 EAS production rebuild for both platforms (after F21's `expo-notifications` config-plugin add). Required before push works on real devices; `eas build --profile production --platform all` + `eas submit --profile production --platform all`. Runbook: `docs/operations/eas-build-runbook.md`.

**Sprint 6 — ✅ Done:** F22, F23′, feature image, `requireAdminJSON` cleanup, mobile fonts, super_admin narrowing all shipped. F25 deep links moved to S7 (S0-gated).

**Sprint 7 — not started:** Playwright E2E pass, perf tuning, physical-device push + deep-link testing, store metadata, App Store + Play Store submissions. F21 receipt-polling follow-up plan (Q-E from review) also fits here.

**Post-S6 polish + ancillary scope shipped 2026-06-16 → 2026-06-22 (all off-roadmap, none blocking):** G1 business-owner reachability (owner FK + assign/unassign + admin column + broadcast + /account/listings), community v2 (author edit/delete + comments + /account/posts), "Post on AIRA" rebrand (sidebar + board copy + community page) including phone/email contact fields on posts, category drift fix (DB-driven everywhere, VALID_CATEGORIES const deleted), admin businesses renewal urgency caption + overdue row stripe, QA test accounts seed script, admin Edit Categories now shows level-2 subcategories, admin **Listing Contact Person** field (nullable text on businesses with split BusinessAdminSchema, audited diff), listing **Favorites** (new `business_favorite` table + 4 ops + heart on cards/detail/account page).

**Deferred to Phase 2:** F17 per-business-owner emails, business-owner self-service portals, Stripe self-serve subscriptions, masked call routing, multi-city UI. All blocked or premature for MVP.

The critical path to TestFlight is now cleared. **First AIRA iOS build is in TestFlight Internal Testing (App Store Connect App ID `6783242682`) + first Android build is in Play Console Internal Testing — both under the "AIRA by Nisarga" listing.** F21 push broadcasts is code-complete; an EAS production rebuild + submit gets the `expo-notifications` config plugin onto real devices and closes the loop for end-to-end push. `airabynisarga.com` is now live + verified end-to-end (Apple swcd cached AASA; assetlinks now carries the App Signing key SHA-256 so Android App Links autoVerify can succeed once verifier re-fetches). Next critical path: EAS production rebuild + S7 store submissions.

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

### ✅ S5 — F14 purge cron (2026-06-10)
Plan: `.mstack/plans/2026-06-10-f14-purge-soft-deleted.md`. `purge-soft-deleted` daily job (03:00 UTC) hard-deletes businesses archived more than 180 days ago, logging the affected count to `cron_run` via the standard envelope. Registered alongside the rest of the cron suite in `apps/web/src/lib/cron/registry.ts`.

### ✅ S5 — F17 configurable renewal schedule (2026-06-14)
Plan: `.mstack/plans/2026-06-14-renewal-schedule-config.md`. Closes the F17 amendment from the S5 mini-sprint: the renewal cron now reads `app_setting.reminder_schedule` (comma-separated days list, default `"7"`, seeded via migration `0022`), loops the configured windows, and sends one `"AIRA · Expiring in N days"` email per non-empty window. Admin edits the schedule at `/admin/settings/renewal-schedule` (gated behind the new `/admin/settings` hub). Audit log captures every schedule edit via a new `app_setting.updated` `AuditMeta` variant. QA: 8/8 Playwright scenarios pass (`.mstack/qa/2026-06-14-0612/`). Per-business-owner emails remain Phase 2 — blocked on the business owner identity model (no `owner_email` / `owner_user_id` exists today).

### ✅ S5 — F20 Community Requests Board (2026-06-14) — **end-to-end shipped**
Plan: `.mstack/plans/2026-06-13-community-requests-board.md`. Review locked Option B (posts + private "I can help" intent signal) over PRD-spec posts-only. v2 editorial-cards mockup picked from `.mstack/mockups/community-requests-board/`. Implementation ledger at `.mstack/code/2026-06-13-community-requests-board/` (14 commits, atomic per task).

- Two tables shipped via migration `0021` — `community_post` (id, user_id, title, body, status enum, expires_at, rejected_reason, interest_count, approved_at, created_at) and `post_interest` (unique per post_id × user_id) — plus `posts_expiry_days = 30` seeded into `app_setting`
- `NotificationBody` discriminated union extended with a `post_interest` variant; both the web `notification-item.tsx` and mobile `notifications.tsx` renderers updated to cover the new kind
- 8 REST endpoints under `/api/v1/community/*` and `/api/v1/admin/community/*` via `defineOperation`; auth model matches existing patterns (sidebar-gated web, bearer-gated mobile)
- Service-layer authz: 1-active-post-per-user limit, self-interest blocked, author-only respondent list (`listInterests` 403 otherwise)
- `expire-posts` hourly cron registered in `registry.ts` and surfaced on `/admin/cron` (caught + fixed in QA as a follow-on missed `KNOWN_JOBS` entry)
- UI: editorial card stack on `/community` (search + paginated 10/page), Dialog "Ask the community" form, gradient "I can help" toggle, author-only respondent card on detail page, admin moderation queue at `/admin/community` with inline Approve/Reject + reason
- Nav: Community entry added to `(app)` sidebar (above categories) and to admin sidebar's `ADMIN_NAV`; bottom-tab-bar untouched (locked at 3 tabs per V4 mockup)
- QA: 11/11 Playwright scenarios pass (`.mstack/qa/2026-06-14-0507/`). Two issues found and fixed: (1) `expire-posts` missing from admin cron page's `KNOWN_JOBS` array (same drift as F17 caught earlier — re-recorded in learnings); (2) stale duplicate "X have offered to help" paragraph on the non-author detail-page branch removed because `InterestButton` already renders the same count and the page-level paragraph went stale until next navigation.

### ✅ S5 — F20 v2 admin moderation hardening (2026-06-14)
Plan: `.mstack/plans/2026-06-14-community-admin-v2.md`. Polish layer on top of F20 v1 — adds the moderation lifecycle that v1 deferred:

- **All-status filter chips** (All / Pending / Approved / Expired / Rejected) with count badges from a single grouped COUNT query (`status_counts` on `adminListPostsOp` output). Default landing: All.
- **Admin can edit, delete, and see respondents** for any post regardless of status. Edit fix typos without changing status; hard delete cascades through `post_interest` with a transactional snapshot audit (snapshot → audit → delete in one `db.transaction` since the row is unreadable after delete). Two new `AuditMeta` variants (`community.post_deleted`, `community.post_edited`).
- **Admin-only respondent endpoint** at `/api/v1/admin/community/posts/[id]/interests` — bypasses the author-only guard the public route enforces. Admin permission is the ACL.
- **Table-style queue** matching the `/admin/businesses` pattern: columns User / Request / Status / Helpers / Created / Actions. Row click opens a popup `PostDetailModal` carrying the full body, respondent list, and an inline Approve/Reject flow (no nested dialogs). Edit + Delete are icon buttons on the row itself that stop propagation so they don't fire the row click.
- **Confirmation dialogs on every state-change action** — Approve confirms inline in the modal, Reject keeps its reason-prompt flow (which is itself a confirmation), Delete keeps its base-ui `AlertDialog`.
- QA: 10/10 Playwright scenarios pass (`.mstack/qa/2026-06-14-0732/`).
- Companion polish on the **user-facing** `/community` feed shipped the same day: post cards now match the listing-card density (`p-4`, single-line title + body, compact status pill + InterestButton), the hero adopts the home page's chromeless `text-center` section pattern, and clicking a card opens a `PostDetailModal` in place rather than navigating to `/community/[id]` (the detail page still exists for notification deep-links via `PostCardReadOnly`).

### ✅ S6 — F23′ renewal follow-up queue (2026-06-15)
Plan + review: `.mstack/plans/2026-06-15-renewal-followup-queue.md`. In-UI replacement for the PRD's BusinessSubscriptions CSV download. `subscription_followup` table (migration `0023`, 6-value `followup_outcome` pgEnum). Derived queue view (`listQueue` service using correlated subqueries — Drizzle has no LATERAL JOIN). WindowChips (7/14/30/60/90d window filter). `RenewalQueueTable` client component with row-click → `FollowupModal`; modal lazy-fetches history, 6-outcome `OutcomeRadioGroup`, note textarea, `Save outcome` button. Hybrid drop semantics: `refused` drops permanently from queue, `called` auto-sets `scheduled_next = now+7d` (drops temporarily), `voicemail`/`no_answer` stay in queue with Last-attempt annotation. Sidebar "Renewals" entry added between Businesses and Categories. QA 17/17 Playwright scenarios pass — 15 base + S14 (refused drops) + S15 (called auto-7d with DB assertion) — 1 medium issue found and fixed (initial prose/table semantics ambiguity resolved as hybrid Option C per user choice).

### ✅ S6 — F22 audit log UI — minimal scope (2026-06-15)
Plan + review: `.mstack/plans/2026-06-15-audit-log-ui.md`. Four tasks shipped atomically (commits `7600c3d` → `d2723e8`). `AuditMeta` union + `KNOWN_AUDIT_ACTIONS` (24 items) + `KNOWN_AUDIT_TARGET_TYPES` (7 items) moved from `@aira/db/audit` (server-only) to `@aira/validators/audit-meta` (isomorphic) so client components can import without touching `server-only`. Bidirectional compile-time assertion keeps the union and runtime array in sync. `listAudit` service extended with actor/target_type/action filters + two LEFT JOINs (`businessSubscriptions`, `sponsorships`) to resolve `target_business_id`. `RenderAuditDetail` 24-case switch (nested on `reason` for `session.revoked` and `user.signed_in_failed`; outer `never` default as exhaustiveness gate). `RenderAuditTarget` per-type link resolver. `AuditTable` wired with stable UTC formatter + `suppressHydrationWarning`. `FilterBar` + `ActorTypeahead` (300ms debounce, `pressSequentially` required in Playwright — `fill()` misses React onChange on controlled search inputs). QA 9/9 (`.mstack/qa/2026-06-15-1215/`). CSV export, ip_address column, full-text metadata search, retention cron remain explicitly deferred.

### ✅ S6 — Feature image (F13 extension, 2026-06-15)
Plan: `.mstack/plans/2026-06-15-feature-image.md`. `FeatureImageSection` admin drag-and-drop component modelled on `GallerySection` — shows current `image_url` preview + Remove button, or a drop target when null. `processAndStoreFeatureImage` pipeline function (1200×630 JPEG, replaces `image_url` on `businesses` row; best-effort deletes old storage object before writing new). `POST /api/v1/admin/businesses/[id]/feature-image` + `DELETE`. Two service functions: `setBusinessFeatureImage` + `clearBusinessFeatureImage`. Public listing detail: avatar circle `<div>` removed from identity row (`business-detail.tsx`) — category label text still shows; hero `<img>` was already full-width. No migration required (`image_url text` already existed on `businesses`).

### ✅ Post-S6 — G1 Business owner reachability (2026-06-16)
Plan + review: `.mstack/plans/2026-06-17-business-owner-reachability.md`. Solves the
identity blocker that previously gated F17 per-business-owner emails AND F21
audience targeting. Twelve atomic commits, layered bottom-up:

- **Schema (`c047c0e`):** `businesses.owner_user_id` nullable FK to `user.id`
  with `ON DELETE SET NULL` (anonymise-in-place cleanly detaches). Partial
  index on the linked subset so the my-listings query, the "Has owner" admin
  filter, and broadcast targeting stay fast as null-owned rows dominate.
- **Audit + notifications:** three new `AuditMeta` kinds
  (`business.owner_assigned`, `business.owner_unassigned`,
  `business.broadcast_sent`) and a `business_broadcast` notification body
  variant — `NotificationBody.kind` union widened with sibling renderer
  updates on both web + mobile per the F20 lesson.
- **Validators + services (`fdfab6c` → `10d9317` → `e70ad6d`):** `BusinessOwner`
  schema (denormalised user projection for admin surfaces),
  `getBusinessOwner`, `getBusinessesOwnedBy`, `getBusinessOwnerLookup` (batch
  Map for admin list page),
  `assignBusinessOwner`/`unassignBusinessOwner` (audit BEFORE mutation,
  in-app notification AFTER), `sendBusinessOwnerBroadcast` (fan-out
  to all distinct owner user ids with one notification each).
- **Ops + REST endpoints (`d68d187`):** `assignBusinessOwnerOp` (auditor +
  best-effort email post-commit), `unassignBusinessOwnerOp`, `listMyBusinessesOp`,
  `sendBusinessOwnerBroadcastOp`. Routes under `/api/v1/admin/businesses/[id]/owner`,
  `/api/v1/admin/businesses/broadcast`, `/api/v1/businesses/mine`.
- **Sidebar UX side-quest (`89571a2`):** subcategories surfaced under their
  parent in the `(app)` sidebar — uses `listCategoriesTreeOp` (returns roots +
  children together).
- **Admin UI (`f5f5dd9` → `f9a0ee1`):** `BusinessOwnerSection` card on
  business detail (picker + assign + unassign + audit indicator); Owner column
  + `OwnerFilter` (`has`/`none`/all) on the `/admin/businesses` table;
  "Notify all owners" broadcast modal launched from the businesses list
  toolbar (subject + message + filter to "all linked owners" with count
  preview).
- **End-user surface (`43eb6c9`):** new `/account/listings` page (RSC,
  requireUser, `apiServerFetch(listMyBusinessesOp)`, EmptyState fallback,
  `MyListingsCard` rows linking to public detail for active rows + an
  unlinked Archived label for soft-deleted ones). New menu entry in
  `ACCOUNT_ITEMS`. README updates.
- **QA (`a0e136b`):** Playwright run validated the full assign → notify →
  /account/listings → unassign → audit-log path on both web + mobile RSCs.

Two follow-on stability fixes after the QA pass: `2e31ec3` dropped a stray
trailing chevron from flat nav rows in the sidebar, `b133768` moved a picker
state-clear out of an effect body (React-hooks lint flagged a cascading-
render risk).

### ✅ Post-S6 — Operation logging hardening (2026-06-16, `353bcb7`)
`defineOperation`'s "unhandled" error path now logs `err.stack` AND
`err.cause.message` alongside the message. Surfaced the actual stack trace
on the production red-card error during a G1 troubleshoot; previous log
emitted only `String(err)` which truncated wrapped errors. Companion
`recent-errors.ts` diagnostic script under `packages/db/scripts/` for fast
incident triage (`576be51`).

### ✅ Post-S6 — Featured tile widening (2026-06-16, `369c947`)
`getFeaturedBusinesses` was hard-gated to `tier IN ('tier1','tier2')`, which
hid the `/home` Featured section whenever no premium customer existed —
made the page feel empty. Eligibility widened to "any active business with
an active-paid subscription" while keeping the premium-first intent via
`TIER_ORDER` in the sort key. The Featured section now hydrates with paid
tier3 listings until premium customers show up.

### ✅ Post-S6 — QA test accounts seed (2026-06-17, `8a9d8a2`)
One-time `seed-qa-accounts.ts` script under `packages/db/scripts/` for
spinning up deterministic admin / end-user / business-owner fixtures
against a fresh DB branch. Idempotent (uses fixed UUIDs); intended for
Playwright + manual QA.

### ✅ Post-S6 — Community v2: author controls + comments + Post on AIRA rebrand (2026-06-17 → 2026-06-19)
Two adjacent plans landed back-to-back:

**Author controls + comments** (plan: `.mstack/plans/2026-06-17-community-author-controls-and-comments.md`):
post authors can now edit / delete their own pending or approved posts;
approved-row edits revert status to pending via a new
`community.post_reverted_to_pending` audit kind (`b770791`). New
`/account/posts` page (`83e8b14`) lists author's own posts across statuses.
Comments shipped (`6bcf6ce`): top-level `<CommentThread>` + `<CommentComposer>`
on the standalone detail page, with a 1-level reply cap enforced
server-side. Admin moderation strip (`10862c3`) for hide / restore / delete
on the comment level. Author-side service entries
(`listMyPosts` / `editMyPost` / `deleteMyPost`) at `b30e153`. Several
post-ship polish commits tightened the visual: `54b8a59` aligned textareas,
`f88048b` dropped a card-on-card around the comment thread, `093af63`
pinned the composer to the top of the thread, `6851a22` swapped the
delete button to icon-only + inline confirm.

**Post on AIRA rebrand** (plan: `.mstack/plans/2026-06-17-post-on-aira-rebrand.md`):
the "I'm interested" intent signal was retired (`b19ca47`) in favour of the
new comment thread as the canonical engagement loop. Two phone + email
contact fields added to `community_post` (migration `0028` via `7aaa6bb`)
so a poster can show how they want to be reached without giving away their
inbox by default. Admin can edit phone/email; the
`community.post_edited` audit kind expanded its `fields` discriminator to
cover all four (`f91e761`). UI sweep renamed "Community Requests" →
"Post on AIRA" across the board / sidebar entry / standalone detail / admin
queue (`5370192` → `4d931aa`). The card CTA changed from "I'm interested"
to "Comment" (`33b6fad`). Implementation report at `370570d`.

### ✅ Post-S6 — Category drift fix (2026-06-16, plan + ship)
Plan + review: `.mstack/plans/2026-06-16-category-drift-fix.md`. The hardcoded
`VALID_CATEGORIES` const in `@aira/validators/businesses` had drifted from
the DB `category` table (admin could create a slug that immediately failed
listing-page validation). Two-part fix:

- `BusinessCategorySchema` widened to `z.string().min(1)` (`5990b00`), with
  `BusinessCreateForm` and the listing's category switcher both reading
  from the DB (`78e5345`). The `category` table's slug uniqueness +
  a new slug-rename guard on `updateCategoryOp` (`136df87`) keep the
  contract enforced.
- Migration `0027` (`5016c0c`) hard-renames any orphaned `businesses.category`
  string to the closest DB slug, with corrective snapshot-chain pointers
  applied in `4c63f22` after a mid-flight collision (Drizzle's snapshot
  format detected the cleanup as a column-rename and overwrote 0026's
  metadata; fix was manual chain stitching). Companion sweep at `a647300`
  added a defensive `getCategoryMeta(slug)` helper across 9 consumers so
  unknown slugs fall back to a generic icon instead of crashing.

### ✅ Post-S6 — Admin businesses renewal urgency pill (2026-06-16)
Plan: `.mstack/plans/2026-06-16-admin-businesses-renewal-urgency-pill.md`. On the
`/admin/businesses` list, the Subscription cell now carries a small caption
under the payment-status pill showing days-remaining or days-overdue against
the latest subscription's `end_date`. Critical (≤3d) renders in destructive
foreground; overdue rows get a 3px left stripe + tinted hover. Shared
`expiryLabel` helper extracted with Vitest unit (`f1d30c7`).
Companion narrow-viewport fix at `41285d3` (table → horizontal scroll
container, caught in QA).

### ✅ Post-S6 — Admin polish cluster (2026-06-17 → 2026-06-21)
A series of small polish commits that didn't earn their own plan docs:

- `bf0f487` Places autocomplete crash fix + initial-value handling on the
  admin Business form.
- `aa246eb` "Mark business verified" inline action wired into the
  AIRA Review admin section.
- `0cdf87e` Category parent edit + surface real server error (was being
  swallowed by a generic ApiError fallthrough).
- `2884295` Playwright URL-only assertion gotcha appended to learnings.
- `49ca4e5` Whole-row click on `/admin/users` table (matches the
  businesses/community/renewals row-click convention).
- `85db7f6` Hide Send-a-notification card on user detail (not used).
- `035a484` Collapse Role/Ban/Reset into an Account-actions card with
  confirm modals.

### ✅ 2026-06-22 polish cluster (one-day session)
A single-session sweep of brand + copy + UI tweaks driven by client
feedback, all sub-plan-sized:

- Marketing footer + sidebar Contact Us website link → `nisargacorp.com`
  (away from the canonical `airabynisarga.com` brand URL).
- Founding Launch Offer modal — sub-titles ("AIRA Verified Badge",
  membership plan names, sponsorship tier headings) all flipped to bold
  italic to match the section heads.
- `/home` brand hierarchy polish: logo bumped to 140px desktop; AIRA
  wordmark renders with a vertical gold gradient via `bg-clip-text`;
  ROOTS · REACH tagline darkened to `text-foreground` and bumped a size.
- Businesses Listed stat card now renders `N+` instead of `N` so the
  number reads as a floor rather than a literal count.
- Blue verified tick bumped in size on both `BusinessCard` (`size-4 → size-5`)
  and the detail page (`size-5 md:size-6 → size-6 md:size-7`).
- Sidebar "Community" menu row → "Post on AIRA" (matches the board
  rebrand).
- `/community` page copy: H1 changed to "Post on AIRA" and the
  description rewritten to "Post a request for something you need —
  services, recommendations, items, or local help."
- Social-icon order on cards + detail: Website (Globe) moved between
  WhatsApp and Phone so contact channels read in a clearer order.
- Listing card "More Info" pill — dropped the arrow suffix.
- "AIRA Stars" label inserted before the rating pill on both cards and
  the detail page.

### ✅ Post-S6 — Admin: Manage listings rename + owner card reorder (2026-06-22)
Admin sidebar nav row, dashboard tile, and page header all renamed
"Businesses" → "Manage listings" (`/admin/businesses` route unchanged).
`BusinessOwnerSection` initially hidden during the contact-person ship
then restored and reordered to sit AFTER `CoreFieldsSection` so the
first card a user lands on is the editable identity surface.

### ✅ Post-S6 — Listing Contact Person field (2026-06-22)
Plan + review + report under `.mstack/plans/2026-06-22-listing-contact-person.md`,
`.mstack/reviews/...`, `.mstack/code/2026-06-22-listing-contact-person/`.
Admin-only free-text "Contact person" field on every business listing —
the lighter-weight replacement for the linked-user owner card (which
remains, but is now ancillary to this field for ops day-to-day). Ten
atomic commits across:

- New nullable `contact_person` text column on `businesses` (migration
  `0031`).
- **Schema split:** new `BusinessAdminSchema` extends the public
  `BusinessSchema` with `contact_person`; admin output shapes
  (`AdminBusinessItemSchema`, `BusinessAdminDetailOutputSchema`,
  `BusinessUpdateOutputSchema`) all switch to the admin shape. Public ops
  continue to project plain `BusinessSchema` — defense-in-depth so the
  PII never reaches an unauthenticated payload.
- **Service-layer fork:** new `toBusinessAdmin` + `attachRelationsAdmin`
  helpers project `contact_person` only on admin-only paths
  (`getBusinessByIdIncludingArchived`, `getAllBusinesses`,
  `createBusiness`). Public mappers untouched.
- **Audit:** new `business.contact_person_changed` `AuditMeta` kind with
  `{ from, to }` payload. Emitted only on a real diff. `updateBusiness`
  signature widened to `(db, ctx, id, data)` to carry the caller
  context — matches `archiveBusiness` / `restoreBusiness`.
- **UI:** input row in the Add Business modal between Name and Category;
  preview row in `CoreFieldsPreview` + edit input in `CoreFieldsEditModal`;
  new column on the `/admin/businesses` list table between Owner and
  Verified (truncates at 150px).

### ✅ Post-S6 — Admin Edit Categories shows subcategories (2026-06-22)
Plan + review under `.mstack/plans/2026-06-22-admin-edit-categories-subs.md`.
Two-line bug fix: `listCategoriesOp` (roots-only) was feeding the admin
Edit Categories modal, so level-2 subs could never be selected as Primary
or Additional. Swapped the admin business detail page to
`listCategoriesTreeOp` and pipe a new `categoryTree` prop alongside the
existing flat list. The modal now renders root → `<optgroup label>` of
children in the Primary dropdown, and indented `pl-6` rows with a "↳ "
prefix in the Additional checkbox grid. Active-only filter applied at the
page boundary; inactive branches drop wholesale.

### ✅ Post-S6 — EAS project init + first signed builds + .well-known propagation (2026-06-23) — **S0 critical path cleared**
Plan + review + report under `.mstack/plans/2026-06-22-eas-project-init.md`,
`.mstack/reviews/...`, `.mstack/code/2026-06-22-eas-project-init/`. The
S0 EAS gate that had been carrying four open items for weeks closed
in one ~6-hour session. End-to-end:

- **EAS project bound** to the `million-labs` Expo org as
  `@million-labs/aira-mobile` (projectId
  `21065081-2afd-43d4-aef7-7ce10de55a8b`). EAS Update channels +
  `runtimeVersion: { policy: "appVersion" }` wired so OTAs flow per
  marketing version.
- **Apple credentials**: distribution certificate +
  provisioning profile + APNs Push Key (.p8) all set up under
  Nisarga Group LLC team (`C529274M9Y`). App Store Connect API key
  uploaded to EAS for future submissions. Push Key in place means F21
  push broadcasts is now purely code work.
- **Android credentials**: upload keystore generated by EAS; backed up
  to 1Password per `docs/operations/eas-keystore-backup.md`. Google
  Play Android Developer API enabled in the Cloud project; dedicated
  `aira-play-publisher` service account created with Internal-Testing
  release permissions; service-account JSON key backed up to
  1Password.
- **First signed production builds**: iOS IPA + Android AAB both
  successfully built on EAS cloud runners after a debugging marathon
  that surfaced six Replit/pnpm-monorepo + EAS-cloud-runner
  interactions worth recording for the runbook:
  1. `eas.json` `autoIncrement` is a boolean at the profile level
     (NOT the string `"buildNumber"` — that's per-platform only).
  2. `eas init` non-fatal error on dynamic configs (the project IS
     created on Expo's side; we manually paste the suggested
     `extra.eas.projectId` block).
  3. EACCES rmdir on `/tmp/runner/eas-cli-nodejs/.../`
     `React Native DevTools-linux-x64` — dotslash unpacks with 555
     perms and Replit sandbox blocks cleanup. Fix: nuke `.cache/` at
     source + `DOTSLASH_CACHE=$HOME/.dotslash-cache` env override.
  4. `Unknown system error -122` copying `.local/share/pnpm/store/`
     (Replit puts the pnpm store inside the workspace). Fix:
     workspace-root `.easignore` listing every Replit-clutter path.
  5. iOS "Install dependencies" + Android "Prebuild" failed because
     workspace `.easignore` excluded `tooling/` (which `packages/*`
     depend on for `@aira/tsconfig`) and `.npmrc` (which carries
     `node-linker=hoisted` that Metro requires).
  6. `sharp@0.34.5` in `apps/web` couldn't build on EAS's iOS runner;
     fix: moved to `optionalDependencies` so install warnings don't
     abort.
  7. `whatwg-fetch` peer-dep not found by Metro — added explicit
     direct dep on `apps/mobile` and copied `.npmrc` to project root
     so pnpm sees the hoist config regardless of cwd.
- **App Store Connect record created** as "AIRA by Nisarga" (App ID
  `6783242682`) because "AIRA" was already taken. Locked decision:
  launcher icon stays "AIRA" (`app.config.ts`) for short brand-forward
  read; App Store storefront is "AIRA by Nisarga" for the
  parent-entity disambiguation. Same divergence as the
  in-app `${brand.name} by ${brand.parentName}` footer.
- **Play Console record created** under "AIRA by Nisarga" + Internal
  Testing track configured.
- **First submissions live**: iOS IPA submitted via `eas submit` to
  App Store Connect → processing into TestFlight. Android AAB
  submitted via `eas submit` to Play Console Internal Testing track.
  Both required some flow-specific debugging (Internal-distribution
  iOS preview kept asking for device UDIDs — pivoted to production
  profile to skip that loop; Google Play Android Developer API
  needed manual enablement in Cloud project before fastlane could
  publish).
- **Apple Team ID substituted** into both sites in
  `apple-app-site-association` (committed `ade001d`). The
  Android `assetlinks.json` SHA-256 substitution stays deferred until
  Play Console App Signing fingerprint is captured from the live
  Internal Testing release.
- **Two new runbook docs** at `docs/operations/eas-build-runbook.md`
  and `docs/operations/eas-keystore-backup.md` capturing the CLI
  invocations + every failure mode hit during the session, so the
  next person spends seconds not hours.

The work surfaced a meaningful learning catalogue: 8 entries added to
`.mstack/learnings.jsonl` covering the various Replit + EAS + pnpm
interactions. Net commits on this S0 ship: 12 implementation commits
plus the plan/review/report docs.

### ✅ S5 — F21 push broadcasts (2026-06-23) — **closes Sprint 5**
Plan + review at `.mstack/plans/2026-06-23-f21-push-broadcasts.md` /
`.mstack/reviews/...` / `.mstack/code/2026-06-23-f21-push-broadcasts/`.
The last open S5 feature. Layered Expo Push delivery on top of the
existing G1 in-app fan-out so the audit + bell-icon path stays
bulletproof even when the Expo Push Service is unreachable.

- **Schema (migration 0033)**: `user_device` (one row per registered
  Expo Push Token per user, unique on `(user_id, expo_push_token)`)
  + `notification_delivery` (per-device push attempt log;
  `status: text` with Zod-validated values, ticket_id for ok rows,
  error_code for rejected rows). Cascade on every FK so user
  anonymization sweeps both tables clean.
- **Service layer**: `resolveTargetUserIds` extracted from the
  existing `sendBusinessOwnerBroadcast` so all four audience
  branches (all_linked_owners, by_city, by_categories, by_businesses)
  share one active-only SELECT. New `sendPushBroadcast` orchestrator
  composes audit + in-app + push: chunks via `expo-server-sdk`'s
  `chunkPushNotifications` (≤100 per request), sends under a 60s
  `AbortController` with partial-success counting, inserts one
  `notification_delivery` row per ticket, and deletes
  DeviceNotRegistered devices OUTSIDE the broadcast transaction
  (best-effort, idempotent — F21 review decision 9).
- **API surface**: POST + DELETE
  `/api/v1/profile/push-token` for mobile registration (kept under
  the existing `/profile/*` namespace, not a sibling `/me/*` —
  review decision 1). The broadcast op
  (`/api/v1/admin/businesses/broadcast`) now routes through
  `sendPushBroadcast` + accepts the new `target` field; default
  stays `{ kind: "all_linked_owners" }` so the existing one-click
  flow is binary-compatible. New
  `previewBroadcastRecipientCountOp` backs the live audience
  count in the admin modal.
- **Env**: `EXPO_ACCESS_TOKEN` declared optional in
  `apps/web/src/config/env.ts`; the app boots without it, push
  fan-out throws a clear error at send-time when devices exist
  but no token is set.
- **Admin UI**: broadcast modal extended with the four-radio
  audience picker (city dropdown / category checkbox list /
  business checkbox list reveal on demand), 400ms-debounced
  live count below the picker driven by the new preview op,
  Send disabled when count is 0, sent step shows
  `devices_completed / devices_attempted` plus an "in flight"
  callout when 60s cap fired with pending tickets.
- **Mobile**: `expo-notifications` added (`~0.32.13`) + registered as
  config plugin in `app.config.ts`. `lib/push.ts`'s
  `requestPermissionAndRegister` covers the full
  permission-check → token-fetch → POST flow. Pre-prompt modal
  ("Stay in the loop") fires once after first sign-in via a
  layout gate on `push.registrationCompleted` +
  `push.prePromptDismissed` secure-store flags. Account-hub now
  has an always-visible "Enable notifications" row that
  re-triggers the same flow for the OS-blocked / change-of-mind
  paths.
- **Locked decisions (10)**: route under `/profile/*`; 60s
  AbortController cap with partial-success reporting;
  `expo-server-sdk` in `packages/services`; active-only audience
  filter; push `data` carries full NotificationBody; receipt-polling
  follow-up plan written as part of this report (not a code TODO);
  no v1 preview-push button; no explicit re-prompt UI on mobile;
  cleanup outside broadcast txn; `notification_delivery.status`
  stays `text` with Zod validation.

**Deviation from the review's literal SQL hint:** the `by_categories`
branch joins through the `business_category` N:M table (from the
recent admin Edit Categories work) rather than the legacy
`businesses.category` text column the review T4 sample SQL
suggested. The audience picker draws from `listCategoriesTreeOp`
which returns `categories.id` values; the join through
`business_category` is the only path that matches those IDs.

**Operational follow-up (deferred to a small follow-up plan, NOT a
TODO comment):** receipt polling at ~15-min intervals to upgrade
`notification_delivery.status` from `pending` → `ok` once Expo
confirms actual delivery. Decision locked in the F21 review under
Q-E.

**EAS rebuild required.** Adding `expo-notifications` to
`app.config.ts.plugins[]` is a native-code change. After this commit,
fire `eas build --profile production --platform all` followed by
`eas submit --profile production --platform all` (`docs/operations/eas-build-runbook.md`)
to get push working on real devices. Existing TestFlight + Play
Internal Testing builds won't receive push without the rebuild.

Net commits: 18 implementation commits (T1–T17 + the precursor
plan/review/EAS-init-code-artifacts bundle).

### ✅ Post-S6 — Expo SDK 55 → 54 downgrade (2026-06-23)
Plan + review under `.mstack/plans/2026-06-23-expo-sdk-54-downgrade.md`
and the matching review. The S0 init pinned SDK 55; loading the dev
server via Expo Go errored with "incompatible version" because the
publicly-shipped Expo Go bundles SDK 54 right now. The scan-the-QR
iteration loop is the team's preferred mode (locked as a feedback
memory at
`.claude/projects/-home-runner-workspace/memory/feedback_expo_sdk_for_iteration.md`),
so the call was to downgrade rather than build a custom Dev Client.

What changed:

- `apps/mobile/package.json` — every Expo-curated peer rewritten by
  `npx expo install --fix` against the SDK 54 base.
  `expo@~54.0.0`, `expo-router@~6.0.24`,
  `@expo/metro-runtime@~6.1.2`, `react@19.1.0`,
  `react-native@0.81.5`, etc. The explicit `react-native-worklets`
  pin was dropped; reanimated 4.1.7's peer range (0.5–0.8) is
  satisfied by the existing 0.7.4 hoist so no re-pin needed.
- `expo-notifications` resolution is now correctly version-aligned
  with SDK 54 (`~0.32.x` is what SDK 54 ships per
  `bundledNativeModules.json`). The F21 T12 mistake — manually
  pinning `~0.32.13` when SDK 55 actually wanted `~55.0.22` — is
  locked-in as a never-hand-pick rule in the runbook + decision
  log.
- Workspace types unification: `@base-ui/react` in web hard-pins
  to `@types/react@^19.2`, conflicting with mobile's tightened
  `~19.1.17`. Fixed via root `pnpm.overrides` forcing
  `@types/react@~19.1.17` + `@types/react-dom@~19.1.11`
  workspace-wide. Web's own pins were tightened to match.
- `app.config.ts` left byte-identical — every SDK-sensitive field
  (`runtimeVersion`, `plugins[]` shapes, `infoPlist`,
  `intentFilters`, `extra.eas.projectId`) has stable syntax across
  both majors.
- Marketing `version` stayed `0.1.0` — no real-device users yet,
  so the OTA-cohort split isn't worth a bump (locked Q1 in
  pre-review consultation).
- `whatwg-fetch` direct dep + `.npmrc` `node-linker=hoisted`
  workarounds untouched — they're a pnpm-isolated-store quirk,
  not a SDK-version quirk (locked Q2).

**EAS rebuild required (same one F21 already needed).** The
`apps/mobile/` native runtime is now SDK 54; existing TestFlight +
Play Internal Testing builds are SDK 55-pinned and become orphaned
once the next production build ships. No real-device user impact —
no testers on the SDK 55 builds yet.

Net commits: 5 implementation commits (T1, T2, T4–T6; T3 was a
no-op verify) + the precursor plan/review bundle.

### ✅ Post-S6 — Listing Favorites (2026-06-22) — **net-new feature**
Plan + review + report under `.mstack/plans/2026-06-22-listing-favorites.md`,
`.mstack/reviews/...`, `.mstack/code/2026-06-22-listing-favorites/`.
Signed-in users can save businesses to a personal favorites list and
revisit them from `/account/favorites`. Eleven atomic commits across:

- **New `business_favorite` join table** (`(business_id, user_id)` with
  cascade on both FKs, unique index for `ON CONFLICT DO NOTHING`
  idempotency, secondary `(user_id, created_at)` index for the
  most-recent-first sort). Migration `0032`.
- **Four ops** (`addFavoriteOp`, `removeFavoriteOp`, `listMyFavoritesOp`,
  `listMyFavoriteIdsOp`). Both mutations fully idempotent — silent on
  duplicates, no audit (decision locked at review: favorites are personal
  preferences with no second party who needs the trail).
- **Two read shapes by design:** `listMyFavoritesOp` returns hydrated
  `Business[]` for `/account/favorites`; `listMyFavoriteIdsOp` returns a
  slim `string[]` that listing pages call in parallel to decorate cards
  with their fav state. The public listings ops stay user-agnostic and
  cacheable; per-user state rides on a separate request.
- **`FavoriteButton` client island** with optimistic UI — single-click
  toggle (NOT the user-requested double-click, locked at plan after
  surfacing the a11y + mobile-tap concerns), failure reverts state +
  shows a small red-dot indicator (no toast, no notification bell).
  Hidden entirely when `!isSignedIn`.
- **Wired into both card + detail page** (small heart on the right-column
  stack above the Tier pill; large heart in the detail header next to the
  BadgeCheck).
- **`/account/favorites` page** mirroring `/account/listings` layout +
  EmptyState fallback with a "Browse the directory" CTA.
- **My favorites menu row** added to `ACCOUNT_ITEMS` between
  My listings and Notifications.
- **Page-level wiring:** `/home`, `/directory`, `/listings/[category]`,
  and the business detail page each fetch the session once and
  parallel-fetch `listMyFavoriteIdsOp` when signed-in (skip when
  anonymous) — passed through `ListingView` / `DirectoryView` /
  `TierSection` into each `BusinessCard`.

One bug shipped to prod and was fixed within minutes (`1162b33`): the
FavoriteButton was calling `apiClient.post(path, { body: {...} })` but
the client's signature is `post(path, body, init?)` — the wrapping
`{ body: ... }` was JSON-stringified as the literal request body and
the strict Zod schema rejected the unknown `body` key with 400. Fix
unwrapped the body to a single positional arg. Learning logged.

### ✅ S6 — `requireAdminJSON` auth cleanup (2026-06-15)
Six raw route handlers (gallery image upload POST, gallery image DELETE, subscription evidence POST, feature-image POST + DELETE, renewals CSV GET, cron GET) each inlined the same 3-step admin auth block (`getSessionFromHeaders` → role check → `adminSessionIsStale`). Extracted to `requireAdminJSON(req: Request): Promise<AuthSession["user"] | Response>` in `lib/auth/server.ts`, mirroring the existing `requireUserJSON()` pattern. Each route collapsed to two lines. No behaviour change — same checks, same responses. Commit `d009ea1`.

### ✅ Post-S6 — Universal-link follow-ups (2026-06-29)
Plan + review at `.mstack/plans/2026-06-29-universal-link-followups.md` /
`.mstack/reviews/2026-06-29-universal-link-followups.md`. Bundled S0/S7
plumbing cleanup landing after the `airabynisarga.com` domain went live
and Apple swcd cached the AASA end-to-end. Four atomic commits:

- **AASA Content-Type via `next.config.mjs` `headers()`** — Replit's
  static-file layer was serving the extensionless apple-app-site-association
  as `application/octet-stream` and bypassing the route handler at
  `apps/web/src/app/.well-known/[file]/route.ts` that was designed for the
  fix. Pinning via `headers()` for `/.well-known/:path*` keeps the file
  served from `/public` (smallest diff) while overriding the MIME +
  5-min cache for both AASA and assetlinks.json. Dead route handler + its
  integration test deleted.
- **`www.airabynisarga.com/*` → apex 301 via `next.config.mjs`
  `redirects()`** — `www` currently resolves to a third-party parking host
  (`airabynisarga-com.l.ink`), so the rule ships as dormant code that
  activates the moment DNS for `www` points at our origin. Pairs with the
  CLAUDE.md guard.
- **CLAUDE.md apex-only convention** — new "Conventions" bullet locking
  every outbound URL to `brand.url` (apex). Imports of the host string
  must come from `@aira/config`. Codebase was already clean at audit
  time (verified by grep across `packages/email/src`,
  `packages/config/src`, `apps/web/src`, `apps/mobile/`); the rule is
  preventive.
- **Roadmap S0 status flip** — this entry + the "What's pending" header
  flip from ⬜ to ✅ for the items shipped.

**Carved out of this run:** the Android SHA-256 paste into
`assetlinks.json` — depends on capturing the App Signing key fingerprint
from Play Console, ships as a one-line human follow-up commit when the
fingerprint is in hand. AASA `paths` widening for F25 deep-link surfaces
stays narrow today (`/verify*`, `/reset-password*` only) and ships
together with F25's mobile-side route handlers + EAS rebuild.

**Verification:** Apple swcd CDN at
`https://app-site-association.cdn-apple.com/a/v1/airabynisarga.com`
returns the populated AASA pre-ship; post-deploy `curl -I` against the
live origin will confirm the `headers()` rule overrides Replit's static
layer. If it doesn't, revert path is `git revert` + move files out of
`/public` (Plan B in the review's Open Questions).

### Other notable items
- Drizzle migrations shipped since 2026-05-25: `0008` (session.last_activity_at), `0009` (user_role enum), `0011` (businesses table), `0012` (social fields), `0013` (hours + aira_review), `0014` (rating), `0015` (deleted_at + partial index), `0016` (city + category + app_setting), `0017` (membership_plan + business_subscription), `0018` (sponsorship_tier + sponsorship), `0019` (sponsorship_tier.max_slots), plus waitlist extensions.
- Businesses stat `COUNT` bigint-as-string fix (commit `233f144`): `@neondatabase/serverless` returns `COUNT(*)` as a string; wrapped in `Number()` in `packages/services/src/businesses/queries.ts`.
- React-email templates groundwork (`.mstack/plans/2026-05-24-react-email-templates.md`)
- Brand consolidation, primary-color darken, template hardening (May 23–24 cluster) — all merged
- Mobile welcome + session gate
- Replit-specific notes: `.claude/memory/replit-gh-push-auth.md` + `replit-truncated-history.md` document the gotchas from pushing to GitHub from the Replit workspace

---

## Sprint 0 — Foundation & accounts (~1 week)

**Status:** ✅ Done — EAS init + first signed builds + .well-known Team ID substitution all shipped 2026-06-23. Domain `airabynisarga.com` registered + live 2026-06-29 with universal-link follow-ups (AASA Content-Type via `next.config` headers, www → apex 301 redirect, CLAUDE.md apex-only convention) AND Android App Signing key SHA-256 pasted into `assetlinks.json`. All `.well-known` files now contain real values.

**Project facts (locked 2026-06-09):**
- Prod host: `airabynisarga.com`
- Bundle ID (iOS + Android): `com.airabynisarga.app`

**Goal:** Everything with external lead time or one-time config is in motion before we start building features.

- ⬜ Register `airabynisarga.com` domain (still pending — live universal-link verification gated on the domain resolving to the Replit deploy)
- ✅ Postmark sender signature + DKIM/SPF (Postmark server token set in Replit env)
- ✅ EAS project init (`eas init`) + bundle ID registration with Apple/Google — bound to `million-labs` Expo org as `@million-labs/aira-mobile` (projectId `21065081-2afd-43d4-aef7-7ce10de55a8b`). Apple bundle ID `com.airabynisarga.app` registered with Nisarga Group LLC team (`C529274M9Y`); Play Console bundle registered under "AIRA by Nisarga" (App Store Connect App ID `6783242682`).
- ✅ Bundle identifiers in `apps/mobile/app.config.ts` — `com.airabynisarga.app` (iOS + Android), associated domain `airabynisarga.com`
- ✅ `.well-known/apple-app-site-association` — Team ID `C529274M9Y` substituted at both sites (`applinks.details[0].appID` AND `webcredentials.apps[0]`). Live verification activates once the domain resolves.
- ✅ `.well-known/assetlinks.json` — package filled; App Signing key SHA-256 fingerprint pasted 2026-06-29 (captured from Play Console → Setup → App integrity → App signing)
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

**Status:** ✅ Done (2026-06-23) — F14 (purge cron), F17 (full configurable schedule), homepage sponsored sort, **F20 Community Requests Board**, **F20 v2 admin moderation hardening**, and **F21 push broadcasts** all shipped. S5 closed.

**Goal:** Renewal reminder emails go out on the configurable schedule. Community Requests Board live with submission + moderation queue + auto-expiry. Admin broadcasts a push notification to a segment of business users and it lands on real devices.

**Features (PRD refs):**
- ✅ F17 (amended) — Renewal reminder automation, **email-only** via Postmark. Configurable schedule (`AppSetting.reminder_schedule`) shipped — cron loops the windows, sends one labelled email per non-empty window, admin edits at `/admin/settings/renewal-schedule`. Per-business-owner emails moved to Phase 2 (blocked on owner identity).
- ✅ F20 — Community Requests Board (submission → admin moderation → approved board with search/pagination, "I can help" private intent signal, in-app notification to author, hourly expiry cron) — shipped 2026-06-14, QA 11/11
- ✅ F20 v2 — admin moderation hardening (all-status filter + counts, edit/delete with snapshot audit, admin-only respondent visibility, table UI + popup-modal row click) — shipped 2026-06-14, QA 10/10
- ✅ F21 — Notifications broadcast to business users (audience: city / categories / specific businesses; channel: Expo Push). Logs to `notifications` (in-app) + `notification_delivery` (per-device push attempts) — shipped 2026-06-23.
- ✅ F14 — Lifecycle: `purge_soft_deleted` cron (180 days default) — shipped in S5 mini-sprint

**Schema additions:** ✅ `community_post`, `post_interest` (migration `0021`) shipped with F20. ✅ `user_device`, `notification_delivery` (migration `0033`) shipped with F21. Note: `sponsorship_tier.max_slots` (migration `0019`) shipped in S5 mini-sprint.

**Libs to add:**
- ✅ `expo-server-sdk` (push delivery from the Next.js server) — F21, lives in `packages/services`
- ✅ `expo-notifications` (mobile token + permission) — F21, registered as config plugin in `apps/mobile/app.config.ts`
- Postmark template additions for the configurable reminder windows — F17 remainder

**Cron jobs added:**
- ✅ `expire-posts` (hourly): approved community posts past `expires_at` flip to EXPIRED — shipped with F20
- ✅ `renewal-reminder` (daily 08:00 UTC): reads `app_setting.reminder_schedule`, loops configured windows, dispatches one labelled email per non-empty window to admin inbox — shipped (S5 mini-sprint + F17 config schedule, 2026-06-14)
- ✅ `purge-soft-deleted` (daily 03:00 UTC): hard-delete businesses archived more than 180 days ago — shipped

**Risk gate:** Push notification arrives on a real iOS device AND a real Android device. Renewal email lands in Postmark + delivers to a real inbox (not just localhost test).

---

## Sprint 6 — Mobile shipping + admin polish (2 weeks)

**Status:** ✅ Done (2026-06-15) — all in-scope items shipped. F25 deep links moved to S7 (S0-gated; naturally fits the store-submission sprint).

**Goal:** First TestFlight build + Play Internal Track build in QA's hands. Admin console feels finished. All TODO items from `TODOS.md` cleared.

**Features (PRD refs):**
- ✅ F25 (mobile half) — moved to S7 (see below)
- ✅ F22 — Audit log UI — shipped 2026-06-15. FilterBar (date range + actor typeahead 300ms debounce + target-type dropdown + action dropdown with domain `<optgroup>`s) + readable English rendering for all 24 `AuditMeta.kind` variants + target-id links (user → `/admin/users/[id]`, business_subscription/sponsorship → `/admin/businesses/[business_id]` via LEFT JOIN, community_post → `/admin/community`, app_setting → full key, session → muted placeholder). URL-driven, "Clear all" button, empty-state message. QA 9/9 (`.mstack/qa/2026-06-15-1215/`). *CSV export deferred — see 2026-06-15 decision below.*
- ✅ F23′ — Renewal follow-up queue — shipped 2026-06-15. `subscription_followup` table (migration `0023`), derived queue view, WindowChips (7/14/30/60/90d), FollowupModal with lazy-loaded history, 6-outcome radio group, hybrid drop semantics (refused: permanent drop, called: auto `scheduled_next = now+7d`, voicemail/no_answer: annotated in queue), audit row per outcome. QA 17/17 (`.mstack/qa/2026-06-15-0836/`).
- ✅ Feature image (F13 extension) — shipped 2026-06-15. `FeatureImageSection` admin drag-and-drop component; `POST /api/v1/admin/businesses/[id]/feature-image` (1200×630 JPEG via Sharp) + `DELETE`; `setBusinessFeatureImage` / `clearBusinessFeatureImage` service functions; old storage object replaced on re-upload. Public listing detail: category-icon avatar circle removed from identity row (hero `<img>` already full-width). Plan: `.mstack/plans/2026-06-15-feature-image.md`.
- ✅ `requireAdminJSON` auth cleanup — shipped 2026-06-15 (`d009ea1`). Six raw route handlers (gallery upload/delete, evidence upload, feature-image upload/delete, CSV export, cron list) that each inlined the same 3-step admin auth block now use a single `requireAdminJSON(req)` helper extracted to `lib/auth/server.ts`.
- ✅ TODOS.md cleanup — brand strings resolved, mobile fonts implemented (`@expo-google-fonts/lato` + `cormorant-garamond`), super_admin narrowing fixed, tagline confirmed by client, light-only theme locked

**Deferred from S6 (2026-06-15):**
- Generic AppSetting admin hub covering `posts_expiry_days`, `soft_delete_purge_days`, `posts_max_visible`. Defaults work for launch; one-off SQL is cheaper than building UI for knobs ops won't touch in month 1. Reopen if (a) ops asks twice to change one, or (b) we ship a second knob that needs a form anyway.
- PRD F23's CSV exports for Listings / Categories / MembershipPlans / Sponsorships / Posts. Reframed: renewals is the only CSV use case with real launch pressure, and an in-UI queue (F23′) serves it better than a download. Other four surfaces are reachable in-app already; external-sharing asks (client/accountant) haven't materialised. Reopen surface-by-surface if a real external-sharing need shows up post-launch.

**Schema additions:** none — AuditLog already exists from S2.

**Libs to add:**
- `@expo-google-fonts/lato` + `@expo-google-fonts/cormorant-garamond` + `expo-font` (mobile native typography per TODO)

**Cron jobs:** none new.

**Risk gate:** EAS build succeeds for both iOS and Android. Deep link from a manually-shared URL opens the correct screen on a real device.

---

## Sprint 7 — Beta, hardening, store submission (2 weeks)

**Status:** ⬜ Not started

**Goal:** App Store + Play Store submitted. E2E QA, performance tuning, and physical-device push/deep-link testing handled by the team's separate QA sprint. First review-cycle feedback addressed.

**Features:**
- ⬜ F26 — Force-update dialog. Seed `min_supported_build_ios` / `min_supported_build_android` into `app_setting`; admin form to raise the floor; mobile startup check against `GET /api/v1/app/version-check` — undismissable blocking dialog with store link if `buildNumber < min`. Slotted here (pre-submission) so no public user can ever be on an unblocked old build. ~3 files, ~2-3h.
- ⬜ F25 (mobile half) — Deep links wiring (Universal Links + App Links). Fill Apple Team ID into `.well-known/apple-app-site-association` and Android SHA-256 into `.well-known/assetlinks.json` once S0 external work lands; verify associated domain entitlement in `app.config.ts`. Gated on S0.
- ⬜ App Store metadata: app name, description, screenshots, keywords, privacy nutrition label
- ⬜ Play Store metadata: short + full description, screenshots, content rating, data safety form
- ⬜ Submit to App Store (expect 1-3 day initial review)
- ⬜ Submit to Play Store (expect same-day to 7-day review for new apps)
- ⬜ Address review-cycle feedback (plan for cycle 2 — new apps often need it)

**Schema additions:** none.

**Libs to add:** none.

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
- **2026-06-13** — F20 scope extended beyond PRD: added private "I can help" intent signal (`post_interest` table) on top of the PRD's plain posts-only spec. *Why:* PRD F20 leaves the word-of-mouth loop open — someone posts a request, but there's no app-native way for another member to close it. The intent signal stays inside MVP scope (no public threads, no in-app messaging — the responder's optional note IS the help signal). Locked in `/mlabs-plan` consultation as Option B over Option A (posts only) and Option C (full public comments).
- **2026-06-14** — `/admin/cron`'s `KNOWN_JOBS` drift caught a SECOND time (first time was `renewal-reminder` in the S5 mini-sprint; second time was `expire-posts` shipping with F20). *Why pattern matters:* the admin cron page maintains a static display array decoupled from `apps/web/src/lib/cron/registry.ts`. Adding a handler to the registry does not auto-surface it on the admin page. Every new cron job needs an entry in `KNOWN_JOBS` (name + human schedule string). Recorded again in `.mstack/learnings.jsonl` — consider promoting to a CI check if this drifts a third time.
- **2026-06-14** — Discriminated-union changes (e.g. adding a `kind` to `NotificationBody`) break sibling `switch (body.kind)` statements in BOTH the web `notification-item.tsx` and the mobile `notifications.tsx` renderers. Plans that grow the union must list both renderer files as edit targets, OR sequence the renderer-coverage tasks BEFORE the union-extension task (so the union grows under exhaustive coverage). Surfaced during F20's `/mlabs-code` run; T7 (renderer) had to be pulled forward before T4 (routes) would typecheck.
- **2026-06-14** — Migration-time SQL seeds (e.g. `INSERT INTO app_setting`) need an explicit `gen_random_uuid()::text` for the id column. The schema's `$defaultFn(() => crypto.randomUUID())` is **application-side only** and does not become a SQL column DEFAULT, so a bare `INSERT (key, value)` fails with NOT NULL on `id`. Caught when seeding `posts_expiry_days` for F20.
- **2026-06-14** — F17 per-business-owner emails formally moved to Phase 2. *Why:* the business schema has no `owner_email` and no FK to `user` today, so "email each owner" requires deciding the owner identity model first (column on `business` vs FK to user vs join table for multi-owner). Same blocker pins F21's "broadcast to business users" target shape. Doing the owner-identity decision once unblocks both — capture as a pre-Phase 2 plan when business-owner self-service becomes a goal.
- **2026-06-14** — Audit-around-delete pattern locked: SELECT snapshot → INSERT audit → DELETE all inside one `db.transaction`. The conventional "audit BEFORE mutation" can't apply because the row is unreadable after delete. Required widening `createAudit` to accept any handle with `insert()` (Database or PgTransaction) — shipped in `Pick<Database, "insert">`. Used by F20 v2 `deletePost`; future hard-deletes should follow the same shape.
- **2026-06-14** — `relativeTime()` helpers across the app use `toLocaleDateString()` as the >7d fallback, which silently differs between Node (server) and the browser, triggering hydration warnings on older fixture data. Fix: stable UTC `MM/DD/YYYY` formatter + `suppressHydrationWarning` on the wrapping span. Landed on `admin/community/moderation-queue.tsx` and the user-facing community card; same pattern lives in notification-item, post-form, etc. and will need the same fix if those surfaces ever render >7d-old timestamps.
- **2026-06-15** — Generic AppSetting admin hub dropped from S6 MVP scope. *Why:* PRD F10 lists five tunable keys (`reminder_schedule`, `homepage_*`, `posts_expiry_days`, `soft_delete_purge_days`, `min_supported_build_*`). Three already have dedicated admin UI (`/admin/settings/renewal-schedule`, `/admin/settings/homepage`). Of the remaining two: `posts_expiry_days` (default 30) and `soft_delete_purge_days` (default 180) have no believable change-pressure in month 1 — a one-off Drizzle Studio edit is cheaper than building a form ops won't open. `min_supported_build_*` only matters when F26 ships, so it's folded into F26's own scope (seed + form land together with the mobile-side force-update dialog). Trade-off accepted: changes to the two deferred knobs won't appear in audit log until a UI exists, which is fine for internal-admin launch. Reopen the generic hub if ops asks twice or a third tunable knob ships.
- **2026-06-15** — F26 (force-update dialog) moved from S6 to S7. *Why:* the risk requires three simultaneous conditions (large uncontrolled user base + breaking API change + no OTA-fixable path) none of which apply at MVP TestFlight launch. Deferring to S7 (pre-submission) ensures it lands before any public user can be on an old build, at the natural moment when real `buildNumber` values exist to configure.
- **2026-06-15** — F23′ hybrid queue-drop semantics locked. Initial plan's outcome table said all outcomes drop from queue; prose said only `paid` + future `scheduled_next` drop. QA surfaced the contradiction (Issue 1). User picked Option C: `refused` drops permanently (added to `outcome IN ('paid', 'refused')` exclusion), `called` auto-sets `scheduled_next = now+7d` via `computeScheduledNext()` (drops temporarily), `voicemail` + `no_answer` stay annotated in queue. *Why:* the hybrid matches operator mental model — "I had a real conversation, chase them in a week" (called) vs "I literally just tried, I can see them again tomorrow" (voicemail/no_answer) vs "they declined, don't waste calls" (refused).
- **2026-06-15** — `AuditMeta` union + `KNOWN_AUDIT_ACTIONS` moved from `@aira/db/audit` to `@aira/validators/audit-meta`. *Why:* `@aira/db` carries `import "server-only"`, so any client component importing `AuditMeta` (e.g. the `RenderAuditDetail` renderer) would fail. The type + runtime array are pure data; only `createAudit`, `AuditFn`, and `AuditOpts` are server-only (they stay in `@aira/db/audit` with a re-export of `AuditMeta` for backward compat). Bidirectional compile-time assertion added so the union and runtime array can't diverge.
- **2026-06-15** — Light-only theme locked for MVP. *Why:* client confirmed the light palette; dark mode was an extrapolation not present in the Figma. Web pins via `colorScheme: "light"` on `<html>` (no ThemeProvider); mobile pins via `userInterfaceStyle: "light"` in `app.config.ts` + `useColorScheme()` returning `"light"` unconditionally. Dark token set preserved in `packages/config/src/design.ts` for a future client ask, but no user-facing toggle exists or will be added without a new decision. `brand.tagline = "ROOTS & REACH"` confirmed by client — no longer deferred.
- **2026-06-15** — `requireAdminJSON(req)` helper extracted to `lib/auth/server.ts`. *Why:* six raw route handlers (multipart uploads, CSV, binary responses that can't go through `defineOperation`'s JSON pipeline) each inlined the same 3-step auth block. Single point of change if role logic evolves. Mirrors the existing `requireUserJSON()` pattern; callers do `const auth = await requireAdminJSON(req); if (auth instanceof Response) return auth`.
- **2026-06-16** — G1 Business owner reachability shipped — `businesses.owner_user_id` FK + `ON DELETE SET NULL` + partial index on the linked subset; `assignBusinessOwner`/`unassignBusinessOwner` (audit-before-mutation + post-commit in-app notification); admin `OwnerFilter` (`has`/`none`/all) + Notify-all-owners broadcast modal + Owner column on the businesses table; `/account/listings` read-only owner-side surface. *Why now (vs Phase 2):* F17 per-business-owner emails AND F21 audience targeting were both blocked on the owner identity model; doing it once unblocks both — F21 inherits a real target shape as soon as EAS comes online. Discriminated-union renderer-coverage lesson from F20 applied: `NotificationBody.kind` added `business_broadcast` with sibling web + mobile renderer updates in the same plan; `AuditMeta.kind` added three new variants (`business.owner_assigned`, `business.owner_unassigned`, `business.broadcast_sent`) with the `KNOWN_AUDIT_ACTIONS` parity check + `RenderAuditDetail` switch updated alongside. F17 per-owner emails remain Phase 2 — schema's there now, but the templating + opt-out controls are a Phase 2 plan, not a launch-blocker.
- **2026-06-16** — `getFeaturedBusinesses` widened from hard `tier IN ('tier1','tier2')` filter to "any active-paid subscription, sorted premium-first". *Why:* the strict filter hid the entire `/home` Featured section whenever no premium customer existed (early-launch directory state) and made the page feel empty. The `TIER_ORDER` sort key already lifts tier1+tier2 to the top, so widening eligibility preserves the premium-first intent without the empty-page failure mode.
- **2026-06-16** — Drizzle snapshot chain collision recovery procedure: when migration generation immediately after a manual SQL migration produces a column-rename detection that overwrites a sibling snapshot's pointer, fix is manual stitching of `_journal.json` + the affected `00XX_snapshot.json` `prevId` field — not regen. Surfaced during category drift cleanup (0027 detected as a rename of 0026's column).
- **2026-06-17** — Post-on-AIRA rebrand drops the "I'm interested" intent signal in favour of comments as the canonical engagement loop. *Why:* the intent signal was a private one-tap signal designed for a board with no thread; comments make the same intent public and contextual, AND scale to multi-respondent discussions. The two phone/email contact fields added to `community_post` cover the "reach me out of band" case without requiring the responder to be on the platform. Migration `0028` ships both columns NULLable so legacy posts pass through unchanged.
- **2026-06-22** — Listing **Favorites** mutation semantics: BOTH `addFavorite` and `removeFavorite` are fully idempotent (silent on duplicates). *Why:* favorites are personal preferences with no second party who needs the trail (unlike `community.post_interest`, which throws on duplicate add because the post author needs to know who responded). The unique `(business_id, user_id)` index + `ON CONFLICT DO NOTHING` insert makes this one-line. No audit log for the same reason: no compliance, no dispute scenario, no second party. Diverges from the post_interest precedent on purpose — when following a precedent table for a new join entity, verify the semantic match, not just the table shape.
- **2026-06-22** — Listing Favorites UI: single-click toggle (NOT the user's originally-requested double-click-to-remove). *Why:* double-click as a remove gesture is engineer-intuitive (dblclick fires after click) but discoverability-hostile to users — they don't know to try it; on touch it conflicts with browser double-tap-to-zoom; screen-reader and keyboard users can't reliably double-click. Standard pattern across Pinterest/Spotify/Apple is the single-click toggle with the icon state telegraphing direction. Surfaced as a Concern at /mlabs-plan; user picked the toggle once the tradeoffs were on the table.
- **2026-06-22** — `BusinessSchema` deliberately stays `z.object()` (not `.strict()`) because the admin extension pattern (`BusinessAdminSchema = BusinessSchema.extend(...)`) and the public-payload leakage check rely on different mechanics: the public ops project the public mapper, the admin ops project the admin mapper. Verification of "no PII leakage" is by raw-body inspection of `/api/v1/businesses` responses, NOT by Zod-parse — Zod's `safeParse` on a non-strict schema silently strips unknown keys, so the test would always pass whether or not the field leaked. Adding `.strict()` globally is a separate plan if anyone wants belt-and-braces.
- **2026-06-23** — EAS project bound to the `million-labs` Expo org (not personal, not Nisarga). *Why:* `million-labs` already exists and aligns with how the dev team holds membership; transfer to Nisarga is a one-step rename if ownership ever needs to migrate. Project: `@million-labs/aira-mobile` (UUID `21065081-2afd-43d4-aef7-7ce10de55a8b`).
- **2026-06-23** — App Store Connect listing name = "AIRA by Nisarga" (not "AIRA"). *Why:* Apple already had an app named "AIRA" so the bare name was unavailable. Adding "by Nisarga" gets the parent-entity disambiguation Apple wanted AND matches the in-app `${brand.name} by ${brand.parentName}` pattern that ships in the auth shell footer + sidebar. Launcher icon stays "AIRA" (`app.config.ts.name`) for the home-screen read; storefront uses the longer form. Decision locked deliberately rather than absorbed silently.
- **2026-06-23** — Skipped the `preview` profile builds entirely; went straight to `production` for both iOS + Android. *Why:* preview profile's `distribution: "internal"` on iOS triggered a UDID-registration loop (ad-hoc IPAs need each test device's UDID; we have zero registered). Production builds use App Store distribution which doesn't require UDIDs and the artifact (signed IPA) is what TestFlight Internal Testing accepts anyway. Net effect: one fewer build run, no UDID registration overhead, same end-state for internal testers. Preview profile + channel remain wired in `eas.json` for the future "JS hotfix to internal testers separately from production users" workflow.
- **2026-06-23** — `sharp@0.34.5` moved from `dependencies` to `optionalDependencies` on `apps/web/package.json`. *Why:* EAS's iOS cloud runner (macOS arm64) couldn't install sharp during the workspace-root `pnpm install --frozen-lockfile` — prebuilt binary failed to download and the node-gyp source-build fallback also failed, aborting the install. Sharp only matters for the web's server-side image pipelines (avatar, feature image, evidence); mobile doesn't import it. `optionalDependencies` makes pnpm log a warning + continue when the cloud install fails on a platform where sharp's prebuilts don't land — Replit + web prod both install it cleanly. Trade-off: if sharp ever fails on Replit or web prod, the failure becomes a silent warning instead of a loud error. Web has end-to-end tests for image upload that would catch this.
- **2026-06-23** — `apps/mobile/package.json` carries a direct dep on `whatwg-fetch`. *Why:* `@expo/metro-runtime` (a transitive dep of `expo-router`) imports `whatwg-fetch` at the source level, but pnpm's strict isolated-store layout hides it from Metro's resolver (Metro only checks `node_modules` and `../../node_modules`, not the deep `.pnpm/...` paths). Even with `node-linker=hoisted` + `shamefully-hoist=true` in `.npmrc`, EAS's cloud install didn't reliably hoist whatwg-fetch to where Metro looks. Explicit direct dep forces pnpm's hand. Same pattern is likely to recur with other peer-deps-via-pnpm-hoisting; first occurrence locked here.
- **2026-06-23** — Apple Push Key (.p8 for APNs) set up during EAS init flow rather than deferred to F21. *Why:* the credential setup is a one-shot portal trip; bundling it now means F21 push broadcasts (server-side fan-out via `expo-server-sdk`, mobile-side Expo Push Token registration) becomes purely code work with no waiting on Apple. Per-team key, reusable across apps, doesn't expire — zero ongoing maintenance cost.
- **2026-06-23** — F21 push broadcasts: route lives at `/api/v1/profile/push-token`, NOT a new `/api/v1/me/*` namespace. *Why:* the existing `/profile/*` surface already holds current-user resource mutations (password, email, preferences). Sibling namespaces for the same conceptual scope are a cognitive split with no upside. Mirrors `/profile/password` + `/profile/email`.
- **2026-06-23** — F21 sync fan-out cap at 60 seconds via `AbortController`, with partial-success counters in the response shape and admin UI. *Why:* no cap = up to ~120s tail latency on Expo Push Service outages, leaving admins watching a spinner. 30s loses partial visibility. 60s covers ~95% of Expo's documented tail; tickets still in flight at the cap surface as `devices_pending` so the admin sees what's incomplete and the receipt-polling follow-up can reconcile.
- **2026-06-23** — `expo-server-sdk` lives in `packages/services/package.json`, not `apps/web/package.json`. *Why:* matches how Postmark + Stripe primitives are scoped to the service layer; future cron-triggered server-side push uses (renewal-reminder escalation to push, e.g.) inherit access without a second dep.
- **2026-06-23** — F21 audience targeting filters active-only businesses (`isNull(businesses.deleted_at)`) across all four audience branches. *Why:* the existing G1 query already excluded archived businesses, and there's no operator scenario where pushing to the owner of an archived listing makes sense. Inherited at the `resolveTargetUserIds` helper level so every branch gets the filter for free.
- **2026-06-23** — F21 push payload `data` carries the full `NotificationBody.business_broadcast` object, not just the discriminator. *Why:* well within Expo's 4KB limit and gives F25 deep-link wiring a clean route — the mobile app's onPress handler reads the same body shape as the in-app bell notification.
- **2026-06-23** — F21 `DeviceNotRegistered` cleanup runs OUTSIDE the broadcast transaction. *Why:* the broadcast spans the in-app fan-out (DB tx) AND the Expo Push HTTP call (no tx). Rolling back the broadcast on a Push Service error would be wrong — the audit + bell-icon work is the source of truth. Cleanup is best-effort, idempotent; a failed delete leaves the row for the next fan-out to retry-then-delete. Harmless.
- **2026-06-23** — F21 `notification_delivery.status` stays `text` with Zod validation at the service boundary, not a Postgres enum. *Why:* matches the codebase pattern — `notifications.type` is also text with the same Zod-at-boundary discipline. Postgres-level enum is a one-line migration if it ever matters; right now it'd be a deviation just for symmetry.
- **2026-06-23** — F21 by_categories audience targets through the new `business_category` N:M join table, NOT the legacy `businesses.category` text column the review T4 sample SQL hinted at. *Why:* the admin modal's category picker draws from `listCategoriesTreeOp` which returns `categories.id` values. Joining through the legacy text column would require a name → id map admins don't have. Surfaced during T4 code-time; documented as a deliberate review deviation in the F21 implementation report.
- **2026-06-23** — F21 receipt polling deferred to a small follow-up plan (NOT a TODO comment). *Why:* receipts upgrade `notification_delivery.status` from `pending` → `ok` ~15min after send and are the only way to confirm actual delivery. The follow-up needs a node-cron job + a service function + storage of the ~24h-valid ticket IDs; clean as a tiny self-contained plan rather than smeared into F21 v1. Q-E in the F21 review locked this.
- **2026-06-23** — AIRA mobile pinned to Expo SDK 54 (was 55, S0-init pinned just hours earlier). *Why:* the publicly-shipped Expo Go on App Store + Play Store tracks one SDK at a time, and matching it gives the scan-the-QR iteration loop. User explicitly preferred this over building a custom Dev Client. Trade-off: AIRA misses any SDK 55-only feature (currently none affecting MVP scope). Re-evaluate when SDK 56 ships and Expo Go updates. Implementation: `expo install --fix` against `expo@~54.0.0` rewrote every Expo-curated peer; workspace types unified via root `pnpm.overrides`. See `.mstack/reviews/2026-06-23-expo-sdk-54-downgrade.md`.
- **2026-06-23** — Never hand-pick a peer version under `apps/mobile/`. Always defer to `npx expo install --fix`. *Why:* F21 T12 manually picked `expo-notifications: ~0.32.13` for SDK 55 — Expo's resolver actually wanted `~55.0.22` (the version-aligned release where `expo-*` packages adopt the SDK major as their major). pnpm happily resolved the wrong line; F21 code happened to work but was never the version SDK 55 intended. Locked policy: the resolver picks; you don't.
- **2026-06-23** — Workspace-wide `pnpm.overrides` for `@types/react@~19.1.17` + `@types/react-dom@~19.1.11`. *Why:* SDK 54's React types pin (`~19.1.17`) conflicts with `@base-ui/react`'s peer-dep on `@types/react@^19.2`. The override forces a single types version across every workspace package so tsc sees one Ref type per file. Web's React runtime is on 19.2.x — types being a minor version behind is fine because React's minor-version type additions don't surface in this app's code.
- **2026-06-22** — `apiClient.post(path, body, init?)` and `.patch(path, body, init?)` take the request body as the SECOND POSITIONAL argument, NOT as `{ body }` inside an init object. Mis-copying the fetch `{ body }` shape sends `{"body":{...}}` as the literal request body and strict Zod schemas reject it with 400. `.delete(path, init?)` has no body arg. Caught the FavoriteButton ship within minutes via user report ("red dot, no favorites in My Favorites"); fix unwrapped the body to a positional arg. Lesson logged.
- **2026-06-15** — PRD F23 (CSV exports for Listings / Categories / Memberships / Sponsorships / Posts) reframed and largely deferred. *Why:* of the five surfaces, only BusinessSubscriptions has real pre-launch demand — PRD F16 leans on its CSV as the manual workaround for not having SMS reminders. But the actual operator job (phone expiring members down a list) is served *better* by an in-UI queue than by a download: outcomes (called / voicemail / refused / paid / reschedule) get captured as audit rows instead of evaporating in a spreadsheet, the admin's place persists across sessions, and phone numbers stay canonical. New scope = **F23′ renewal follow-up queue**. The other four CSV surfaces (Listings, Categories, MembershipPlans, Sponsorships, Posts) are reachable in-app for internal use, and external-sharing asks haven't materialised; building those CSVs speculatively for hypothetical client/accountant emails isn't a launch-week need. Reopen surface-by-surface when a real external-sharing request hits twice. Audit log CSV export is also deferred — Drizzle Studio is sufficient for incident response by the dev, and operator-facing audit consumption is on-screen filtering.
