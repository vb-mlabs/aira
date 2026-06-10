# Plan: S4 — Membership, Sponsorship, sponsored sort

**Date:** 2026-06-10
**Slug:** 2026-06-10-s4-membership-sponsorship
**Status:** implemented
**Author:** /mlabs-plan

---

## Problem

Today every active business is publicly visible, regardless of payment, and listings are sorted only by the static `tier` column on `businesses` (tier1 → tier2 → tier3, then name). There is no concept of a paid subscription period, no way to record a manual Zelle/cheque payment, and no way to promote a paying sponsor above their organic tier within a category.

Without S4, AIRA is a free directory with no revenue lever and no enforcement of "you stopped paying so you should drop off the listings." Admins (Nisarga Group) cannot:

- Set membership prices/durations and assign them to a business
- Record a manual payment with an evidence trail (Zelle screenshot)
- See which businesses are renewing in the next 7/14/30 days
- Sell sponsorship slots that promote a business inside a category for a date range, ranked by tier + amount

Success = admin onboards a paying business in <2 min, the subscription gate hides the listing the day after `end_date`, sponsored businesses appear at the top of their category for the window they paid for, and a cron job rolls statuses without human intervention.

## Scope

**In (this sprint):**
- F15 — Membership management: `membership_plan` CRUD per city + assignment to business via `business_subscription` rows. Visibility gate = `now() ∈ [start_date, end_date] AND payment_status='paid'`.
- F16 — Manual payment recording: admin edits a subscription row, sets `payment_status`, uploads `payment_evidence_url` (Zelle screenshot or PDF), notes; audit log entry per recording. Renewal-tracking filter: `/admin/businesses?renewing=14` returns rows whose active subscription `end_date` falls inside the next N days. CSV export of that filtered set.
- F18 — Sponsorship management: `sponsorship_tier` CRUD + per-business `sponsorship` rows (category, tier, date range, amount, status).
- F12 — Sponsored placement + sort: within a category listing, sponsored rows float to the top, ordered by `sponsorship_tier.priority` asc → `sponsorship.amount_cents` desc → `businesses.name` asc. Existing tier1/2/3 ordering is preserved for the non-sponsored set.
- F19 — Pricing configuration UI: editable plans + tiers from `/admin/membership-plans` and `/admin/sponsorship-tiers`.
- Cron infra: `node-cron` boot in `instrumentation.ts`; `cron_run` log table; two jobs (`sponsorship_status_rollover` hourly, `subscription_status_rollover` daily); admin "Run now" button per job for recovery.
- `payment_evidence_url` upload pipeline (reuses Sharp + image-pipeline pattern from S3 gallery; adds PDF passthrough for non-image evidence).

**Out (deferred):**
- Stripe / self-serve payment — Phase 2 per PRD.
- SMS reminders (renewal_reminders cron itself is S5, not S4).
- Multi-currency — USD-only for MVP.
- Sponsorship slot limits per tier (PRD Phase 2).
- Sponsored sort on the **homepage** featured-businesses tile — S4 covers `/listings/[category]` only; the home tile keeps its current "tier1 + tier2 by name" behaviour. Revisit if needed.
- AppSetting-driven cron schedules (hardcoded `0 * * * *` and `5 0 * * *` are fine for MVP — making them configurable is S6).
- "Run all crons on boot" catch-up. If a job is skipped the admin runs it manually from the UI.

## Approach

**Subscription visibility gate as a JOIN, not a denormalized column.** Every public-read query already gates on `deleted_at IS NULL`; we extend the `WHERE` with `EXISTS (SELECT 1 FROM business_subscription WHERE business_id = businesses.id AND payment_status = 'paid' AND now() BETWEEN start_date AND end_date)`. No denormalization, no second source of truth — the cron only changes `payment_status` (overdue at end_date expiry) and the gate immediately reflects it. Trade-off: every public listing query adds one EXISTS subquery; acceptable at MVP scale (single city, dozens-to-hundreds of businesses), revisit with a partial index or materialized `is_visible_until` column if listing-page P50 regresses past 100ms.

**Sponsored sort layered on top of TIER_ORDER.** Today the sort is `TIER_ORDER, name`. We add a LEFT JOIN to `sponsorship` filtered by `category_id = <listing category> AND status = 'active' AND now() BETWEEN start_date AND end_date`, plus its `sponsorship_tier`. New sort expression:

