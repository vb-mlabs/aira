# Plan: F22 — Admin audit log UI (minimal scope)

**Date:** 2026-06-15
**Slug:** audit-log-ui
**Status:** reviewed
**Author:** vb-mlabs

---

## Problem

`/admin/audit` exists, knows about every `audit_log` row, paginates them
by date, and renders one row per entry. But the right-most "Detail"
column displays `JSON.stringify(metadata)` raw — a wall of
`{"kind":"user.role_changed","from":"end_user","to":"admin","client":"web"}`
strings. And the only filter is a date range.

Three problems for an operator (admin/super_admin) trying to investigate
"what happened":

1. **Unreadable.** Raw JSON forces the operator to mentally parse every
   row. "Did role change to admin or from admin?" requires reading
   keys.
2. **Unfindable.** No way to filter to "everything Asha did last week"
   (no actor filter), "everything that touched community posts" (no
   target-type filter), or "every role change" (no action filter).
3. **Information-rich, navigation-poor.** Each row points at a
   `target_id` (e.g. a `business_subscription` id) but the operator
   has to copy-paste it into another tab to see what the row was
   actually about.

**Who benefits:** the AIRA admin / operator / dev investigating prod
state. No end-user behaviour changes.

**Success:** the admin opens `/admin/audit`, picks an actor from a
typeahead, drops the target-type to "business_subscription", and sees
a clean table of rows each saying *"Recorded payment (paid) until
2026-09-12"* with the subscription's parent business name as a link
into `/admin/businesses/[id]`. Filters compose with date range and
pagination. Picking a target id from a row's link lands them on the
right detail page.

---

## Scope

**In:**
- Three new filter inputs on `/admin/audit`:
  - **Actor typeahead** — combobox calling
    `GET /api/v1/admin/users?q=…` for live search; locks to a
    `actor_id` (UUID) on selection.
  - **Target-type dropdown** — closed list of the 7 known types
    (`user`, `business`, `business_subscription`, `sponsorship`,
    `community_post`, `app_setting`, `session`).
  - **Action dropdown** — closed list of the 24 known
    `AuditMeta.kind` values grouped by domain prefix
    (`<optgroup label="User events">`, etc.).
- Backend changes to `ListAuditInputSchema` + `listAudit` service to
  accept `actor_id?: string`, `target_type?: string`,
  `action?: string`. Each maps to a `WHERE` clause using the existing
  indexes (`audit_log_actor_idx`,
  `audit_log_target_idx (target_type, target_id)`,
  `audit_log_at_idx`).
- New `apps/web/src/features/admin/audit/render-detail.tsx` exporting
  `renderAuditDetail(action, metadata)` — a single React component with
  one `switch (kind)` case per variant returning a one-line summary.
  Each variant produces ~10–30 words of plain English. Links
  embedded inline where a known detail page exists.
- Helper `renderAuditTarget({ target_type, target_id, metadata })` that
  resolves the row's target to a Link when applicable
  (`user → /admin/users/<id>`,
  `business → /admin/businesses/<id>`,
  `business_subscription → /admin/businesses/<business_id>` — the
  business_id is recoverable through a new join we'll add to
  `listAudit` so we don't need a second query per row,
  `community_post → /admin/community` (no detail page yet — fallback
  to listing),
  `sponsorship → /admin/businesses/<business_id>` if join surfaces it,
  `app_setting` and `session → no link, just the short id`).
- Update `audit-table.tsx` to consume the new render helpers and the
  new filter UI; URL-driven filter state.
- UTC-stable date formatters on the "When" column (the existing
  `toLocaleString()` is one of the surfaces the 2026-06-14 hydration
  lesson would bite).
- Keep page size at 30 (`ADMIN_AUDIT_PAGE_SIZE`).

**Out (deferred):**
- CSV export — locked deferral 2026-06-15 (re-open when a real
  external-sharing ask appears).
- `ip_address` column on `audit_log` + backfill + capture at every
  `createAudit` callsite — defer until an incident demands it (per
  2026-06-15 roadmap).
- Audit log retention cron (90-day cleanup of `signed_in*` events,
  keep role/ban/revoke forever) — separate TODOS item, will be its
  own plan.
- Free-text search across actor email + target_id + metadata — not
  worth perf + GIN-index cost until a workflow asks for it. The three
  structured filters cover ≥90% of "find what happened".
- Audit log surface in mobile — admin console is desktop-first.
- New audit kinds — F22 is rendering existing variants, not adding
  new ones.
