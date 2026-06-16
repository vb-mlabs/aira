# Review: F22 — Admin audit log UI (minimal scope)

**Date:** 2026-06-15
**Slug:** audit-log-ui
**Plan reviewed:** [2026-06-15-audit-log-ui.md](../plans/2026-06-15-audit-log-ui.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** vb-mlabs

---

## Summary

Plan is ready to implement. Scope is tight (filters + readable rendering;
no CSV, no `ip_address`, no retention cron). Review surfaced a layering
issue (the renderer needs `AuditMeta` from a non-`server-only` module), a
client/server boundary detail for the filter UI, and two nested-branch
sub-kinds that the plan glossed over. All six of the plan's open questions
locked in-line per auto-mode bias toward sound defaults. No blockers.
Implementation plan is four atomic tasks ordered so each commit leaves
the codebase building.

---

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** `packages/db/src/audit.ts:1` is `import "server-only"`. The
  renderer is a client component (lives under
  `apps/web/src/features/admin/audit/` and will be rendered inside the
  client `AuditTable`). `import type { AuditMeta } from "@aira/db/audit"`
  is erased at compile time so it works *today*, but it's a fragility
  trap — the `KNOWN_AUDIT_ACTIONS` runtime array the plan also wants
  *cannot* be imported from a server-only module into client code.
  **Decision:** Extract `AuditMeta` (union type) + `KNOWN_AUDIT_ACTIONS`
  (const array) + `KNOWN_AUDIT_TARGET_TYPES` (const array) to a new
  pure-TS / pure-Zod module
  `packages/validators/src/audit-meta.ts`. The `@aira/db/audit.ts`
  module re-exports `AuditMeta` so existing callers keep working
  unchanged. `audit-meta.ts` carries the compile-time assertion that
  `AuditMeta["kind"] extends (typeof KNOWN_AUDIT_ACTIONS)[number]` and
  the `KNOWN_AUDIT_TARGET_TYPES` literal array. Cross-package
  contract: validators package doesn't depend on `@aira/db` (the
  no-Drizzle-in-validators rule), and `@aira/db` already depends on
  `@aira/validators`. Layering preserved.

- **Concern:** Plan calls the filter UI a "client component" but doesn't
  pin down the React patterns. The plan's "Apply filters" fallback is
  a plain GET form, but the typeahead + dropdowns are interactive.
  **Decision:** `FilterBar` and `ActorTypeahead` are client components.
  `FilterBar` reads filter state from `useSearchParams()` and writes
  via `useRouter().push()` with `URLSearchParams` (mirrors
  `RenewingFilter` at
  `apps/web/src/app/admin/businesses/_components/renewing-filter.tsx`).
  `ActorTypeahead` debounces input via `useEffect` + `setTimeout`
  (300ms — locked in Decision 1). The Apply-button form fallback is
  dropped from the plan — it adds a parallel state path for marginal
  benefit; the dropdowns update URL directly, the typeahead commits on
  selection. Sub-100B users on no-JS aren't the audience for
  `/admin/audit`.

- **Concern:** Plan's render switch enumerates the 24 `kind` values but
  doesn't surface that two of them carry nested discriminated `reason`
  fields:
  - `session.revoked` has 5 reasons (`logout | admin | password_change
    | account_deleted | idle_timeout`).
  - `user.signed_in_failed` has 4 reasons (`bad_password |
    user_not_found | banned | email_unverified`).
  Each reason should produce a different sentence, otherwise we lose
  signal.
  **Decision:** Inside the renderer's `case "session.revoked":` and
  `case "user.signed_in_failed":` branches, nest a `switch (m.reason)`
  with a string per reason. Sample copy:
  - `session.revoked.logout` → "Signed out"
  - `session.revoked.admin` → "Session revoked by admin"
  - `session.revoked.password_change` → "Session ended (password
    changed)"
  - `session.revoked.account_deleted` → "Session ended (account
    deleted)"
  - `session.revoked.idle_timeout` → "Session timed out (30 min idle)"
  - `user.signed_in_failed.bad_password` → "Sign-in failed (bad
    password)"
  - `user.signed_in_failed.user_not_found` → "Sign-in attempt for
    unknown email"
  - `user.signed_in_failed.banned` → "Sign-in blocked (account banned)"
  - `user.signed_in_failed.email_unverified` → "Sign-in blocked (email
    not verified)"