```
ORDER BY
  CASE WHEN sponsorship.id IS NOT NULL THEN 0 ELSE 1 END,  -- sponsored first
  sponsorship_tier.priority ASC NULLS LAST,                -- best tier first
  sponsorship.amount_cents DESC NULLS LAST,                -- higher bid first
  TIER_ORDER,                                              -- existing tier1/2/3
  businesses.name ASC
```

A business with no active sponsorship for this category falls to the second `CASE` branch and is ordered by the existing `TIER_ORDER, name` — so the new behaviour is strictly additive and the non-sponsored set's relative order is preserved. Multi-category business with sponsorship in category A but not B sorts as sponsored only on `/listings/a`, as organic on `/listings/b`. **Locked behaviour:** sponsorship is per-(business, category) — sponsoring "restaurants" doesn't promote you in "shopping" even if you're listed in both.

**Cron infra: `node-cron` registered once in `apps/web/src/instrumentation.ts`** (Next.js's official boot hook). Each handler is an async function in `apps/web/src/lib/cron/<job>.ts` that opens a transaction, claims a `cron_run` row (`status='running'`), runs the SQL transitions, sets `status='succeeded'` with a JSON summary, and commits. Concurrency safety relies on `pg_advisory_xact_lock(hashtextextended(job_name, 0))` inside the transaction so two boot races (e.g. dev hot reload double-mount) can't fire the same handler in parallel — transaction-scoped, auto-released by COMMIT/ROLLBACK, no pooler hazards (per the anti-pattern note in `/mlabs-plan`). All transitions are idempotent: running the job twice in the same window is a no-op the second time because the SQL filters on the source state. Admin "Run now" button hits `POST /api/v1/admin/cron/[job]/run`, returns the new `cron_run` row.

**`payment_evidence_url` pipeline:** identical to the S3 gallery pipeline (Sharp resize, S3-compatible blob storage) for images, plus a PDF passthrough that skips Sharp and uploads bytes verbatim. New service `processAndStoreEvidence({ subscriptionId, bytes, contentType })`. Validates `contentType in ['image/jpeg','image/png','image/webp','application/pdf']`, max 5MB. Stores at `business-subscriptions/<id>/<uuid>.<ext>`. Delete on subscription delete (CASCADE handles the row; storage cleanup is best-effort).

**Alternatives considered:**

- **Denormalized `visible_until_date` column on `businesses`** — rejected. Adds a write-side coupling: every subscription mutation must update the businesses row in the same transaction, and the cron has to keep it in sync. EXISTS subquery is cheaper than the bug surface area at MVP scale.
- **Sponsored sort via a `sponsored_rank` integer column written by the cron** — rejected. Same denormalization problem; also forces sort logic into the cron rather than keeping it in the read query, where it belongs.
- **Per-category sponsorship vs global sponsorship** — picked per-category. Sponsoring a category is what an advertiser actually buys ("I want to be the top restaurant in Atlanta") — global doesn't map to a real pricing conversation. Locked in this plan; flagged as Open Question for the reviewer to confirm.
- **`pg_cron` in Neon for the jobs** — deferred. The roadmap explicitly picks `node-cron` in-process because the Replit VM is always-on (cron-strategy decision 2026-05-25). Revisit if we ever leave the always-on VM.
- **CSV export via a streaming response** — picked the simpler "buffer-then-respond" since the renewing-soon set is bounded by city × N days × small business count; revisit if export ever exceeds a few thousand rows.

## Data model changes

Migration `0017` adds (in dependency order):

```
membership_plan          (id PK, city_id FK→city ON DELETE RESTRICT, name text NOT NULL,
                          price_cents integer NOT NULL CHECK (price_cents >= 0),
                          duration_months integer NOT NULL CHECK (duration_months > 0),
                          active boolean NOT NULL DEFAULT true,
                          created_at, updated_at)
                         index: (city_id) WHERE active = true

business_subscription    (id PK, business_id FK→businesses ON DELETE CASCADE,
                          plan_id FK→membership_plan ON DELETE SET NULL,
                          start_date date NOT NULL, end_date date NOT NULL,
                          payment_status enum('paid','pending','overdue') NOT NULL DEFAULT 'pending',
                          payment_evidence_url text NULL,
                          recorded_by FK→user ON DELETE SET NULL,
                          notes text NULL,
                          created_at, updated_at)
                         CHECK (end_date >= start_date)
                         index: (business_id, end_date DESC)
                         index: (payment_status, end_date) WHERE payment_status = 'paid'

sponsorship_tier         (id PK, city_id FK→city ON DELETE RESTRICT, name text NOT NULL,
                          priority integer NOT NULL,
                          active boolean NOT NULL DEFAULT true,
                          created_at, updated_at)
                         UNIQUE (city_id, priority)  -- forces explicit reorder when colliding

sponsorship              (id PK, business_id FK→businesses ON DELETE CASCADE,
                          category_id FK→category ON DELETE CASCADE,
                          tier_id FK→sponsorship_tier ON DELETE RESTRICT,
                          start_date date NOT NULL, end_date date NOT NULL,
                          amount_cents integer NOT NULL CHECK (amount_cents >= 0),
                          status enum('scheduled','active','expired','cancelled')
                            NOT NULL DEFAULT 'scheduled',
                          notes text NULL,
                          created_at, updated_at)
                         CHECK (end_date >= start_date)
                         index: (category_id, status, start_date, end_date) -- the sort JOIN
                         index: (business_id)
                         index: (status, end_date) -- for the cron sweep

cron_run                 (id PK, job_name text NOT NULL,
                          started_at timestamp NOT NULL DEFAULT now(),
                          finished_at timestamp NULL,
                          status enum('running','succeeded','failed','skipped') NOT NULL,
                          summary jsonb NULL,
                          error text NULL)
                         index: (job_name, started_at DESC)
```

No edits to existing schemas. Two new enum types (`payment_status`, `sponsorship_status`, `cron_status`).

## Files to touch

**New:**
- `packages/db/src/schema/membership-plans.ts`, `business-subscriptions.ts`, `sponsorship-tiers.ts`, `sponsorships.ts`, `cron-runs.ts`
- `packages/db/migrations/0017_*.sql` (generated via `pnpm db:generate`)
- `packages/validators/src/membership-plans.ts`, `business-subscriptions.ts`, `sponsorship-tiers.ts`, `sponsorships.ts` (Zod input/output schemas, types)
- `packages/services/src/membership-plans/{queries.ts,service.ts,index.ts}`
- `packages/services/src/business-subscriptions/{queries.ts,service.ts,index.ts}` (includes "renewing-soon" filter)
- `packages/services/src/sponsorship-tiers/{queries.ts,service.ts,index.ts}`
- `packages/services/src/sponsorships/{queries.ts,service.ts,index.ts}` (includes the rollover transitions)
- `packages/services/src/cron/{queries.ts,index.ts}` (cron_run lifecycle helpers, advisory lock wrapper)
- `apps/web/src/instrumentation.ts` (NEW — Next.js boot hook; registers node-cron jobs in prod-server context only)
- `apps/web/src/lib/cron/{sponsorship-status-rollover.ts,subscription-status-rollover.ts,registry.ts}`
- `apps/web/src/server/operations/membership-plans.ts`, `business-subscriptions.ts`, `sponsorship-tiers.ts`, `sponsorships.ts`, `cron-admin.ts` (defineOperation entries)
- `apps/web/src/app/api/v1/admin/membership-plans/{route.ts,[id]/route.ts}`
- `apps/web/src/app/api/v1/admin/businesses/[id]/subscriptions/{route.ts,[subId]/route.ts,[subId]/evidence/route.ts}` (multipart upload for evidence)
- `apps/web/src/app/api/v1/admin/businesses/[id]/sponsorships/{route.ts,[spId]/route.ts}`
- `apps/web/src/app/api/v1/admin/sponsorship-tiers/{route.ts,[id]/route.ts}`
- `apps/web/src/app/api/v1/admin/businesses/export/route.ts` (CSV export of renewing-soon set)
- `apps/web/src/app/api/v1/admin/cron/{route.ts,[job]/run/route.ts}` (list runs + manual fire)
- `apps/web/src/app/admin/membership-plans/{page.tsx,[id]/page.tsx,new/page.tsx,_components/*.tsx}`
- `apps/web/src/app/admin/sponsorship-tiers/{page.tsx,[id]/page.tsx,new/page.tsx,_components/*.tsx}`
- `apps/web/src/app/admin/cron/page.tsx` (list jobs + last 20 runs + "Run now" button)
- `apps/web/src/features/admin/components/subscriptions-section.tsx`, `sponsorships-section.tsx` (mounted in `business-detail.tsx`)
- `apps/web/src/features/admin/server/evidence-pipeline.ts` (Sharp + PDF passthrough)

**Edit:**
- `packages/services/src/businesses/queries.ts` — public read queries gain the EXISTS subscription gate and the sponsorship LEFT JOIN + new sort. The non-paginated `getBusinessesByCategory` and the paginated `getBusinessesByCategoryPaged` both update.
- `packages/services/src/businesses/index.ts` — no API change; just re-exports.
- `apps/web/src/server/operations/businesses.ts` — no shape change; the gate is invisible to callers.
- `apps/web/src/app/admin/businesses/page.tsx` — adds `?renewing=N` filter dropdown + a "Subscription" column (active/expired/none chip) + a "CSV export" button that calls the new export route.
- `apps/web/src/features/admin/components/business-detail.tsx` — mounts the new Subscriptions + Sponsorships sections after the existing Editorial section.
- `apps/web/src/app/admin/_components/admin-sidebar.tsx` — new nav items for Membership Plans, Sponsorship Tiers, Cron.
- `package.json` (root) — add `node-cron` + `@types/node-cron`.
- `roadmap.md` — flip S4 status to 🟦 when implementation starts; record S4 completion at sprint end.

## Edge cases

- **Subscription gap.** A subscription expires Mon, a new one starts Wed. Tue the listing is correctly hidden (no row covering `now()`); Wed it reappears. Verify the gate flips back on automatically without admin action.
- **Overlapping subscriptions.** Two `paid` subscriptions with overlapping date ranges → both satisfy the EXISTS, listing stays visible. Allowed by design (admin may grant a freebie alongside a paid one). No UI to block this.
- **Sponsorship spans multiple subscription periods.** Sponsorship can be active while the visibility gate hides the business (unpaid). Decision: sponsorship is silently no-op when the business itself isn't visible — the LEFT JOIN still runs but the parent WHERE filters the row out. Surfaced as a warning chip in `/admin/businesses/[id]` so the admin knows.
- **Sponsorship across multi-category business.** A business in `restaurants` (primary) + `events-entertainment` (extra) with a sponsorship only on `restaurants`: shows sponsored on `/listings/restaurants`, organic on `/listings/events-entertainment`. The sponsorship JOIN is keyed on the listing's category, not the business's primary.
- **Concurrent admin edits to the same subscription.** Last-write-wins (no optimistic concurrency control). Cron and admin both write `payment_status` — if a cron flips paid→overdue at the same instant an admin sets paid→pending, last write wins. Acceptable at MVP scale; if it becomes a problem, add a row-version column.
- **`payment_evidence_url` larger than 5MB or wrong content-type** — route returns 400 with the validator's error message. Sharp pipeline never sees PDFs (branched on content-type before resize).
- **Cron fails mid-job.** Transaction rolls back, advisory lock releases, `cron_run` row left `status='running'` (no UPDATE to `failed` because the transaction rolled back). Admin sees the orphan row in the cron page; "Run now" re-runs cleanly. Future enhancement: a self-heal that marks orphan `running` rows older than 5 min as `failed`.
- **Two web processes start in parallel** (Replit redeploy overlap). `pg_advisory_xact_lock` ensures only one fires; the loser's `cron_run` is `status='skipped'` with `summary={ "reason": "lock_held" }`. Verify via QA on a multi-process boot.
- **Dev hot reload re-mounts the cron registry.** Guard registration with a module-level boolean so re-mounts don't stack jobs. Production-server check: `process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production'` — dev mode skips registration entirely. Manual "Run now" button works in dev for testing.
- **Membership plan deleted while subscriptions reference it.** `ON DELETE SET NULL` → subscription's `plan_id` is null but the row keeps its `start_date`/`end_date` so the gate keeps working. Admin UI shows "(deleted plan)" instead of the plan name.
- **Sponsorship tier deleted while sponsorships reference it.** `ON DELETE RESTRICT` blocks the delete; admin must reassign or cancel the sponsorships first. UI surfaces the count of dependent sponsorships in the delete confirm.
- **CSV export with no rows.** Returns a header-only CSV; UI shows "No renewals due in the next N days" tip alongside.

## Acceptance criteria

- [ ] Migration `0017` generated via `pnpm db:generate`, applied cleanly via `pnpm db:migrate` on dev, with no manual SQL edits.
- [ ] `/admin/membership-plans` lists plans for the active city; create/edit/deactivate work via PATCH; price_cents accepts whole-dollar input and stores cents.
- [ ] `/admin/businesses/[id]` Subscriptions section: lists subscriptions desc by `end_date`; "Add subscription" picks a plan, sets dates (auto-fills `end_date` from plan duration), records payment_status + evidence upload + notes; PATCH succeeds with "Saved." feedback; audit log row `business_subscription.recorded` appears with `metadata.kind` and `payment_status` populated.
- [ ] A business with **no** paid subscription covering `now()` is **invisible** on `/listings/<its-category>` and on `/home`'s featured tile. Becomes visible the moment an admin records a paid subscription that covers today. Becomes invisible again the day after `end_date` (verified via cron run, not a clock-mock).
- [ ] `/admin/businesses?renewing=14` returns only businesses whose active paid subscription `end_date` falls in `(now(), now() + 14 days]`; CSV export of that filtered set produces a downloadable file with `business_name, plan_name, end_date, days_remaining, contact_phone, contact_email`.
- [ ] `/admin/sponsorship-tiers` CRUD works; priority is unique per city (UNIQUE constraint enforces).
- [ ] `/admin/businesses/[id]` Sponsorships section: add sponsorship picks category + tier + dates + amount; status defaults to `scheduled`; sponsorship for a category the business doesn't belong to surfaces a validation warning ("This business isn't currently in that category — confirm?").
- [ ] On `/listings/<cat>`, a sponsorship `status='active'` with `now() BETWEEN start_date AND end_date AND category_id = <listing cat>` floats its business to the top of that listing, ordered by `tier.priority` asc → `amount_cents` desc → `name` asc. The remainder of the listing keeps `TIER_ORDER, name` order. Verified via Playwright (seed 3 sponsored + 5 organic, assert DOM order).
- [ ] `sponsorship_status_rollover` runs hourly. SCHEDULED rows whose `start_date <= now() AND end_date > now()` flip to ACTIVE in the same job tick. ACTIVE rows whose `end_date < now()` flip to EXPIRED. A `cron_run` row is written per run with status, summary `{transitioned_to_active: N, transitioned_to_expired: M}`, and `finished_at`.
- [ ] `subscription_status_rollover` runs daily at 00:05. `payment_status='paid'` rows whose `end_date < now()::date` flip to `'overdue'`. `cron_run` row written.
- [ ] `/admin/cron` lists the registered jobs, their last 20 runs (latest first), and a "Run now" button per job that POSTs to the manual-run endpoint and returns the new `cron_run` row inline. Manual run is idempotent (re-running gives an empty summary).
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all green after the sprint.
- [ ] `/mlabs-qa` smoke pass covers: visibility gate (paid vs unpaid), sponsored sort, renewing-soon filter, CSV export, cron manual run, audit log entries.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **Per-category vs global sponsorship.** Locked as per-category in this plan. Confirm: a sponsor pays to be at the top of "restaurants" specifically, not across every category the business is listed in. (If global, sponsorship table drops `category_id` and the JOIN becomes `business_id = b.id AND sponsorship_active`.)
- **Sponsored sort on the homepage featured tile.** Plan defers it. Confirm we're OK with the home tile staying "tier1 + tier2 by name" for now, so the only place the sponsored sort lands is `/listings/<cat>`.
- **`payment_evidence_url` required vs optional.** Plan says optional with a warning chip when missing. Confirm — strict-required would block admins recording cash payments where no screenshot exists.
- **Cron failure recovery story.** Plan ships "Run now" button + admin UI for last 20 runs. Confirm we're NOT also adding a Postmark "cron failed" alert email in this sprint — that's S5 territory.
- **Overlapping subscriptions allowed?** Plan allows them (no UNIQUE constraint blocking). Confirm: admin grants a freebie alongside a paid subscription → both rows coexist, both extend visibility.
- **What does "active subscription" mean for a business that has BOTH `payment_status='paid'` AND a parallel `payment_status='overdue'` row covering today?** Plan treats them independently — the `paid` row satisfies the EXISTS gate; the `overdue` row shows up in the renewing-soon CSV as a flag. Confirm.
- **CSV export — admin or super_admin only?** Plan says admin (parity with the rest of the admin surface). Confirm we don't want to lock CSV export behind super_admin specifically.
- **`@aira/mobile` — do we need to expose any of this in the mobile app this sprint?** Plan says no — mobile remains read-only browse; the new admin surfaces are web-only.