- Tests for the rendering switch beyond a smoke spec confirming every
  kind has a case (no snapshot tests of the exact copy — copy is
  free to evolve).

---

## Approach

### Filters: query → service → URL

The page stays an RSC. New `searchParams`:

```
?since=…&until=…&page=…
&actor_id=<uuid>
&target_type=<enum>
&action=<kind>
```

All filters compose with `AND`; missing means "any". `ListAuditInputSchema`
in `packages/validators/src/admin.ts:72` gains three optional fields:

```ts
actor_id: z.string().optional(),
target_type: z.enum([
  "user", "business", "business_subscription",
  "sponsorship", "community_post", "app_setting", "session"
]).optional(),
action: z.enum(KNOWN_ACTIONS).optional(),
```

`KNOWN_ACTIONS` is a `const` array of the 24 `AuditMeta.kind` values,
extracted at module top so the runtime enum and the TS union stay in
sync. We **do not** derive it from `AuditMeta` (Zod can't see the TS
type); we maintain a literal array next to the union in
`packages/db/src/audit.ts` and re-export it for use by the validator
(no Drizzle import — the array is plain strings).

Service-side: `listAudit` in `packages/services/src/admin/queries.ts`
already builds `conditions` array from `since` + `until`. Append three
more `if (input.actor_id) conditions.push(eq(audit_log.actor_id, input.actor_id))`
lines. The existing `(target_type, target_id)` composite index covers
the `target_type` filter; the `at` and `actor_id` indexes cover the
others. No new indexes.

To make `business_subscription` targets navigable, the `listAudit`
select gains a `LEFT JOIN business_subscription` on `target_id` when
`target_type = 'business_subscription'`. Same trick for
`sponsorship → business_subscription` if we want full chain (skip for
MVP — sponsorship rows have a `business_id` directly). Add:

```sql
LEFT JOIN business_subscription bs
  ON audit_log.target_type = 'business_subscription'
  AND bs.id = audit_log.target_id
LEFT JOIN sponsorship sp
  ON audit_log.target_type = 'sponsorship'
  AND sp.id = audit_log.target_id
```

`AdminAuditRowSchema` gains an optional `target_business_id` field
populated from `bs.business_id` or `sp.business_id`. The render helper
resolves the link from this field when present.

### Detail rendering: one function, 24 cases

`apps/web/src/features/admin/audit/render-detail.tsx`:

```tsx
import type { AuditMeta } from "@aira/db/audit"
// (re-exported through a server-safe re-export to avoid pulling
//  Drizzle into a client component; only the TYPE is needed.)

export function renderAuditDetail(
  action: string,
  metadata: unknown,
): React.ReactNode {
  const m = metadata as AuditMeta & { client?: "web" | "mobile" }
  switch (m.kind) {
    case "user.role_changed":
      return <>Changed role from <code>{m.from}</code> to <code>{m.to}</code></>
    case "user.banned":
      return m.reason
        ? <>Banned (reason: {m.reason})</>
        : <>Banned (no reason provided)</>
    case "user.unbanned":
      return <>Unbanned</>
    case "business.archived":
      return <>Archived business</>
    case "business.subscription_recorded":
      return (
        <>Recorded subscription as <em>{m.payment_status}</em> until{" "}
          {formatDate(m.end_date)}
          {m.plan_id && <>, plan <code>{m.plan_id.slice(0, 8)}</code></>}
        </>
      )
    case "business.subscription_followup":
      return (
        <>Logged <em>{m.outcome}</em> follow-up
          {m.note ? <> — &ldquo;{m.note}&rdquo;</> : null}
          {m.scheduled_next ? <>, next attempt {formatDate(m.scheduled_next)}</> : null}
        </>
      )
    // … one case per kind. 24 cases total.
    default:
      // Type-narrowed default — should never fire if AuditMeta and the
      // switch stay in sync. Renders raw kind so the operator sees the
      // unrendered case rather than a blank cell.
      return <code className="text-muted-foreground">{action}</code>
  }
}
```

The exhaustiveness gate: a TypeScript `case _: never = m` in `default`
catches every new variant at compile time once added to `AuditMeta`,
forcing a render case. Without this gate, F23′'s recent addition
would have silently fallen through to the raw JSON.

### Target linking: small resolver

`apps/web/src/features/admin/audit/render-target.tsx`:

```tsx
export function renderAuditTarget(row: AdminAuditRow): React.ReactNode {
  if (!row.target_type || !row.target_id) return <span>—</span>
  const shortId = row.target_id.slice(0, 8)
  switch (row.target_type) {
    case "user":
      return <Link href={`/admin/users/${row.target_id}`}><code>{shortId}</code></Link>
    case "business":
      return <Link href={`/admin/businesses/${row.target_id}`}><code>{shortId}</code></Link>
    case "business_subscription":
      return row.target_business_id
        ? <Link href={`/admin/businesses/${row.target_business_id}`}><code>{shortId}</code></Link>
        : <code>{shortId}</code>
    case "sponsorship":
      return row.target_business_id
        ? <Link href={`/admin/businesses/${row.target_business_id}`}><code>{shortId}</code></Link>
        : <code>{shortId}</code>
    case "community_post":
      return <Link href={`/admin/community`}><code>{shortId}</code></Link>
    case "app_setting":
      // target.id is the AppSetting key (e.g. "reminder_schedule"), not
      // a UUID — render in full, no link (settings index has no per-key
      // detail page in MVP).
      return <code>{row.target_id}</code>
    case "session":
      // session ids are noise; admin doesn't need to inspect them.
      return <span className="text-muted-foreground">session</span>
    default:
      return <code>{shortId}</code>
  }
}
```

### Filter UI

`apps/web/src/features/admin/audit/filter-bar.tsx` (client component):

- `ActorTypeahead` — debounced (300ms) input firing `apiClient.get('/api/v1/admin/users?q=…')`, dropdown of up to 10 matches showing name + email. Selecting locks `actor_id`, fills the input with the chosen name + email, and updates URL via `router.push`. Clear button reverts to "all actors".
- `TargetTypeSelect` — a plain `<select>` with the 7 options + "All".
- `ActionSelect` — a plain `<select>` with optgroups by domain (`User events`, `Business events`, `Community events`, `Settings events`, `Session events`). Each option's label is humanised (e.g. `user.role_changed` → "Role changed").

The Filter button on the existing form submits the URL via plain GET
(server-side filter parsing); the typeahead/dropdowns update URL on
change without requiring the Filter button — the existing
`form method="get" action="/admin/audit"` becomes an "Apply filters"
fallback for users on slow JS.

### Why this approach

- **No new tables, columns, migrations, indexes, or deps.** Pure
  service + UI work — leverages existing schema fully.
- **`AuditMeta` discriminated union is the source of truth.** The
  render switch stays exhaustive via TS's `never` guard. Adding a
  new `kind` in a future feature forces a render case PR-time, not
  runtime.
- **Typed boundary preserved.** Zod gates the action/target-type
  filters at the input boundary; the dropdown's options come from the
  same `KNOWN_ACTIONS` array. UI + validator never drift.

**Alternatives considered:**

- **Expandable-row rendering** — rejected for this scope. The
  single-line render plus the deep-link to detail pages gives the
  operator a low-friction "scan + click" flow; expandable disclosures
  add interaction state without clear win. Revisit if operator
  feedback says "I needed the raw JSON one time".
- **Free-text search** — rejected, deferred. `ILIKE` on jsonb
  metadata without a GIN index is slow; with a GIN index it's a
  schema change we don't need pre-launch. Three structured filters
  cover ≥90% of "find what happened" workflows.
- **Action dropdown as chip strip** — rejected. 24 chips wrap into a
  visual mess. A single `<select>` with optgroups is more compact
  and scales.
- **Render helper in `@aira/api` or `packages/services`** —
  rejected. Renderer is web-only (admin console is web-first); pulling
  React into a service package introduces a layering violation. Keep
  it in `apps/web/src/features/admin/audit/`.

---

## Data model changes

**None.** No new tables, columns, migrations, or indexes. The existing
indexes (`audit_log_actor_idx`, `audit_log_target_idx` on
`(target_type, target_id)`, `audit_log_at_idx`) cover every new
filter clause. The `AdminAuditRowSchema` validator gains an optional
`target_business_id` field, populated by the new LEFT JOINs in
`listAudit`.

`KNOWN_ACTIONS` and `KNOWN_TARGET_TYPES` are plain string arrays added
to `packages/db/src/audit.ts` alongside `AuditMeta` — they live with
the union so adding a new kind forces an array update next to the
type. No build-time codegen.

---

## Files to touch