- **Concern:** Acceptance criterion "Adding a new fictional variant to
  `AuditMeta` triggers TS errors … Confirmed via a one-line spike
  during code review" is unverifiable.
  **Decision:** Replace with two concrete acceptance criteria, both
  enforceable by source code:
  1. `audit-meta.ts` contains a type-level assertion line
     `type _ActionsCoverage = Assert<AuditMeta["kind"] extends
     (typeof KNOWN_AUDIT_ACTIONS)[number] ? true : false>` (where
     `Assert` is a tiny utility type defined inline).
  2. `render-detail.tsx`'s `default` branch types its variable as
     `never`: `const _exhaustive: never = m`. Both fire `tsc`
     errors at compile time when a new kind lacks coverage.

- **Concern:** Plan's "FilterBar" wraps three different
  filter widgets (typeahead, two dropdowns) plus the existing date
  range. Implementation could end up bulky. **Decision:** Keep
  `FilterBar` as a thin composition that renders the existing
  date inputs + new widgets in a horizontal flex layout matching the
  existing `<form>` shape. No state machine. Each child writes URL on
  change. Sub-200 LOC target — if it grows past 250 LOC,
  refactor in a follow-up.

### Suggestions (taken or deferred)

- **Suggestion taken:** Action dropdown labels — auto-derive from
  `kind` string by splitting on `.` and `_`, capitalising
  ("user.role_changed" → "Role changed" with "User events" optgroup
  label). One small override map (`packages/validators/src/audit-meta.ts`
  exports `AUDIT_ACTION_LABEL_OVERRIDES: Partial<Record<KnownAction,
  string>>` for the cases auto-derive reads badly. Initial overrides:
  `user.signed_in_failed → "Sign-in failed"`,
  `business.subscription_recorded → "Subscription recorded"`,
  `business.subscription_followup → "Renewal follow-up"`.
- **Suggestion taken:** `user.signed_in` / `user.signed_up` /
  `user.signed_in_failed` rows render in `text-muted-foreground` so
  high-volume auth events don't drown out admin actions in the
  scan. Other rows stay default contrast.
- **Suggestion taken:** Pagination resets to page 1 when any filter
  changes. Matches `/admin/community` + `/admin/users` patterns.
- **Suggestion deferred:** Free-text search across actor email +
  target_id + metadata. Locked deferral per plan.
- **Suggestion deferred:** "Self-acted target link" (when actor and
  target are the same user). Slight redundancy; leave as-is. If
  operators complain, add a `target_id === actor_id ? null : <Link>`
  guard later.

---

## Decisions locked

Net new decisions made during review (resolving the plan's six open
questions + the four concerns above):

1. **Typeahead debounce = 300ms.** Matches community search.
2. **Action labels = auto-derive + override map.** See Suggestion 1.
3. **Pagination resets to page 1 on filter change.** Matches existing
   admin patterns.
4. **Field name `target_business_id`** locked. Truthful — the column
   is the FK to a business reached transitively through the target row.
5. **Muted treatment for `signed_in*` / `signed_up`** locked.
6. **Self-acted target link** stays (acceptable redundancy).
7. **`AuditMeta` + arrays live in `packages/validators/src/audit-meta.ts`.**
   `@aira/db/audit.ts` re-exports the type. Layering: validators
   has zero Drizzle imports (already enforced by lint); db can
   depend on validators (already does).
8. **Filter UI = client components reading/writing URL via
   `useSearchParams` + `useRouter().push`** matching `RenewingFilter`
   pattern. No form-fallback duplication.
9. **Nested `switch (m.reason)`** inside the `session.revoked` and
   `user.signed_in_failed` renderer cases.
10. **Exhaustiveness enforcement** = two compile-time assertions
    (typeof-coverage + renderer `never` default). No runtime test.

---

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task
is atomic (reviewable as a single commit). The ordering keeps the
codebase building after every step.

### Task 1: Extract `AuditMeta` + known-actions/target-types arrays to validators

- **Files:**
  - `packages/validators/src/audit-meta.ts` (new) — defines
    `AuditMeta` union (verbatim copy from `@aira/db/audit.ts` plus
    the explanatory comments), `KNOWN_AUDIT_ACTIONS` (const array of
    24 strings), `KNOWN_AUDIT_TARGET_TYPES` (const array of 7
    strings: `user`, `business`, `business_subscription`,
    `sponsorship`, `community_post`, `app_setting`, `session`),
    `AUDIT_ACTION_LABEL_OVERRIDES` map, and the two compile-time
    assertions
  - `packages/validators/src/index.ts` (edit) — re-export
  - `packages/validators/package.json` (edit) — add
    `./audit-meta` subpath export
  - `packages/db/src/audit.ts` (edit) — delete the inline
    `AuditMeta` union, import + re-export from
    `@aira/validators/audit-meta`. Keep `createAudit`,
    `AuditDb`, `AuditFn`, `AuditClient`, `clientFromHeaders`
    unchanged
- **What:** Move the type + new arrays into a shared, non-server-only
  module. Add type-level assertion
  `type _ActionsCoverage = AuditMeta["kind"] extends
  (typeof KNOWN_AUDIT_ACTIONS)[number] ? true : never`. Define
  `AUDIT_ACTION_LABEL_OVERRIDES` map with the three initial
  overrides from Suggestion 1.
- **Acceptance:** `pnpm typecheck` passes; every existing import of
  `AuditMeta` from `@aira/db/audit` still resolves (verified by
  ripgrep over the repo); the type assertion fails if any kind is
  added to the union without bumping the array.
- **Pause if:** Any test file or build script references
  `AuditMeta` via a path that breaks after the move. (Searches:
  `rg "AuditMeta" --type ts --type tsx | grep -v node_modules`
  before and after.)

### Task 2: Extend `listAudit` filters + LEFT JOINs + validator schema

- **Files:**
  - `packages/validators/src/admin.ts` (edit) — extend
    `ListAuditInputSchema` with `actor_id?: z.string()`,
    `target_type?: z.enum(KNOWN_AUDIT_TARGET_TYPES)`,
    `action?: z.enum(KNOWN_AUDIT_ACTIONS)`. Extend
    `AdminAuditRowSchema` with
    `target_business_id: z.string().nullable()`.
  - `packages/services/src/admin/queries.ts` (edit) — in
    `listAudit`: append three `if (input.X) conditions.push(...)`
    blocks; add LEFT JOIN of `business_subscription` ON
    `audit_log.target_type = 'business_subscription' AND
    audit_log.target_id = business_subscription.id`; LEFT JOIN
    `sponsorship` ON same shape; SELECT
    `coalesce(business_subscription.business_id,
    sponsorship.business_id)` AS `target_business_id`. Update
    `toAdminAuditRow` mapper to surface the new field.
- **What:** Server-side filtering + the JOIN needed for
  target-id linking on subscription/sponsorship rows.
- **Acceptance:** `pnpm typecheck` passes; calling
  `apiServerFetch(listAuditOp, { input: { action: "business.archived" }})`
  in a one-line probe returns only `business.archived` rows;
  filtering by `target_type` returns only that type's rows;
  `target_business_id` is non-null for subscription + sponsorship
  audit rows and null for others.
- **Pause if:** the Drizzle LEFT JOIN composition rejects the
  conditional ON clause shape — fall back to a correlated subquery
  for `target_business_id`, same pattern as F23′'s `listQueue`.

### Task 3: Renderer helpers (`renderAuditDetail`, `renderAuditTarget`) + `AuditTable` wiring

- **Files:**
  - `apps/web/src/features/admin/audit/render-detail.tsx` (new) —
    24-case switch; nested `switch (m.reason)` for
    `session.revoked` and `user.signed_in_failed`; default
    `const _exhaustive: never = m`. Helper `formatDate(iso)` uses
    the stable UTC formatter pattern (no
    `toLocaleDateString()`). Muted styling for `signed_in*` /
    `signed_up`.
  - `apps/web/src/features/admin/audit/render-target.tsx` (new) —
    per-`target_type` switch resolving to a `<Link>` or short id.
    For `app_setting`: render the full key (no slice). For
    `session`: render the muted "session" text. For
    `community_post`: link to `/admin/community` (no detail page
    yet).
  - `apps/web/src/features/admin/audit/index.ts` (new) — barrel.
  - `apps/web/src/features/admin/components/audit-table.tsx`
    (edit) — replace
    `{row.metadata ? JSON.stringify(row.metadata) : "—"}` with
    `{renderAuditDetail(row.action, row.metadata)}`; replace the
    target id rendering with `{renderAuditTarget(row)}`; replace
    `new Date(row.at).toLocaleString()` with the stable UTC
    formatter + `suppressHydrationWarning` on the wrapping cell.
- **What:** All readable output. No filter UI yet; the page still
  shows date-range filter only.
- **Acceptance:** Visit `/admin/audit` — every row's "Detail"
  column shows English text; no raw JSON anywhere; target ids
  render as links where applicable; `pnpm typecheck` + `pnpm lint`
  pass; no console hydration warnings.
- **Pause if:** any `kind` value triggers the `never`
  exhaustiveness error — this means the renderer is missing a
  case that the AuditMeta union has. Add the case, don't bypass.

### Task 4: `FilterBar` + `ActorTypeahead` client components + page wiring

- **Files:**
  - `apps/web/src/features/admin/audit/actor-typeahead.tsx` (new) —
    client component; debounced 300ms input firing
    `apiClient.get('/api/v1/admin/users', { query: { q } })`;
    dropdown of top 10 matches showing name + email; on selection
    writes `?actor_id=<id>` to URL via `router.push`; clear button
    drops the `actor_id` param.
  - `apps/web/src/features/admin/audit/filter-bar.tsx` (new) —
    client component composing date inputs, ActorTypeahead, two
    plain `<select>`s for target_type + action (action grouped by
    domain via `<optgroup>`s computed from the `KNOWN_AUDIT_ACTIONS`
    array). Each control writes its URL param on change. On any
    filter change, the helper resets `page` to 1.
  - `apps/web/src/app/admin/audit/page.tsx` (edit) — parse the
    three new searchParams; pass them into the
    `apiServerFetch(listAuditOp, ...)` call; replace the inline
    `<form method="get">` with `<FilterBar initial={…} />`;
    update the existing `PaginationLink` helper to carry the new
    params through.
  - `apps/web/src/features/admin/audit/index.ts` (edit) — export
    `FilterBar`.
- **What:** Wire the URL-driven filter UI to the new service
  filters from T2.
- **Acceptance:** Typeahead works (300ms debounce); selecting an
  actor filters the table + URL gains `?actor_id=…`; picking a
  target-type or action does same; all four filters compose with
  date range; changing any filter resets pagination to page 1;
  hitting the "Clear" button clears all filters; `pnpm typecheck`
  + `pnpm lint` pass; no hydration warnings.
- **Pause if:** the typeahead's `apiClient.get` returns a shape
  that doesn't match `ListUsersOutput` — verify the route handler
  + schema before wiring.

---

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

None — all six of the plan's open questions are resolved in
**Decisions locked** above, plus four concerns from this review.
If `/mlabs-code` discovers a new question during implementation
(e.g. an `AuditMeta` variant we didn't anticipate fails the
exhaustiveness gate), the per-task **Pause if** triggers will catch it.
