# Review: S4 — Membership, Sponsorship, sponsored sort

**Date:** 2026-06-10
**Slug:** 2026-06-10-s4-membership-sponsorship
**Plan reviewed:** [2026-06-10-s4-membership-sponsorship.md](../plans/2026-06-10-s4-membership-sponsorship.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** /mlabs-review

---

## Summary

The plan is well-shaped: clear scope, additive data model (5 new tables, no destructive edits), correct use of EXISTS for the visibility gate, and a sane cron strategy via existing `instrumentation.ts`. Three blockers surfaced and were locked during review: (1) `AuditMeta` must be extended with 4 new variants — the union is strictly typed and the plan didn't list it as edit, (2) `instrumentation.ts` already exists as a no-op with explicit pattern guidance (NEXT_RUNTIME + NEXT_PHASE guards, dynamic-import worker module), (3) the visibility gate scope was ambiguous — locked to **all** public surfaces (homepage featured + listings + detail) so unpaid businesses can't leak via any public read. Subscription state model locked to single `payment_status` enum + date range (no parallel lifecycle status). Sponsored sort locked per-category, applying only on `/listings/[cat]`, with sponsored CASE branch above `TIER_ORDER`. Cron stale-row watchdog added (boot-time sweep of `running` rows >5 min old → `failed`).

## Findings

### Blockers (must fix before /mlabs-code)

- **`AuditMeta` union must be extended.** `packages/db/src/audit.ts` is a strict discriminated union; the plan writes subscription/sponsorship audit rows but didn't list this file as edit. Add 4 variants — see "Decisions locked" below.
- **`apps/web/src/instrumentation.ts` is not new — it already ships as a no-op with explicit pattern docs.** The cron registry boot must follow the file's existing guidance: skip when `NEXT_RUNTIME !== "nodejs"`, skip during `NEXT_PHASE === "phase-production-build"`, dynamic-import the worker module so it's not pulled into the edge bundle. Worker module must be idempotent via a module-level singleton so HMR re-mounts don't stack jobs.
- **Visibility gate scope was ambiguous in the plan.** Plan only explicitly applied it to listings; reviewed and locked to **all** public surfaces: `getFeaturedBusinesses` (homepage), `getBusinessesByCategory` + `getBusinessesByCategoryPaged` (listings), `getBusinessById` (public detail page). `getBusinessByIdIncludingArchived` is admin-only and stays unfiltered.

### Concerns (raised, decided, recorded)

- **Concern:** Sponsored sort lets a sponsored tier3 outrank an organic tier1 in the sponsored category, which changes the implicit value of tier1.
  **Decision:** Approved as the plan describes — sponsored CASE branch precedes `TIER_ORDER`. Aligned to the "paid sponsor sits at top" UX. If QA shows this hurts perceived tier1 value, the fix is one ORDER BY swap.
- **Concern:** Cron `running` rows orphan if the process crashes (no SQL error → no rollback → row stays `running`).
  **Decision:** Ship a boot-time stale-row watchdog: on cron-registry init, `UPDATE cron_run SET status='failed', error='orphan_or_crash', finished_at=now() WHERE status='running' AND started_at < now() - INTERVAL '5 minutes'`. Five lines, prevents the cron page from showing stuck "running" forever.
- **Concern:** Renewing-soon filter was described as "paid only" in the plan.
  **Decision:** Include both `payment_status='paid'` AND `'overdue'` — overdue is exactly the case the admin most needs to chase. CSV export row gains a `payment_status` column so admins can sort/filter in their spreadsheet.
- **Concern:** Multi-city plumbing for new admin ops (which city's plans/tiers?).
  **Decision:** Hardcode `const CITY_ID = "city-atlanta"` in each new op file, matching the existing pattern in `categories.ts` and `categories-admin.ts`. Multi-city is Phase 2 per PRD; all hardcodes flip together when that lands.
- **Concern:** CSV export route name and gating.
  **Decision:** Route at `/api/v1/admin/businesses/renewals.csv` (specific — leaves the generic `/export` free for F23 in S6). Gated to `admin` role (parity with the rest of the admin surface), not super_admin only.
- **Concern:** New top-level dep `node-cron`.
  **Decision:** Pre-approved in roadmap S4 block. Pin `node-cron@^4` (current stable). `@types/node-cron` as devDep.
- **Concern:** Subscription state model — one enum vs two.
  **Decision:** Single `payment_status` enum + date range. Visibility = `payment_status='paid' AND now() BETWEEN start_date AND end_date`. Daily cron flips `paid → overdue` when `end_date < now()`. No separate `status` column on `business_subscription`.
- **Concern:** Sponsored sort scope creep onto homepage featured tile.
  **Decision:** Sponsored sort applies **only** on `/listings/[cat]`. Homepage featured tile keeps its existing `TIER_ORDER + name` order. Revisit post-launch if Nisarga wants sponsor placement on /home.
- **Concern:** `payment_evidence_url` required vs optional.
  **Decision:** Optional. UI renders a "No evidence on file" warning chip when missing so reconciliation visibility stays.
- **Concern:** Overlapping `paid` subscriptions for one business.
  **Decision:** Allowed. No UNIQUE constraint. Admin UI sorts by `end_date DESC` so the latest is obvious. EXISTS gate is OR-of-rows naturally.
- **Concern:** Sponsorship `cancelled` status — who sets it?
  **Decision:** Admin action only (writes audit `business.sponsorship_cancelled`). Cron does only scheduled → active and active → expired transitions based on dates.
- **Concern:** Mobile (`apps/mobile`) exposure this sprint.
  **Decision:** Zero new surfaces. Mobile silently picks up the visibility gate because public ops apply it server-side. No mobile UI work this sprint.

### Suggestions (taken or deferred)

- **Taken:** Boot-time stale-row watchdog (see Concerns).
- **Taken:** Renewing filter expanded to include `overdue` (see Concerns).
- **Deferred:** Postmark "cron failed" alert email. Plan ships in-UI "last 20 runs" + "Run now" button; alerts wait until S5 when we wire the renewal-reminder Postmark pipeline anyway.
- **Deferred:** AppSetting-driven cron schedules. Hardcode `0 * * * *` for sponsorship rollover and `5 0 * * *` for subscription rollover. Move to AppSetting in S6 alongside the other configurable values.

## Decisions locked

Net new decisions made during review:

1. **AuditMeta variants to add** (`packages/db/src/audit.ts`):
   - `{ kind: "business.subscription_recorded"; payment_status: "paid"|"pending"|"overdue"; plan_id: string|null; end_date: string }`
   - `{ kind: "business.subscription_voided" }` (admin deletes a subscription row)
   - `{ kind: "business.sponsorship_assigned"; category_id: string; tier_id: string; end_date: string; amount_cents: number }`
   - `{ kind: "business.sponsorship_cancelled" }`
2. **Visibility gate applies to all public surfaces** — `getFeaturedBusinesses`, `getBusinessesByCategory`, `getBusinessesByCategoryPaged`, `getBusinessById`. Admin variants (`getAllBusinesses`, `getBusinessByIdIncludingArchived`) are unfiltered.
3. **Single-enum subscription state** — `payment_status` ('paid','pending','overdue'). No parallel `status` column.
4. **Sponsored sort applies only on `/listings/[cat]`**. CASE-when-sponsorship branch precedes `TIER_ORDER`.
5. **Per-category sponsorship** — `sponsorship.category_id NOT NULL` references `category.id`.
6. **`CITY_ID = "city-atlanta"`** hardcoded in new admin ops, matching existing pattern.
7. **Stale-cron-run watchdog** at boot.
8. **Renewing-soon filter includes `payment_status IN ('paid','overdue')`**.
9. **CSV export at `/api/v1/admin/businesses/renewals.csv`, gated to `admin`**.
10. **`payment_evidence_url` optional** with warning chip when missing.
11. **`node-cron@^4`** + `@types/node-cron` devDep.
12. **Sponsorship `cancelled` is admin-only**; cron handles only scheduled/active/expired transitions.
13. **`instrumentation.ts` is edit-not-new**; follows the file's existing pattern docs.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is atomic (one commit).

### Task 1: Drizzle schemas + migration 0017

- **Files:**
  - `packages/db/src/schema/membership-plans.ts` (new)
  - `packages/db/src/schema/business-subscriptions.ts` (new)
  - `packages/db/src/schema/sponsorship-tiers.ts` (new)
  - `packages/db/src/schema/sponsorships.ts` (new)
  - `packages/db/src/schema/cron-runs.ts` (new)
  - `packages/db/src/schema/index.ts` (edit — re-export the 5 new schemas)
  - `packages/db/migrations/0017_*.sql` (generated)
- **What:** Define the 5 new pgTables + 3 new pgEnums (`payment_status`, `sponsorship_status`, `cron_status`). Indexes per plan: `(business_id, end_date DESC)` and `(payment_status, end_date) WHERE payment_status='paid'` on `business_subscription`; `(category_id, status, start_date, end_date)`, `(business_id)`, `(status, end_date)` on `sponsorship`; `UNIQUE (city_id, priority)` on `sponsorship_tier`; `(city_id) WHERE active=true` on `membership_plan`; `(job_name, started_at DESC)` on `cron_run`. CHECK constraints: `price_cents >= 0`, `duration_months > 0`, `end_date >= start_date`, `amount_cents >= 0`. Run `pnpm db:generate` to produce migration `0017`; do NOT hand-edit the generated SQL.
- **Acceptance:** `pnpm db:generate` produces exactly one migration file `0017_*.sql`. `pnpm db:migrate` runs cleanly on a fresh dev DB. `pnpm typecheck` passes. Schemas exported from `@aira/db/schema`.
- **Pause if:** the generated migration drops or alters any existing column (it shouldn't — all changes are net-new tables/enums — but flag if drizzle-kit emits anything destructive).

### Task 2: Validators

- **Files:**
  - `packages/validators/src/membership-plans.ts` (new)
  - `packages/validators/src/business-subscriptions.ts` (new)
  - `packages/validators/src/sponsorship-tiers.ts` (new)
  - `packages/validators/src/sponsorships.ts` (new)
  - `packages/validators/package.json` (edit — add subpath exports for the 4 new modules)
  - `packages/validators/src/index.ts` (edit — re-export the 4 new modules)
- **What:** Zod input/output schemas + types per resource. Each module exports `<Resource>Schema` (the row shape), `<Resource>CreateInputSchema`, `<Resource>UpdateInputSchema`, `<Resource>ListOutputSchema`. Dates as ISO strings. `payment_status` and `sponsorship_status` as `z.enum([...])` matching the pgEnum values. `payment_evidence_url` is `z.string().url().nullable()` on the row; **never** included in any public output schema (admin-only).
- **Acceptance:** `pnpm typecheck` passes. Subpath imports work (`import { ... } from "@aira/validators/business-subscriptions"`).

### Task 3: AuditMeta extension

- **Files:**
  - `packages/db/src/audit.ts` (edit)
- **What:** Add 4 variants to the `AuditMeta` discriminated union (exact shapes from "Decisions locked" #1). The `action` enum values are derived from `AuditMeta["kind"]` so no additional changes needed elsewhere.
- **Acceptance:** `pnpm typecheck` passes. The 4 new `kind` strings compile in `audit({ kind: ... })` call sites.

### Task 4: Service layer — membership_plans + business_subscriptions

- **Files:**
  - `packages/services/src/membership-plans/{queries.ts,service.ts,index.ts}` (new)
  - `packages/services/src/business-subscriptions/{queries.ts,service.ts,index.ts}` (new)
  - `packages/services/src/index.ts` (edit — re-export 2 new namespaces)
- **What:** Pure functions, `import "server-only"` at top, no Next imports. Membership plans: list/get/create/update/deactivate per city. Subscriptions: list by business (sort by end_date desc), get by id, create, update (incl `payment_status` + `payment_evidence_url`), delete. Renewing-soon query: `findRenewingSoon(db, { withinDays })` returns rows where `payment_status IN ('paid','overdue') AND end_date BETWEEN now() AND now() + INTERVAL N days`, joined to business + plan for the CSV output. Daily rollover helper: `rolloverExpiredSubscriptions(db)` runs the SQL `UPDATE … SET payment_status='overdue' WHERE payment_status='paid' AND end_date < now()` and returns `{ transitioned: N }`.
- **Acceptance:** `pnpm typecheck` + `pnpm test` (existing unit tests) pass. `findRenewingSoon` includes both `paid` and `overdue`.

### Task 5: Service layer — sponsorship_tiers + sponsorships + cron_runs

- **Files:**
  - `packages/services/src/sponsorship-tiers/{queries.ts,service.ts,index.ts}` (new)
  - `packages/services/src/sponsorships/{queries.ts,service.ts,index.ts}` (new)
  - `packages/services/src/cron/{queries.ts,index.ts}` (new)
  - `packages/services/src/index.ts` (edit)
- **What:** Tiers: list/get/create/update/deactivate per city with UNIQUE-priority handling (return a typed `ApiError.badRequest("sponsorship_tier.priority_taken", ...)` on conflict). Sponsorships: list by business, list by category for the sort JOIN, create, update, cancel (sets `status='cancelled'`). Rollover helpers: `transitionSponsorshipsToActive(db)` and `transitionSponsorshipsToExpired(db)` as separate SQL UPDATEs returning row counts. Cron module: `startRun(db, jobName)`, `finishRun(db, runId, status, summary?, error?)`, `claimWithAdvisoryLock(db, jobName, fn)` wrapper that acquires `pg_advisory_xact_lock(hashtextextended(jobName, 0))` inside a transaction (NOT a session-level lock — per AGENTS.md anti-pattern), `sweepStaleRunningRuns(db)` that flips orphan `running` rows older than 5 min to `failed`.
- **Acceptance:** Typecheck + tests pass. Advisory lock is `pg_advisory_xact_lock` (transaction-scoped). Stale sweep returns `{ swept: N }`.

### Task 6: Visibility gate + sponsored sort in businesses/queries.ts

- **Files:**
  - `packages/services/src/businesses/queries.ts` (edit)
- **What:** Add a shared SQL fragment `VISIBLE_PREDICATE` = EXISTS subquery selecting from `business_subscription` where `business_id = businesses.id AND payment_status='paid' AND now() BETWEEN start_date AND end_date`. Apply to `getFeaturedBusinesses`, `getBusinessesByCategory`, `getBusinessesByCategoryPaged`, `getBusinessById`. Do **not** apply to `getAllBusinesses` or `getBusinessByIdIncludingArchived` (admin paths). In `getBusinessesByCategoryPaged`, add a LEFT JOIN against `sponsorship` filtered by `status='active' AND category_id = (SELECT id FROM category WHERE slug = $1) AND now() BETWEEN start_date AND end_date`, plus a LEFT JOIN against `sponsorship_tier`. Sort: `CASE WHEN sponsorship.id IS NOT NULL THEN 0 ELSE 1 END ASC, sponsorship_tier.priority ASC NULLS LAST, sponsorship.amount_cents DESC NULLS LAST, TIER_ORDER, businesses.name ASC`. Non-paginated `getBusinessesByCategory` gains the same sponsored sort.
- **Acceptance:** Typecheck passes. A business with no paid subscription disappears from /home, /listings/[cat], /listings/[cat]/[id] (returns null for getBusinessById). A sponsored business with valid dates floats to the top of its category's listing. A vitest unit test covers the predicate + sort logic.
- **Pause if:** the SQL rewrite triggers an order-by ambiguity error or a sort that visibly breaks existing `/mlabs-qa` baseline for tier1/2/3 ordering when no sponsorships are present.

### Task 7: Payment-evidence pipeline + admin operations

- **Files:**
  - `apps/web/src/features/admin/server/evidence-pipeline.ts` (new)
  - `apps/web/src/server/operations/membership-plans.ts` (new)
  - `apps/web/src/server/operations/business-subscriptions.ts` (new)
  - `apps/web/src/server/operations/sponsorship-tiers.ts` (new)
  - `apps/web/src/server/operations/sponsorships.ts` (new)
  - `apps/web/src/server/operations/cron-admin.ts` (new)
- **What:** Evidence pipeline mirrors `business-image-pipeline.ts`: validates content-type (`image/jpeg|png|webp|application/pdf`), max 5MB, Sharp resize for images (1200×1200 contain, JPEG q85), PDF passthrough (bytes verbatim), stores at `business-subscriptions/<subscriptionId>/<uuid>.<ext>`. Best-effort delete on subscription removal. defineOperation files use `permission: "admin"`, hardcode `CITY_ID = "city-atlanta"` where city scoping applies, write audit on every state-changing handler (4 new AuditMeta variants).
- **Acceptance:** Typecheck passes. `processAndStoreEvidence` rejects oversized + wrong-MIME with typed errors. Every admin write op calls `audit({ kind, target, meta })` before returning.

### Task 8: Route handlers + CSV export

- **Files:**
  - `apps/web/src/app/api/v1/admin/membership-plans/{route.ts,[id]/route.ts}` (new)
  - `apps/web/src/app/api/v1/admin/sponsorship-tiers/{route.ts,[id]/route.ts}` (new)
  - `apps/web/src/app/api/v1/admin/businesses/[id]/subscriptions/{route.ts,[subId]/route.ts,[subId]/evidence/route.ts}` (new)
  - `apps/web/src/app/api/v1/admin/businesses/[id]/sponsorships/{route.ts,[spId]/route.ts}` (new)
  - `apps/web/src/app/api/v1/admin/businesses/renewals.csv/route.ts` (new)
  - `apps/web/src/app/api/v1/admin/cron/{route.ts,[job]/run/route.ts}` (new)
- **What:** Each route is a thin adapter calling `defineOperation.runFromRequest(req)` from the matching op file. Multipart routes (evidence upload) use the inline admin-auth pattern from `business-image-pipeline` route (getSessionFromHeaders + role check + adminSessionIsStale, return `ApiError.forbidden("Admin access required").toResponse()` on fail). CSV route streams `text/csv` with `Content-Disposition: attachment; filename="renewals-<YYYY-MM-DD>.csv"`. Columns: `business_id, business_name, plan_name, payment_status, end_date, days_remaining, contact_phone, contact_email, payment_evidence_url`.
- **Acceptance:** Each route responds with the expected status/shape via curl against the running dev server. CSV downloads with the correct headers. Cron `[job]/run` POST returns the new `cron_run` row's JSON.

### Task 9: Cron registry + wire-up via instrumentation.ts

- **Files:**
  - `apps/web/src/lib/cron/registry.ts` (new)
  - `apps/web/src/lib/cron/sponsorship-status-rollover.ts` (new)
  - `apps/web/src/lib/cron/subscription-status-rollover.ts` (new)
  - `apps/web/src/instrumentation.ts` (edit)
  - root `package.json` (edit) + relevant `pnpm-lock.yaml` (auto)
- **What:** Add `node-cron@^4` + `@types/node-cron` devDep. Registry exports `startCrons()` — module-level boolean guards re-mount, runs `sweepStaleRunningRuns(db)` once on boot, then registers `cron.schedule("0 * * * *", sponsorshipHandler)` and `cron.schedule("5 0 * * *", subscriptionHandler)`. Each handler wraps the body in `claimWithAdvisoryLock(db, jobName, async (tx) => { ... write transitions ... })`, then `finishRun(db, runId, "succeeded", summary)` on success, `"failed"` with `error` on catch. `instrumentation.ts.register()` does `if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return; const { startCrons } = await import("@/lib/cron/registry"); await startCrons()`. SIGTERM handler in registry stops the cron tasks gracefully.
- **Acceptance:** `pnpm dev` starts without scheduling any cron (dev guard). `pnpm build && pnpm start` (or Replit prod start) registers 2 jobs visible in `/admin/cron`. Manual "Run now" POST against either job produces a new `cron_run` row that transitions through `running → succeeded` (or `skipped` if the advisory lock was held). Stale-row sweep runs at boot — verify by inserting a fake `running` row >5 min old before boot, confirm it's `failed` after.
- **Pause if:** `node-cron`'s scheduling semantics on Replit's Reserved VM don't fire as expected (e.g. timezone differences vs UTC) — flag and let the user decide between fixing the cron expression or switching to `croner`.

### Task 10: Admin Membership Plans CRUD pages

- **Files:**
  - `apps/web/src/app/admin/membership-plans/page.tsx` (new)
  - `apps/web/src/app/admin/membership-plans/new/page.tsx` (new)
  - `apps/web/src/app/admin/membership-plans/[id]/page.tsx` (new)
  - `apps/web/src/app/admin/membership-plans/_components/plan-form.tsx` (new)
- **What:** List page reads `listMembershipPlansOp` server-side, renders rows with name / price / duration / active. New + Edit pages reuse `plan-form.tsx` (controlled inputs, dollar-input that stores cents, Save button calls POST or PATCH via `apiClient`). Match the flat layout pattern (no modals) the admin pages already use.
- **Acceptance:** Create → list reflects new row. Edit → list reflects update. Deactivate → list shows the row as inactive. `pnpm typecheck` passes.

### Task 11: Admin Sponsorship Tiers CRUD pages

- **Files:**
  - `apps/web/src/app/admin/sponsorship-tiers/page.tsx` (new)
  - `apps/web/src/app/admin/sponsorship-tiers/new/page.tsx` (new)
  - `apps/web/src/app/admin/sponsorship-tiers/[id]/page.tsx` (new)
  - `apps/web/src/app/admin/sponsorship-tiers/_components/tier-form.tsx` (new)
- **What:** Same shape as Task 10. The form includes a `priority` number input with help text ("Lower = better position"). Unique-priority conflict surfaces inline ("Priority N is already used by tier X").
- **Acceptance:** Same as Task 10. Priority collision shows the typed error inline, not a generic 500.

### Task 12: Subscriptions + Sponsorships sections on business edit page

- **Files:**
  - `apps/web/src/features/admin/components/subscriptions-section.tsx` (new)
  - `apps/web/src/features/admin/components/sponsorships-section.tsx` (new)
  - `apps/web/src/features/admin/components/business-detail.tsx` (edit — mount the 2 sections)
- **What:** Subscriptions section: lists rows sorted by `end_date DESC` with payment_status chip + "No evidence" warning when missing. "Add subscription" inline form picks a plan (auto-fills end_date = start_date + duration_months), payment_status, evidence upload (react-dropzone reuse), notes. Sponsorships section: lists rows with category + tier + dates + amount + status chip. "Add sponsorship" form. Both sections use the existing flat layout (no modals).
- **Acceptance:** Add/edit/delete each resource works end-to-end. Evidence upload shows progress, then refreshes the row's evidence chip. Cancel sponsorship transitions the chip to "Cancelled" + writes audit row.

### Task 13: Admin Businesses list — Subscription column + renewing filter + CSV button

- **Files:**
  - `apps/web/src/app/admin/businesses/page.tsx` (edit)
  - `apps/web/src/app/admin/businesses/_components/renewing-filter.tsx` (new — small client component)
  - `apps/web/src/server/operations/businesses-admin.ts` (edit — `listAllBusinessesAdminOp` widened to accept `renewing` param, returns latest subscription per business)
- **What:** Add a "Subscription" column showing the chip for the latest subscription's `payment_status` (or "—" when none). Add `?renewing=N` dropdown (7/14/30 days) — when set, the list is filtered to businesses whose latest subscription `end_date` falls in `(now(), now() + N days]` AND `payment_status IN ('paid','overdue')`. Add a "Download CSV" button that links to `/api/v1/admin/businesses/renewals.csv?renewing=<N>`.
- **Acceptance:** Filter narrows the list correctly; the CSV download contains the same rows. "Subscription" column shows the right chip for businesses with multiple overlapping subs (the one with latest `end_date` wins).

### Task 14: Admin Cron page + sidebar nav + roadmap update

- **Files:**
  - `apps/web/src/app/admin/cron/page.tsx` (new)
  - `apps/web/src/app/admin/cron/_components/run-now-button.tsx` (new)
  - `apps/web/src/app/admin/_components/admin-sidebar.tsx` (edit — add Membership Plans, Sponsorship Tiers, Cron nav items)
  - `roadmap.md` (edit — flip S4 status to ✅ done at sprint end with brief recap; flagged here so /mlabs-code does it at the right moment)
- **What:** Cron page lists registered jobs from the registry, with their last 20 runs from `cron_run` (latest first), and a "Run now" button per job that POSTs to `/api/v1/admin/cron/[job]/run` and inserts the new row at the top of the list. Sidebar gains 3 new entries grouped under "Admin → Catalog" (Membership Plans, Sponsorship Tiers) and "Admin → System" (Cron). Roadmap update happens as the last commit of the sprint.
- **Acceptance:** Cron page renders both jobs. Run-now triggers a row that progresses to `succeeded` (or `skipped` if lock-blocked). Sidebar shows the 3 new items. Roadmap reflects S4 done.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

- **none** — all locks captured in "Decisions locked".