**New:**
- `apps/web/src/features/admin/audit/render-detail.tsx` — 24-case
  switch returning `React.ReactNode` per `AuditMeta.kind`. Type-guard
  `case _: never` exhaustiveness check in the default branch.
- `apps/web/src/features/admin/audit/render-target.tsx` — short id +
  Link based on `target_type`, using new `target_business_id` field.
- `apps/web/src/features/admin/audit/filter-bar.tsx` (client) — actor
  typeahead, target-type select, action select. URL-driven via
  `router.push`.
- `apps/web/src/features/admin/audit/actor-typeahead.tsx` (client) —
  debounced search hitting `listUsersOp` via `apiClient`.

**Edit:**
- `packages/validators/src/admin.ts`:
  - Extend `ListAuditInputSchema` with `actor_id` / `target_type` /
    `action` optional fields.
  - Extend `AdminAuditRowSchema` with optional `target_business_id:
    z.string().nullable()`.
- `packages/db/src/audit.ts`:
  - Add `export const KNOWN_AUDIT_ACTIONS = [...] as const` (24
    literal strings) and `KNOWN_AUDIT_TARGET_TYPES = [...] as const`
    (7).
  - Compile-time assertion that every `AuditMeta["kind"]` appears in
    `KNOWN_AUDIT_ACTIONS` (`type _Check = AuditMeta["kind"] extends
    (typeof KNOWN_AUDIT_ACTIONS)[number] ? true : never`).
- `packages/services/src/admin/queries.ts`:
  - `listAudit`: append `actor_id` / `target_type` / `action`
    conditions; add two LEFT JOINs (business_subscription,
    sponsorship); populate `target_business_id` via COALESCE.
  - `toAdminAuditRow` (or call site) — map new field.
- `apps/web/src/server/operations/admin.ts`:
  - `listAuditOp` already accepts the schema; no change needed
    (defineOperation reads from input).
- `apps/web/src/app/admin/audit/page.tsx`:
  - Parse the three new searchParams.
  - Pass them into `apiServerFetch(listAuditOp)`.
  - Replace the inline date-only form with the new `<FilterBar>`
    (renders all five inputs — since, until, actor, target-type,
    action — plus Apply + Clear buttons).
- `apps/web/src/features/admin/components/audit-table.tsx`:
  - Replace the raw `JSON.stringify(row.metadata)` call with
    `renderAuditDetail(row.action, row.metadata)`.
  - Replace the target id rendering with `renderAuditTarget(row)`.
  - Replace `new Date(row.at).toLocaleString()` with a stable UTC
    formatter + `suppressHydrationWarning` (mirrors the 2026-06-14
    pattern).
- `apps/web/src/features/admin/index.ts`:
  - Re-export `renderAuditDetail`, `renderAuditTarget`, `FilterBar`
    if any consumer outside `audit/*` needs them (likely no —
    can skip).

**Untouched:**
- `packages/db/src/schema/audit_log.ts` — no schema change.
- The `audit_log` table itself.
- Every `createAudit` callsite.

---

## Edge cases

- **Filter combos with no matches** (e.g. `actor=admin@x.com` +
  `action=user.role_changed` for an admin who's never changed a
  role) — empty table, friendly "No audit entries match these
  filters" message. Existing `emptyMessage` prop on `AuditTable`
  already supports this; just pass a more specific message based on
  which filters are active.
- **Actor typeahead with stale `actor_id`** — admin pastes a UUID
  for a deleted user. `actor_id` filter still works (audit_log uses
  `ON DELETE SET NULL` so the actor_id can point at a now-null user).
  The typeahead resolves names from the join, so the row shows
  "system" if actor was deleted. Filter still matches by id.
- **Filter URL with an action kind that no longer exists** (e.g. a
  bookmarked URL after a future code change removed an audit
  variant) — Zod rejects the unknown action at the input boundary
  and shows a friendly 400. Page falls back to no-action-filter via
  try-around the parse on the page (catch → log warn → ignore the
  filter).
- **`target_type=community_post` with a now-deleted post** —
  `target_id` link points at `/admin/community` (no per-post detail
  page); the listing won't show the deleted post. Acceptable for
  MVP — the deleted post's snapshot is in the audit row's metadata
  anyway.
- **`target_type=app_setting`** target.id is the AppSetting key
  (e.g. `"reminder_schedule"`), not a UUID. The render-target
  helper renders it in full without a link — settings page has
  per-key URLs but not currently scrollable to by hash.
