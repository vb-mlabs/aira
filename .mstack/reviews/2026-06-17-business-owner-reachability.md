# Review: G1 — Business Owner Reachability

**Date:** 2026-06-17
**Slug:** business-owner-reachability
**Plan reviewed:** [2026-06-17-business-owner-reachability.md](../plans/2026-06-17-business-owner-reachability.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** vb-mlabs

---

## Summary

Plan is solid and tightly scoped — the FK + admin linkage + one outreach
channel + read-only "My Listings" combo is the right G1 surface. Approved
with no blockers. Twelve concerns surfaced during the codebase pass were
locked into concrete decisions below — most are naming/pattern alignments
(plan referred to `getBusinessByIdAdmin` but the actual function is
`getBusinessByIdIncludingArchived`, etc.), one widens the public
`BusinessSchema` by an opaque-FK string, and one upgrades the empty-broadcast
path to still write an audit row. Task list is 14 atomic commits ordered so
each leaves typecheck green (notification kind + both renderers ship
together; audit kind + render-detail branch ships together).

## Findings

### Blockers (must fix before /mlabs-code)

None. Every concern below was resolvable inline.

### Concerns (raised, decided, recorded)

- **Concern:** Plan referenced `getBusinessByIdAdmin` and "the admin
  detail op" without precise names. The actual function is
  `getBusinessByIdIncludingArchived` (in
  `packages/services/src/businesses/queries.ts:381`) and the op is
  `getBusinessByIdAdminOp` (in
  `apps/web/src/server/operations/businesses-admin.ts:168`).
  **Decision:** Implementation plan uses the real names. The op's output
  schema (currently `BusinessDetailOutputSchema = { business: BusinessSchema
  | null }`) is extended to `{ business, owner }` where `owner` is
  `BusinessOwnerSchema | null`.

- **Concern:** There is no separate `BusinessAdminSchema`. Public + admin
  endpoints share `BusinessSchema` (validators/businesses.ts:64). Plan
  said "extend BusinessAdminSchema or the admin-projection schema" — that
  schema does not exist.
  **Decision:** Add `owner_user_id: z.string().nullable()` directly to
  `BusinessSchema`. The FK is an opaque UUID (no PII, no name/email
  leaked), and every existing admin extension follows the
  `AdminBusinessItemSchema = BusinessSchema.extend({...})` precedent —
  staying with that pattern beats inventing a new admin-only schema.
  Joined `owner: { id, name, email } | null` is a SEPARATE field on the
  admin-detail op output (not on `BusinessSchema`), so it never leaks to
  public reads.

- **Concern:** Should `owner_user_id` be in `BusinessUpdateInputSchema`?
  If yes, the existing `updateBusiness` service (businesses/service.ts:34)
  iterates the payload and would write to it — bypassing the audited
  assign path.
  **Decision:** NO. `owner_user_id` is NOT in `BusinessUpdateInputSchema`.
  The schema's `.strict()` setting plus `updateBusiness`'s explicit
  per-field allow-list keeps the column unmutable through that surface.
  Owner changes flow only through `assignBusinessOwner` /
  `unassignBusinessOwner`, which audit + email + notify.

- **Concern:** Empty recipient set on broadcast — plan says don't write an
  audit row.
  **Decision:** OVERRIDE. Write the audit row with `recipient_count: 0`.
  Auditability beats one row of noise; admins should see a record of every
  broadcast attempt, including no-op ones. Modal still disables Send (UX
  guard); if the admin somehow gets through (API direct call) the audit
  still records the attempt.

- **Concern:** Broadcast permission — plan implies `admin`. Higher
  blast radius than 1:1 `sendAdminNotification` (also `admin`).
  **Decision:** Stay with `admin` for consistency. `super_admin` gate
  isn't justified for G1; the audit + recipient-count confirm step is the
  guardrail. Revisit if abuse shows up.

- **Concern:** `business_broadcast` notification href.
  **Decision:** Default to `/account/listings` (owner's hub). Single
  fixed href in G1; admin doesn't get to customise it. If we add
  per-broadcast href later, that's a schema extension.

- **Concern:** Banned-recipient handling. Plan said filter at the
  targeting query (preferred over changing the shared
  `createNotification` helper).
  **Decision:** Lock the targeting query: linked + non-banned + non-archived
  business. The link event (assign) does NOT pre-check the user's banned
  status — admin's call; if they link a banned user, the FK is written
  and the audit row records the assignment. Email still fires (Postmark
  will deliver; banned status doesn't gate transactional mail). In-app
  notification creates a row, but the user can't log in anyway. This is
  cheap and consistent — banned-status doesn't bleed into the link
  flow's logic.

- **Concern:** Archived business in `/account/listings`.
  **Decision:** Show with an "Archived" label (no link to the public
  detail since public detail 404s on archived). Owner still has a
  legitimate ownership record; hiding archived rows would surprise them
  if they remember being listed.

- **Concern:** Plan said it might need a new `apps/web/src/server/operations/account.ts`
  file. Verified: no such file exists today. Operations files are organised
  by domain (admin.ts, businesses-admin.ts, businesses.ts, community.ts,
  messages.ts, notifications.ts, users.ts, etc.). The new
  `listMyBusinessesOp` is owner-scoped on the businesses domain — closest
  fit is `apps/web/src/server/operations/businesses.ts` (existing public
  ops file).
  **Decision:** Add `listMyBusinessesOp` to
  `apps/web/src/server/operations/businesses.ts` with `permission: "user"`.
  No new operations file.

- **Concern:** `/admin/businesses` list table is **inline** in
  `apps/web/src/app/admin/businesses/page.tsx` (it's not extracted to a
  component). Plan said "in `business-list.tsx` (or wherever the table
  lives — verify in review)".
  **Decision:** Edit the inline table directly in `page.tsx`. No new
  component extraction in this task — that's refactor scope creep and
  unrelated to G1. Add "Owner" column + "Has owner / No owner / Any"
  filter + "Notify all business owners" header button all in `page.tsx`.

- **Concern:** New audit kinds add three rows to `KNOWN_AUDIT_ACTIONS` and
  three branches to `AuditMeta`. The codebase has a compile-time
  `_ActionsCoverage` assertion + a `never`-typed default in
  `apps/web/src/features/admin/audit/render-detail.tsx` that both must be
  updated in the same commit or typecheck fails.
  **Decision:** Audit-kind task (T2 below) ships both files in one commit.

- **Concern:** New `business_broadcast` `NotificationBody` variant requires
  FOUR coordinated touches per the 2026-06-17 learning: `packages/db/src/types.ts`,
  `packages/validators/src/notifications.ts`,
  `apps/web/src/features/notifications/components/notification-item.tsx`,
  `apps/mobile/app/(app)/notifications.tsx`. Both renderers use exhaustive
  switches with no default branch — missing the mobile one fails
  `@aira/mobile` typecheck even though mobile UI is out of scope.
  **Decision:** Notification-kind task (T3 below) ships all four files in
  one commit. Mobile branch uses the same copy as web: `"AIRA team:
  {title}"` for the preview, no href (Expo router doesn't yet handle
  /account/listings deep-linking; that's mobile-pass scope).

### Suggestions (taken or deferred)

- **Suggestion (taken):** Pause-if trigger on the migration task — pause
  if `pnpm db:generate` produces any SQL beyond `ALTER TABLE businesses
  ADD COLUMN owner_user_id ...` + `CREATE INDEX businesses_owner_user_idx
  ...`. Anything else (e.g. column rename diff, drop) is a sign of
  schema drift and needs review.
- **Suggestion (taken):** Pause-if on broadcast task — pause if the
  targeting query returns >100 recipients in this sprint. AIRA is in
  early-stage growth; >100 owners would mean either we've grown past G1
  scope (good problem) or the query is wrong (bad). Either way, human
  eye.
- **Suggestion (taken):** Pause-if on email-template task — the body
  string must use `brand.name` from `@aira/config` (no string literal).
  ESLint `no-brand-string-literal` should catch it, but the
  notification-email reuse pattern is new enough to be worth a manual
  pause.
- **Suggestion (deferred to G2):** A "View past broadcasts" link in the
  broadcast modal pointing at `/admin/audit?action=business.broadcast_sent`.
  Cheap but adds UI surface. Defer; admin can already filter the audit
  page by action.
- **Suggestion (deferred):** Pre-validate "is this user already an
  owner of N other businesses?" with a warning at >5. Could be useful
  data-quality signal. Defer — out of G1 scope.
- **Suggestion (deferred):** Per-broadcast custom href. Plan locked
  `/account/listings`. Defer customisation until usage justifies it.

## Decisions locked

Net new decisions made during review:

- `owner_user_id` lives on the public `BusinessSchema` (opaque FK,
  no PII)
- Owner display (`{ id, name, email }`) lives on a separate
  `BusinessOwnerSchema`, returned as a SEPARATE field on the admin-detail
  op output (never on `BusinessSchema`)
- `owner_user_id` is NOT in `BusinessUpdateInputSchema` — owner changes
  flow only through the dedicated audited path
- Empty broadcast WRITES an audit row (with `recipient_count: 0`)
- Broadcast op is `permission: "admin"` (consistent with 1:1 notify)
- Broadcast notification href is fixed at `/account/listings`
- Banned-status does NOT gate the link flow (admin's call)
- Archived businesses appear on `/account/listings` with an "Archived"
  label
- `listMyBusinessesOp` lives in existing
  `apps/web/src/server/operations/businesses.ts`, not a new account.ts
- `/admin/businesses` table edits happen inline in `page.tsx`, no new
  component extraction
- Audit task and notification task each ship all coordinated files in
  one commit (typecheck integrity)

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit) and leaves the codebase in a
working state (typecheck green, tests passing).

### Task 1: Schema migration — add `owner_user_id` to `businesses`

- **Files:** `packages/db/src/schema/businesses.ts` (edit) ·
  `packages/db/drizzle/<timestamp>_*.sql` (generated)
- **What:** Add `owner_user_id: text("owner_user_id").references(() =>
  user.id, { onDelete: "set null" })` to the businesses table. Add a
  partial index `businesses_owner_user_idx` on `owner_user_id WHERE
  owner_user_id IS NOT NULL`. Update the schema-file header comment to
  document the ownership semantics. Run `pnpm db:generate` to produce
  the migration. Apply with `pnpm db:migrate`.
- **Acceptance:** Generated migration ADDs one column + creates one
  index. `pnpm db:migrate` runs cleanly. `pnpm typecheck` passes. No
  Drizzle introspection drift warning.
- **Pause if:** Generated SQL contains anything other than `ALTER TABLE
  businesses ADD COLUMN owner_user_id ... REFERENCES "user"(id) ON
  DELETE SET NULL` + `CREATE INDEX ... businesses_owner_user_idx ...
  WHERE owner_user_id IS NOT NULL`. Any DROP, RENAME, or other ALTER is
  a sign of schema drift.

### Task 2: Add three new audit kinds + render branches

- **Files:** `packages/validators/src/audit-meta.ts` (edit) ·
  `apps/web/src/features/admin/audit/render-detail.tsx` (edit)
- **What:** Append three variants to `AuditMeta`:
  `business.owner_assigned` with `{ owner_user_id, owner_email }`,
  `business.owner_unassigned` with `{ prev_owner_user_id }`,
  `business.broadcast_sent` with `{ title, recipient_count }`. Append
  the same three strings to `KNOWN_AUDIT_ACTIONS`. Add three
  case branches to `render-detail.tsx` rendering each with a humanised
  one-liner. Add label overrides in `AUDIT_ACTION_LABEL_OVERRIDES` for
  "Owner assigned" / "Owner unassigned" / "Broadcast sent".
- **Acceptance:** `pnpm typecheck` passes (`_ActionsCoverage` and
  `never`-typed default both happy). All three actions appear in the
  `/admin/audit` filter dropdown under the "business" group. Manually
  inserting an audit row of each kind renders a sensible detail line
  (no "[unknown action]").

### Task 3: Add `business_broadcast` notification kind + all renderers

- **Files:** `packages/db/src/types.ts` (edit) ·
  `packages/validators/src/notifications.ts` (edit) ·
  `apps/web/src/features/notifications/components/notification-item.tsx`
  (edit) · `apps/mobile/app/(app)/notifications.tsx` (edit)
- **What:** Add `{ kind: "business_broadcast", title: string, message:
  string }` variant to `NotificationBody` (db/types.ts) and to
  `NotificationBodySchema` (validators/notifications.ts). Add render
  branch on web: title = `"AIRA team: ${body.title}"`, message =
  `body.message`, href = `/account/listings`. Add render branch on
  mobile: preview = `"AIRA team: ${body.title}"`, no href (mobile deep
  links are out of scope). All four files ship in one commit per the
  2026-06-17 learning — otherwise `@aira/mobile` typecheck fails.
- **Acceptance:** `pnpm typecheck` and `pnpm --filter @aira/mobile
  typecheck` both pass. Web renderer's exhaustive switch compiles; mobile
  renderer's exhaustive switch compiles. Inserting a `business_broadcast`
  row in DB surfaces in `/notifications` with the expected copy.

### Task 4: Validator schemas for owner + broadcast inputs

- **Files:** `packages/validators/src/businesses.ts` (edit) ·
  `packages/validators/src/admin.ts` (edit)
- **What:** In businesses.ts: add `owner_user_id: z.string().nullable()`
  to `BusinessSchema` (between `years_operating` and `deleted_at`); add
  `BusinessOwnerSchema = z.object({ id: z.string(), name: z.string(),
  email: z.string().email() })` and export the type;
  add `AssignBusinessOwnerInputSchema = z.object({ id: z.string().min(1),
  owner_user_id: z.string().min(1) }).strict()`; add
  `UnassignBusinessOwnerInputSchema = z.object({ id: z.string().min(1)
  }).strict()`; add admin-detail output schema:
  `BusinessAdminDetailOutputSchema = z.object({ business:
  BusinessSchema.nullable(), owner: BusinessOwnerSchema.nullable() })`.
  Do NOT add `owner_user_id` to `BusinessUpdateInputSchema`. In admin.ts:
  add `BusinessOwnerBroadcastInputSchema = z.object({ title:
  z.string().min(1).max(120), message: z.string().min(1).max(2000)
  }).strict()` and `BusinessOwnerBroadcastOutputSchema = z.object({ ok:
  z.literal(true), recipient_count: z.number().int().nonnegative()
  })`.
- **Acceptance:** `pnpm typecheck` passes. All new schemas exported from
  the package index. Manual `BusinessUpdateInputSchema.parse({ id: "x",
  owner_user_id: "y" })` rejects with `unrecognized_keys` (defense in
  depth confirmed).

### Task 5: Owner-related read queries

- **Files:** `packages/services/src/businesses/queries.ts` (edit)
- **What:** Add `getBusinessOwner(db, businessId)` returning `{ id,
  name, email } | null` via a single SELECT joining businesses to user
  on `owner_user_id`. Add `getBusinessesOwnedBy(db, userId)` returning
  `Business[]` filtered to `owner_user_id = userId` (include archived
  rows; the My Listings page wants both). Update the row-mapper
  `toBusiness` to project `owner_user_id` from the row (now that
  `BusinessSchema` carries it). Add `getBusinessOwnerLookup(db,
  businessIds)` returning a `Map<businessId, { id, name, email }>` for
  the list-page join — preferred over an inline LEFT JOIN per business
  row because admin lists are small (~hundreds) and a single
  `WHERE owner_user_id IN (?)` is cheap and reusable.
- **Acceptance:** `pnpm typecheck` passes. New unit tests in
  `packages/services/src/businesses/__tests__/queries.test.ts` cover:
  (a) `getBusinessOwner` returns null when FK is null; (b) returns
  `{ id, name, email }` when FK is set; (c) `getBusinessesOwnedBy`
  returns owned active + archived; (d) returns empty array for a user
  who owns nothing; (e) `getBusinessOwnerLookup` returns a map for a
  mixed input of owned + unowned business ids.

### Task 6: Services — `assignBusinessOwner` + `unassignBusinessOwner`

- **Files:** `packages/services/src/businesses/service.ts` (edit) ·
  `packages/services/src/businesses/index.ts` (edit re-export) ·
  `packages/services/src/businesses/__tests__/service.test.ts` (add cases)
- **What:** Add `assignBusinessOwner(db, ctx, { businessId, ownerUserId
  })`: load the business (404 if missing or archived). Load the target
  user (404 if missing). Inside a transaction: audit
  `business.owner_assigned` with `{ owner_user_id, owner_email }`
  BEFORE the mutation; update `businesses.owner_user_id`. After commit
  (outside the transaction so an email failure can't roll back the
  assign): create a `generic` in-app notification on the new owner
  (title "You've been listed as a business owner", message "An admin at
  {brand.name} has listed you as the owner of {business.name}.", href
  "/account/listings"); send the link-event email via Postmark using
  the existing `NotificationEmail` template with the same title/body
  and `ctaUrl = buildAuthUrl(authBaseUrl, "/account/listings")`. On
  email failure, log to `error_log` and return success — assignment is
  committed regardless. Add `unassignBusinessOwner(db, ctx, {
  businessId })`: load the business + current owner. If
  `owner_user_id` is already null, return success (idempotent). Inside
  a transaction: audit `business.owner_unassigned` with `{
  prev_owner_user_id }`; null the column. No notification, no email
  (per locked decision).
- **Acceptance:** `pnpm test` passes new cases: (a) assign on
  un-owned biz → row updated, audit written, notification row created,
  email driver called once; (b) assign on already-owned biz → FK
  overwrites, audit `prev_owner_user_id` in meta, email goes to the
  NEW owner only; (c) assign on archived biz → 404; (d) assign with
  missing user id → 404; (e) email driver failure → assignment still
  committed (test uses the failing-mock driver); (f) unassign on owned
  biz → FK nulled, audit written, no notification/email; (g) unassign
  on un-owned biz → idempotent success, no audit row.
- **Pause if:** The email template requires a literal brand-name string
  to be passed in. It should use `brand.name` interpolation from
  `@aira/config` — `no-brand-string-literal` ESLint rule will reject
  literals at lint time, but flag before submitting if you find
  yourself typing a brand name.

### Task 7: Service — `sendBusinessOwnerBroadcast` in admin domain

- **Files:** `packages/services/src/admin/service.ts` (edit) ·
  `packages/services/src/admin/index.ts` (edit re-export) ·
  `packages/services/src/admin/__tests__/service.test.ts` (add cases)
- **What:** Add `sendBusinessOwnerBroadcast(db, ctx, { title,
  message })`. Inside a single transaction: SELECT distinct
  `user.id` from a join of `user` + `businesses` where
  `businesses.owner_user_id IS NOT NULL AND businesses.deleted_at IS
  NULL AND user.banned_at IS NULL`. Audit
  `business.broadcast_sent` with `{ title, recipient_count }` BEFORE
  the notification fan-out. Bulk-insert N notification rows with
  `type = "business_broadcast"`, `body = { kind:
  "business_broadcast", title, message }`. Return `{ ok: true,
  recipient_count }`. If `recipient_count === 0`, still write the
  audit row (per locked decision) and skip the insert.
- **Acceptance:** `pnpm test` passes new cases: (a) broadcast with
  3 linked, non-banned, active owners → 3 notification rows + 1 audit
  row with `recipient_count: 3`; (b) broadcast with 0 recipients →
  audit row with `recipient_count: 0`, no notification rows; (c)
  excludes banned owners; (d) excludes owners of archived
  businesses; (e) a user owning two active businesses is notified once,
  not twice (DISTINCT on user.id).
- **Pause if:** Recipient count returned by the targeting query
  exceeds 100 in this sprint. AIRA is early-stage; >100 means either
  unexpected scale (good problem, but worth pausing to confirm intent)
  or a buggy targeting query.

### Task 8: Admin operations — owner assign / unassign + updated detail/list

- **Files:** `apps/web/src/server/operations/businesses-admin.ts` (edit)
- **What:** Add `assignBusinessOwnerOp` (`permission: "admin"`, input
  `AssignBusinessOwnerInputSchema`, output `BusinessOwnerSchema` —
  returns the new owner record) calling
  `businessesService.assignBusinessOwner`. Add
  `unassignBusinessOwnerOp` (`permission: "admin"`, input
  `UnassignBusinessOwnerInputSchema`, output `z.object({ ok:
  z.literal(true) })`). Update `getBusinessByIdAdminOp` output schema
  from `BusinessDetailOutputSchema` to
  `BusinessAdminDetailOutputSchema`; handler now calls
  `getBusinessByIdIncludingArchived` AND `getBusinessOwner` in
  parallel and returns `{ business, owner }`. Update
  `listAllBusinessesAdminOp`: extend `AdminBusinessItemSchema` with
  `owner: BusinessOwnerSchema.nullable()`; the handler calls
  `getBusinessOwnerLookup` for the page's business ids and joins the
  result by id.
- **Acceptance:** `pnpm typecheck` passes. The
  `/admin/businesses/[id]` RSC page receives `{ business, owner }`
  from `apiServerFetch`; the existing `business.deleted_at` check
  still works. Curl + bearer-token call to the new
  `PUT /api/v1/admin/businesses/[id]/owner` succeeds (route is added
  next task; this task only adds the ops).

### Task 9: Admin operation — broadcast

- **Files:** `apps/web/src/server/operations/admin.ts` (edit)
- **What:** Add `sendBusinessOwnerBroadcastOp` (`permission: "admin"`,
  input `BusinessOwnerBroadcastInputSchema`, output
  `BusinessOwnerBroadcastOutputSchema`) calling
  `adminService.sendBusinessOwnerBroadcast`.
- **Acceptance:** `pnpm typecheck` passes. Op surfaces via
  `apiServerFetch` and `apiClient` alike.

### Task 10: Account operation — `listMyBusinessesOp`

- **Files:** `apps/web/src/server/operations/businesses.ts` (edit)
- **What:** Add `listMyBusinessesOp` (`permission: "user"`, input
  `z.object({}).strict()`, output `z.object({ items:
  z.array(BusinessSchema) })`) calling
  `businessesService.getBusinessesOwnedBy(db, ctx.userId)`.
- **Acceptance:** `pnpm typecheck` passes. Returns owner-only business
  list including archived rows.

### Task 11: Route handlers

- **Files:** `apps/web/src/app/api/v1/admin/businesses/[id]/owner/route.ts`
  (new) · `apps/web/src/app/api/v1/admin/businesses/broadcast/route.ts`
  (new) · `apps/web/src/app/api/v1/account/listings/route.ts` (new)
- **What:** Three thin handlers:
  - `PUT /api/v1/admin/businesses/[id]/owner` → `assignBusinessOwnerOp.runFromRequest`
  - `DELETE /api/v1/admin/businesses/[id]/owner` → `unassignBusinessOwnerOp.runFromRequest`
  - `POST /api/v1/admin/businesses/broadcast` → `sendBusinessOwnerBroadcastOp.runFromRequest`
  - `GET /api/v1/account/listings` → `listMyBusinessesOp.runFromRequest`
  Each file is the standard `export const runtime = "nodejs"; export
  const { METHOD } = opName.runFromRequest` shape.
- **Acceptance:** Endpoints respond via curl with the appropriate
  permission and shape. `pnpm typecheck` + `pnpm lint` pass.

### Task 12: Admin UI — owner section + picker on business detail page

- **Files:** `apps/web/src/features/admin/components/business-owner-section.tsx`
  (new) · `apps/web/src/features/admin/components/business-owner-picker.tsx`
  (new) · `apps/web/src/features/admin/components/business-detail.tsx`
  (edit, mount `BusinessOwnerSection`) ·
  `apps/web/src/app/admin/businesses/[id]/page.tsx` (edit if needed to
  pass through the new `owner` prop)
- **What:** `BusinessOwnerSection` is a client component receiving
  `{ businessId, businessName, owner: BusinessOwner | null }`. Shows
  the current owner (name + email + a chevron-to-user-detail link) or
  an empty state with an "Assign owner" button. Clicking either opens
  the picker modal. `BusinessOwnerPicker` wraps the existing
  `AdminFormModal` shell. Step 1: debounced (300ms) email/name search
  input → fires `apiClient.get("/api/v1/admin/users?q=...")` →
  renders matching rows. Min 2 chars before fetching. Step 2: confirm
  step shows "Assign **{user.name}** ({user.email}) as owner of
  **{business.name}**?" with Cancel + "Confirm assignment" buttons.
  Submit calls `apiClient.put('/api/v1/admin/businesses/{id}/owner',
  { owner_user_id })`; success toast + `router.refresh()`. Unassign
  is a separate small confirm-only modal: "Remove **{user.name}** as
  owner of **{business.name}**? They will keep their AIRA account but
  will no longer receive owner-targeted notifications." → `DELETE`
  → success toast + refresh. Update `business-detail.tsx` to mount
  `<BusinessOwnerSection />` near the top of the detail layout
  (above the Subscriptions section).
- **Acceptance:** Manual flow: open `/admin/businesses/[id]` → see
  empty Owner section → click "Assign owner" → search for a user →
  pick → confirm → toast appears, owner section now shows the user
  → audit page records `business.owner_assigned` → linked user has
  an inbox notification + receives the test email → "Remove owner"
  → confirm → toast appears, Owner section empties → audit page
  records `business.owner_unassigned`. `pnpm typecheck` + `pnpm lint`
  pass.

### Task 13: Admin UI — list page (Owner column + filter + Broadcast)

- **Files:** `apps/web/src/app/admin/businesses/page.tsx` (edit) ·
  `apps/web/src/features/admin/components/business-broadcast-modal.tsx`
  (new) · `apps/web/src/app/admin/businesses/_components/owner-filter.tsx`
  (new, mirrors `renewing-filter.tsx`)
- **What:** Add `?owner=has|none` parsing alongside the existing
  `archived` / `renewing` searchParams. Pass through to
  `listAllBusinessesAdminOp` via a new optional filter parameter (extend
  `AdminBusinessListInputSchema`); the queries layer filters in-memory
  (admin lists are small, no need to push it into SQL). Add the new
  `OwnerFilter` component as a third pill row next to "Active only /
  Show archived" and `RenewingFilter`. Add a sixth column to the table
  header: "Owner". For each row, render `b.owner?.name ?? "—"`. Add a
  "Notify all business owners" button to the `AdminPageHeader.actions`
  prop (rightmost). Clicking opens the new `BusinessBroadcastModal`:
  step 1 has title + message inputs (max 120 / 2000 chars, characters
  remaining counter); step 2 is the confirm step showing
  "Will send to **N** business owners" + the message body re-rendered
  in a muted card. Submit calls
  `apiClient.post('/api/v1/admin/businesses/broadcast', { title,
  message })`; success toast shows the count; on `recipient_count: 0`
  the modal disables Send and shows "0 owners are linked yet — nothing
  to send."
- **Acceptance:** Manual flow: load `/admin/businesses` → see Owner
  column populated (or "—") → switch to `?owner=has` → table filters →
  click "Notify all business owners" → enter title/message → confirm
  step shows the recipient count → submit → toast appears, audit page
  records `business.broadcast_sent`, every linked owner has an inbox
  notification. `pnpm typecheck` + `pnpm lint` pass.

### Task 14: Account UI — `/account/listings` + menu link

- **Files:** `apps/web/src/app/(app)/account/listings/page.tsx` (new) ·
  `apps/web/src/features/account/components/my-listings-card.tsx`
  (new) · `apps/web/src/app/(app)/account/page.tsx` (edit, add menu
  item) · `apps/web/src/features/admin/README.md` (edit)
- **What:** New RSC page at `/account/listings` calls
  `apiServerFetch(listMyBusinessesOp)`, renders an `EmptyState` icon +
  "You aren't listed as an owner of any businesses yet." +
  `mailto:supportEmail` link when empty, else a stack of
  `MyListingsCard`. Each card shows name, category, "Archived" badge
  if `deleted_at !== null`; clicking the card navigates to
  `/listings/<category>/<slug>` for active rows (no link for archived,
  since the public detail 404s on archived). In `account/page.tsx`,
  append `{ href: "/account/listings", label: "My listings", icon:
  Store }` to `ACCOUNT_ITEMS` (always visible). Update the admin
  README to mention the three new ops + the broadcast endpoint.
- **Acceptance:** Signed-in user who owns one active + one archived
  business sees both on `/account/listings` (archived has a badge);
  empty user sees the empty state; menu item is present on `/account`
  for everyone. `pnpm typecheck` + `pnpm lint` + `pnpm test` pass.

## Open questions

For `/mlabs-code` to escalate rather than guess.

- If `pnpm db:generate` produces unexpected SQL beyond the column +
  index (already covered by Task 1 Pause-if).
- If the Postmark send fails AND the email driver isn't the
  console-fallback test driver — does the assignment audit need a
  second `business.owner_assigned_email_failed` row to surface to ops?
  Default: NO (one assign = one audit). Escalate if the in-house
  error_log channel is broken so there's no other signal.
- If the broadcast targeting query starts returning >100 recipients
  (already covered by Task 7 Pause-if).
- The "Owner" column on the admin list page may shift the table width.
  If the table overflows on a 1280px viewport, drop the city/address
  column (already not present today) or wrap "Owner" under "Name" as
  a sub-line. /mlabs-code's call; no scope creep beyond layout.
