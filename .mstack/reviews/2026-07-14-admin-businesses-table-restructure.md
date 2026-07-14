# Review: admin businesses table restructure — plan name + due-date column, drop owner/contact

**Date:** 2026-07-14
**Slug:** 2026-07-14-admin-businesses-table-restructure
**Plan reviewed:** [2026-07-14-admin-businesses-table-restructure.md](../plans/2026-07-14-admin-businesses-table-restructure.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** /mlabs-review (framer@millionlabs.co.uk, via /mlabs-auto)

---

## Summary

Plan is ready to implement. Verified against the actual code: `business_subscription` and `membership_plan` are the correct pg table names (singular, matching the raw-SQL alias approach), `business_subscription.plan_id` FK exists with `onDelete: "set null"`, `AdminBusinessItemSchema` sits at `businesses-admin.ts:36`, the transform `.map()` sits at `businesses-admin.ts:168`, and the page's `<thead>`/`<tbody>` structure at `page.tsx:111-233` matches the plan's description. Two atomic commits (server + UI), no schema migration, no new deps. The three open questions in the plan resolve to their recommended answers (below).

## Findings

### Concerns (raised, decided, recorded)

- **Concern:** Fallback text for null `latest_plan_name` — plain foreground or muted?
  **Decision:** Muted `"—"` (matches existing Verified/Owner/Contact-person "—" conventions in this same table). Plan name itself renders in plain foreground; only the fallback is muted. Consistent with the page's existing empty-cell language.

- **Concern:** Column width for Subscription cell — plan names could span a wide range ("Basic" vs "Founding Member Annual Plan").
  **Decision:** No explicit `max-w-*` / `truncate` in this task. Add in a follow-up only if wrapping becomes a scan problem. Adding truncation preemptively is speculative width management.

- **Concern:** Payment-status signal preservation after removing the AdminBadge.
  **Decision:** Preserved via the Due-date column's color coding (isOverdue → destructive bold uppercase, isCritical → destructive semibold, else muted). Same three visual states the badge conveyed; fewer pixels. Locked.

- **Concern:** Row still needs the Overdue background + red left-border treatment.
  **Decision:** Preserved unchanged — `isOverdue` derives from `latest_subscription_days_remaining` which stays on the row schema.

## Decisions locked

Beyond the plan's own three open questions (all locked at their recommended values):

- `owner` and `contact_person` fields stay on `AdminBusinessItemSchema` / `BusinessAdminSchema` response. Only the UI display is removed. The `?owner=has|none` server-side filter continues to work for URL-only callers.
- Renewals CSV route and its column shape are untouched.
- Renewing filter (`?renewing=N`) semantics unchanged — filter runs over `subMap` which after this change also contains `plan_name`, but the predicate only reads `payment_status` and `end_date`.
- The `<Link>` row-click overlay (`after:absolute after:inset-0`) preserved.
- No new op, no new route, no schema migration, no new deps.

## Implementation plan

### Task 1: extend list op with plan_name (server)

- **Files:** `apps/web/src/server/operations/businesses-admin.ts` (edit)
- **What:** (1) Alias `businessSubscriptions` to `bs` and `LEFT JOIN membership_plan mp ON bs.plan_id = mp.id` inside the `DISTINCT ON` raw-SQL query at lines 122–131, adding `mp.name AS plan_name` to the projection and its TypeScript row-type. (2) Add `latest_plan_name: z.string().nullable()` to `AdminBusinessItemSchema` at line 36. (3) Extend the handler's `.map()` at line 168 to set `latest_plan_name: sub?.plan_name ?? null` on every row (covers both "no subscription" and "subscription with orphaned plan_id" cases with a single `null`).
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` clean.
  - The raw SQL selects `bs.business_id, bs.payment_status, bs.end_date, mp.name AS plan_name` and `LEFT JOIN`s `membership_plan mp ON bs.plan_id = mp.id`.
  - `AdminBusinessItemSchema` includes `latest_plan_name: z.string().nullable()`.
  - Every mapped row carries `latest_plan_name` (never undefined) — verified by the runtime output schema validation in `defineOperation` accepting the response.

### Task 2: restructure businesses table columns (UI)

- **Files:** `apps/web/src/app/admin/businesses/page.tsx` (edit)
- **What:** (1) `<thead>` at lines 112–120 becomes six columns: Name | Category | Subscription | Due date | Verified | Status (Owner + Contact person `<th>` cells removed; Due date `<th>` inserted after Subscription). (2) Subscription `<td>` (lines 157–182) simplifies to `<td className="px-4 py-3 text-foreground">{b.latest_plan_name ? b.latest_plan_name : <span className="text-muted-foreground">—</span>}</td>`. (3) Insert new Due-date `<td>` after it: renders nothing when `endDate === null`, otherwise renders `expiryLabel(days, endDate)` with the existing color-coding (`isOverdue` → destructive bold uppercase, `isCritical` → destructive semibold, else muted). (4) Delete the Owner `<td>` block (lines 183–191) and Contact-person `<td>` block (lines 192–200). (5) Preserve the `<Link>` row-click overlay on the Name cell, the `<tr>` overdue treatment, and the `PaymentStatus` type import (may become unused — drop if so).
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` clean.
  - `pnpm --filter @aira/web lint` — 0 errors (including no unused imports left from the deleted AdminBadge use — verify AdminBadge import stays used for the Status column at line 227–232).
  - `pnpm --filter @aira/web build` succeeds.
  - Manual render check on the route confirms six columns in the order Name | Category | Subscription | Due date | Verified | Status.
  - Overdue rows still show the destructive left-border shadow + faint red row background.
  - Renewing CSV download button still renders when `?renewing=N` is set.

## Open questions

None. All three plan-level open questions locked at their recommended answers above; the two structural concerns raised in review (fallback style, width management) resolved inline.