- **Filter form on slow JS** — the Apply button still does a plain
  GET form submit; the typeahead + dropdowns gracefully degrade to
  pre-filled values that the form submits. No JS-required
  interactions.
- **Pagination with active filters** — Next/Prev preserve all
  current filters via `URLSearchParams` (existing
  `PaginationLink` helper already does this for since/until; extend
  to carry actor_id/target_type/action).
- **`AuditMeta.kind` added without updating `KNOWN_AUDIT_ACTIONS`** —
  TypeScript `_Check` assertion fails at compile time. Forces the
  PR to add the array entry (same place where the union grows).
- **`AuditMeta.kind` added without updating `renderAuditDetail`** —
  the `never` guard in the default branch fires a TS error. PR
  can't merge.
- **Action dropdown has 24 options** — usable, scrollable. Grouped
  by domain into `<optgroup>` keeps cognitive load manageable.
- **Hydration on the "When" column** — the existing code calls
  `toLocaleString()` which differs Node vs browser locale defaults.
  Same trap that bit us 2026-06-14. Fix: stable UTC formatter +
  `suppressHydrationWarning`.

---

## Acceptance criteria

- [ ] `pnpm typecheck` passes; `pnpm lint` passes; `pnpm test` passes.
- [ ] Browsing to `/admin/audit` with no filters renders the existing
  view with the new readable detail column and target link column.
- [ ] Every row's "Detail" column renders human-readable text per
  `AuditMeta.kind`. No raw JSON anywhere unless the kind is
  unrecognised (which can't happen if the TS exhaustiveness gate
  fires).
- [ ] Selecting an actor in the typeahead filters the table to only
  that actor's rows; URL gains `?actor_id=…`; pagination preserves it.
- [ ] Selecting a target-type filters the table; same behaviour on
  URL + pagination.
- [ ] Selecting an action filters the table; same behaviour on URL +
  pagination.
- [ ] All three filters compose with each other and with the
  existing `since`/`until` date filter (`AND` semantics).
- [ ] Target ids linking: a `business` row's id links to
  `/admin/businesses/<id>`; a `business_subscription` row's id
  links to `/admin/businesses/<business_id>` (resolved through the
  new join); a `user` row's id links to `/admin/users/<id>`. An
  `app_setting` row renders the key as text (no link). A `session`
  row renders "session" muted text (no id, no link).
- [ ] Adding a new fictional variant to `AuditMeta` triggers TS
  errors in both `KNOWN_AUDIT_ACTIONS` (assertion) and
  `renderAuditDetail` (`never` guard). Confirmed via a one-line
  spike during code review.
- [ ] Empty state shows a friendly message that references the
  active filter combination (e.g. "No audit entries match these
  filters — clear filters or expand the date range").
- [ ] No hydration warnings in browser console on
  `/admin/audit?…` (regression check from 2026-06-14).
- [ ] The 24 action dropdown options are grouped by domain prefix
  into `<optgroup>` blocks.

---

## Open questions

For `/mlabs-review` to resolve before implementation:

1. **Actor typeahead — debounce window.** Plan suggests 300ms. The
   community search uses 300ms. Lock 300ms?
2. **Should the action dropdown labels be auto-derived from the
   kind string** (e.g. `user.role_changed → "Role changed"`) **or
   hand-curated** for friendlier copy ("User role changed",
   "Subscription marked paid")? Plan leans auto-derive; hand-curate
   if a few obvious ones read badly.
3. **Pagination behaviour on filter change.** When the operator
   adds a filter mid-pagination (e.g. on page 3 with no filters,
   they add an actor), do we reset to page 1 or keep page 3? Plan
   leans reset-to-1 (matches most filter UIs).
4. **`target_business_id` field name on the row schema** — naming
   ambiguous since it serves two target types (subscription +
   sponsorship). Lock as `target_business_id` (truthful) or use
   `linked_business_id` (clearer)? Lean `target_business_id`.
5. **Render for `user.signed_in` / `user.signed_in_failed` /
   `user.signed_up`.** These are high-volume rows that may dominate
   the table once Sprint 1's auth-event audit shipping is fully
   live. Should these get a slightly muted/dimmed visual treatment
   so they don't drown out signal? Plan leans yes — render in
   `text-muted-foreground`. Confirm.
6. **Target link for `target_type='user'` when actor and target are
   the same user** (e.g. a user changing their own name) — the
   render still points at the user detail page. Defensible but
   slightly redundant since the actor cell already shows them.
   Leave as-is?
