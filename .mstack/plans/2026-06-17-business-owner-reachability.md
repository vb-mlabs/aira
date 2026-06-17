# Plan: G1 — Business Owner Reachability

**Date:** 2026-06-17
**Slug:** business-owner-reachability
**Status:** reviewed
**Author:** vb-mlabs

---

## Problem

Today there is no link between a business listing and any user account.
Businesses are admin-managed rows with no human attached, so:

- Admins cannot reach owners — the PRD's targeted-broadcast requirement
  (line 54) is unmet because the data model offers no segment to target.
- There is no foundation for any future owner-facing flow (verified-by-owner
  badge, self-edit, self-serve renewals, monetization conversations) — all
  of those depend on the same FK we're missing.
- The PRD persona Arjun (Restaurant Owner) has no concept of "his" listing
  on the platform.

This sprint closes that gap with the **minimum** that unlocks reachability:
a data model + admin linkage + one outreach channel + minimal owner-side
visibility. We are explicitly **not** building self-edit, a claim flow, or an
owner portal — those are G2/G3 and deferred.

**Who benefits:** admins (can reach owners), business owners (see they are
recognised on AIRA), the platform (foundation for G2/G3).

**Success looks like:** an admin can pick a listing, link it to Arjun's user
account, Arjun gets an email confirming it, the admin can later send a single
in-app notification to every linked owner, and Arjun sees his listing on his
account page.

## Scope

**In:**
- Add `owner_user_id` nullable FK on `businesses` (`ON DELETE SET NULL`,
  references `user.id`)
- Admin assign-owner modal on `/admin/businesses/[id]` with live search-by-email
  user picker + confirmation step
- Admin "Owner" column + "Has owner / No owner / Any" filter on
  `/admin/businesses` list page
- Admin "Notify all business owners" action in the list-page header — opens
  a modal that captures title + message and confirms recipient count + body
  preview before sending
- New notification body kind `business_broadcast` and new
  `sendBusinessOwnerBroadcast` service function
- Postmark email on the **link event only**: "you've been listed as a business
  owner". Reuses the existing generic `NotificationEmail` template (no new
  template file)
- Read-only "My Listings" sub-page at `/account/listings` listing every
  business where `owner_user_id = ctx.userId`, linked from a new menu item
  on `/account`
- Audit log: three new kinds — `business.owner_assigned`,
  `business.owner_unassigned`, `business.broadcast_sent`
- Edge cases: banned/deleted user → FK nulls out and is excluded from
  broadcast targeting; archived business is excluded from broadcast targeting

**Out (deferred to G2/G3 or later):**
- Public "claim this business" flow on listing detail
- Email/push delivery of broadcasts (in-app only — Postmark stays scoped to
  the link event)
- Category / city / segment filters on broadcasts ("all linked owners" only)
- Owner self-edit of any business field
- Invite-by-email for users that don't yet exist (admin can only link
  existing accounts)
- "Verified by owner" badge on public listings
- Multi-owner / co-owner support
- Mobile app changes (mobile QA is a separate pass once Apple Developer
  account is approved)
- Email on the **unlink** event (silent; audit log is the record)
- Rate limiting on the broadcast action (admin-only; low blast radius for now)

## Approach

The implementation follows three existing MLabs patterns end-to-end so there
is no novel plumbing:

1. **Reuse the user-search infrastructure for the picker.**
   `apps/web/src/app/api/v1/admin/users/route.ts` already exposes
   `listUsersOp` (paginated, name+email search). The new "Assign owner" modal
   on `/admin/businesses/[id]` is a thin wrapper around that same fetch:
   debounced input → `apiClient` call → render results → admin clicks a row
   → confirm step (shows the selected user's name+email and the business
   name) → submit. Mirrors how `/admin/users` filters by search term today.

2. **Reuse `sendAdminNotification` as the structural template for broadcasts.**
   `packages/services/src/admin/service.ts:sendAdminNotification` already
   does the 1:1 "create notification + audit" pair. The new
   `sendBusinessOwnerBroadcast` follows the same shape but fans out: one
   audit row (with recipient count in meta), N notification rows in a single
   transaction. Targeting query: `user.id IN (SELECT owner_user_id FROM
   businesses WHERE owner_user_id IS NOT NULL AND deleted_at IS NULL)`,
   excluding banned users (`banned_at IS NULL`).

3. **Reuse `NotificationEmail` for the link email.**
   The generic template at `packages/email/src/templates/notification.tsx`
   already takes `{ title, body, ctaLabel, ctaUrl }`. The link-event email
   passes `title="You've been listed as a business owner"`,
   `body="An admin at AIRA has listed you as the owner of {business.name}…"`,
   `ctaLabel="View your listings"`, `ctaUrl={authBaseUrl}/account/listings`.
   No new template file is added.

The HTTP-first rule from CLAUDE.md is preserved throughout: every new entry
point is `/api/v1/admin/*`, business logic lives in `packages/services`,
schemas live in `packages/validators`, the admin RSC reads via
`apiServerFetch`, client mutations go through `apiClient`. No new
`"use server"` directives.

The migration adds one nullable column and one index — small, safe, and
non-destructive. `ON DELETE SET NULL` means deleting a user (or any future
anonymise-in-place) cleanly drops the ownership link without cascading
into the business row.

**Alternatives considered:**

- **A separate `business_owners` join table** for many-to-many ownership —
  rejected: PRD spec'd `owner_user` as a singular nullable FK
  (line 336); multi-owner is explicitly deferred per the PM decision; an
  unused join table is dead schema weight.
- **A boolean `is_business_contact` flag on `user`** (PRD spec, line 907) —
  rejected: derivable from the FK existence (`EXISTS (businesses WHERE
  owner_user_id = u.id AND deleted_at IS NULL)`), so the flag would be
  denormalisation requiring trigger maintenance. The PRD's flag was a
  Bubble-shaped concession; the FK is the better source of truth.
- **Reuse `kind: "generic"` for the broadcast** instead of adding a new
  notification body kind — rejected: makes future analytics ("how many
  broadcasts have we sent?") impossible without grepping `body.title`, and
  diverges from the typed-discriminator pattern locked in by every other
  notification kind. The cost of a new kind is one line in `NotificationBody`
  and one branch in `NotificationItem`.
- **Place the broadcast action on a new `/admin/broadcasts` page** —
  rejected per locked decision (G1 doesn't need its own nav surface).

## Data model changes

One column added to `businesses`:

```sql
ALTER TABLE businesses
  ADD COLUMN owner_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;

CREATE INDEX businesses_owner_user_idx ON businesses (owner_user_id)
  WHERE owner_user_id IS NOT NULL;
```

- `owner_user_id` — nullable FK to `user.id`. `ON DELETE SET NULL` so a user
  delete (or anonymise-in-place via `user.deleted_anonymized`) cleanly
  detaches without taking the business row with it.
- Partial index on the non-null subset, used by:
  - the targeting query for `sendBusinessOwnerBroadcast` (scan only the
    linked subset),
  - the "My Listings" page query (`WHERE owner_user_id = $1`),
  - the admin list-page "Has owner / No owner" filter (`IS NULL` / `IS NOT NULL`).

No new audit kinds in the DB itself (the column is text); they're added to
the typed allowlist in `packages/validators/src/audit-meta.ts` and the
`KNOWN_AUDIT_ACTIONS` array, with the compile-time coverage check enforcing
both updates.

Migration generated via `pnpm db:generate` after schema edit, applied with
`pnpm db:migrate`.

## Files to touch

**New:**

- `apps/web/src/app/(app)/account/listings/page.tsx` — RSC page; calls
  `apiServerFetch(listMyBusinessesOp)` and renders the read-only owner view
- `apps/web/src/app/api/v1/account/listings/route.ts` — `GET` handler
  returning the caller's owned businesses
- `apps/web/src/app/api/v1/admin/businesses/[id]/owner/route.ts` — `PUT`
  (assign) and `DELETE` (unassign) handlers
- `apps/web/src/app/api/v1/admin/businesses/broadcast/route.ts` — `POST`
  handler for the broadcast send
- `apps/web/src/features/admin/components/business-owner-section.tsx` —
  client component for the "Owner" panel on the business detail page,
  including the assign/unassign modal
- `apps/web/src/features/admin/components/business-owner-picker.tsx` —
  client component wrapping the debounced user-search input (reuses
  `listUsersOp` via `apiClient`)
- `apps/web/src/features/admin/components/business-broadcast-modal.tsx` —
  client component for the "Notify all business owners" modal (title +
  message + recipient-count confirmation + body preview)
- `apps/web/src/features/account/components/my-listings-card.tsx` — client
  list item component for `/account/listings`

**Edit:**

- `packages/db/src/schema/businesses.ts` — add `owner_user_id` column +
  partial index; update schema comments to note ownership semantics
- `packages/db/src/types.ts` — add `kind: "business_broadcast"` variant to
  `NotificationBody` discriminated union
- `packages/services/src/businesses/queries.ts` — add `getBusinessesOwnedBy`
  query; update `getBusinessByIdAdmin` to include `owner_user_id` + a joined
  `owner: { id, name, email } | null`
- `packages/services/src/businesses/service.ts` — add `assignBusinessOwner`
  and `unassignBusinessOwner` service functions (each writes one audit row;
  assign also fans out a notification + email to the new owner)
- `packages/services/src/businesses/index.ts` — re-export the new functions
- `packages/services/src/admin/service.ts` — add
  `sendBusinessOwnerBroadcast(db, ctx, args)`: single transaction → list
  recipients (linked, non-banned, non-archived business) → write one
  `business.broadcast_sent` audit row with recipient_count → bulk-insert
  N notification rows with `kind: "business_broadcast"`
- `packages/services/src/admin/index.ts` — re-export
- `packages/validators/src/businesses.ts` — extend `BusinessAdminSchema` (or
  the admin-projection schema) to include `owner_user_id` + nested owner
  object; add `AssignBusinessOwnerInputSchema`
- `packages/validators/src/admin.ts` — add `BusinessOwnerBroadcastInputSchema`
- `packages/validators/src/notifications.ts` — add Zod variant matching the
  new `business_broadcast` notification body kind
- `packages/validators/src/audit-meta.ts` — add three new variants to
  `AuditMeta`: `business.owner_assigned` (meta: `{ owner_user_id, owner_email }`),
  `business.owner_unassigned` (meta: `{ prev_owner_user_id }`),
  `business.broadcast_sent` (meta: `{ title, recipient_count }`); append the
  three keys to `KNOWN_AUDIT_ACTIONS`; add label overrides; the
  `_ActionsCoverage` assertion enforces both sides stay in sync
- `apps/web/src/features/admin/audit/render-detail.tsx` — add `case` branches
  for the three new audit kinds so the `never`-typed default doesn't fire
  a tsc error
- `apps/web/src/server/operations/businesses-admin.ts` — add
  `assignBusinessOwnerOp`, `unassignBusinessOwnerOp`,
  `sendBusinessOwnerBroadcastOp` (all `permission: "admin"`)
- `apps/web/src/server/operations/account.ts` (new if not present) or extend
  an existing account-side operations file — add `listMyBusinessesOp`
- `apps/web/src/features/admin/components/business-detail.tsx` — mount the
  new `BusinessOwnerSection` near the top of the detail layout (above
  Subscriptions, since ownership is the new identity context)
- `apps/web/src/app/admin/businesses/page.tsx` — add the "Notify all business
  owners" button to the header (right of "Add business"); add the "Owner"
  column + the "Has owner / No owner / Any" filter
- `apps/web/src/features/admin/components/business-list.tsx` (or wherever
  the table lives — verify in review) — render the owner-name cell + filter
  control
- `apps/web/src/app/(app)/account/page.tsx` — add a "My listings" entry to
  the `ACCOUNT_ITEMS` menu (always shown), routing to `/account/listings`
- `apps/web/src/features/notifications/components/notification-item.tsx` —
  add render branch for `kind: "business_broadcast"`; format as "AIRA
  team: {title}" with body as the preview; href routes to
  `/account/listings`
- `apps/mobile/app/(app)/notifications.tsx` — add render branch for
  `kind: "business_broadcast"` to the exhaustiveness-checked switch.
  **Required** even though mobile QA is deferred: `@aira/mobile` typecheck
  fails on any unhandled `NotificationBody` variant (see learnings.jsonl
  2026-06-17). The branch can mirror the web renderer's copy 1:1.
- `apps/web/src/features/admin/README.md` — update the admin domain doc to
  mention the new ownership + broadcast operations

Email plumbing reuses existing files:
- `packages/email/src/templates/notification.tsx` (unchanged) — call site
  supplies `title`, `body`, `ctaLabel`, `ctaUrl`
- `packages/email/src/url.ts` — verify `buildAuthUrl(authBaseUrl,
  "/account/listings")` is sufficient; no new builder needed

## Edge cases

- **Banned owner.** Targeting query for broadcasts filters
  `user.banned_at IS NULL`; banned users are still linked to their business
  (the FK isn't auto-removed on ban — admin owns the unlink decision) but
  don't receive notifications.
- **Deleted user.** `ON DELETE SET NULL` drops the FK; no orphans. The
  business is treated as un-owned afterwards. `business.owner_unassigned`
  is NOT auto-audited on user delete (the existing `user.deleted_anonymized`
  audit captures the user-side event; we don't want double-rows).
- **Archived business** (`deleted_at IS NOT NULL`). Excluded from broadcast
  targeting. The owner can still see archived businesses in "My Listings"
  with an archived label so they understand why their business isn't
  visible publicly. (Confirm in review.)
- **Reassigning an already-owned business.** Modal must read current owner
  from the business row and offer "Replace with…" semantics, not "Add another".
  PUT semantics: the API overwrites the FK; the email goes to the new owner
  and the audit row records the previous owner_id in meta. The previous
  owner is NOT emailed (per locked decision).
- **Self-assignment by an admin** (admin links their own user as owner of a
  business). Allowed; admins are not a separate role for receiving
  notifications (they're a superset). They get the email and inbox row like
  any other owner.
- **Empty recipient set on broadcast.** Modal recipient-count check shows
  "0 owners are linked. Nothing to send." and disables the Send button. No
  audit row written when the recipient count is zero (avoids noise).
- **Email send failure during link** (Postmark down). The link operation
  must still commit: assign → audit → in-app notification → email (best
  effort). Email failure logs to `error_log` but does NOT roll back the
  assignment. The user can be re-emailed via a separate (later) follow-up
  feature if needed; matches how `password_reset_sent` is audited even if
  the email itself fails.
- **Duplicate broadcast clicks.** The confirm step is the dedupe gate;
  client disables the Send button after first click. No server-side
  idempotency key in G1 (low traffic, admin-only).
- **User picker matches a banned user.** Picker should still show the user
  (with a "banned" tag) so the admin can deliberately link a banned account
  if intended, but the email won't deliver (Postmark) and they won't get the
  in-app row (createNotification has no banned check today — confirm
  behavior in review; may need to skip notification creation for banned).

## Acceptance criteria

- [ ] `businesses.owner_user_id` column exists (nullable FK to `user.id`,
      `ON DELETE SET NULL`); partial index `businesses_owner_user_idx`
      created
- [ ] `/admin/businesses/[id]` shows an "Owner" section listing the current
      owner (name + email) or an empty state with an "Assign owner" button
- [ ] "Assign owner" opens a modal with a debounced search input; typing
      ≥2 chars surfaces matching users from `listUsersOp`
- [ ] Selecting a user shows a confirm step displaying both the business
      name and the selected user's name+email; Cancel returns to the picker
- [ ] Submitting the confirm step writes the FK, records a
      `business.owner_assigned` audit row, creates an in-app notification
      for the new owner, sends a Postmark email titled "You've been listed
      as a business owner", and surfaces a success toast
- [ ] Re-running assign on an already-owned business overwrites the FK,
      audits with the previous owner in meta, emails only the new owner,
      and does NOT email the previous owner
- [ ] "Unassign" opens a confirm dialog; on confirm, nulls the FK and
      records a `business.owner_unassigned` audit row. No email sent.
- [ ] `/admin/businesses` list shows an "Owner" column (owner name, or "—")
      and a filter with "Any / Has owner / No owner"
- [ ] `/admin/businesses` header shows a "Notify all business owners"
      button next to "Add business"
- [ ] Clicking the broadcast button opens a modal with title + message
      fields; Submit reveals a confirm step showing the recipient count
      (e.g. "Will send to 12 business owners") + the message body as it
      will appear; recipient count excludes banned and unlinked users
- [ ] Confirming sends one notification per linked-non-banned owner, writes
      one `business.broadcast_sent` audit row with `recipient_count` in
      meta, and surfaces a success toast with the count
- [ ] If the recipient set is empty, the modal shows "0 owners are linked"
      and the Send button is disabled; no audit row is written
- [ ] `/account` shows a "My listings" menu item (always visible) linking
      to `/account/listings`
- [ ] `/account/listings` lists every business where `owner_user_id =
      ctx.userId` (active + archived, archived clearly labelled), each
      linked to its public detail page when active. Empty state shows
      "You aren't listed as an owner of any businesses yet." with a
      `mailto:supportEmail` link
- [ ] Receiving a `business_broadcast` notification renders cleanly in
      the notification bell + inbox, with copy distinguishable from a
      `generic` admin notification (e.g. "AIRA team:" prefix)
- [ ] `/admin/audit` filter dropdown lists the three new actions under the
      "business" optgroup; clicking a row renders a readable detail
      (not "[unknown action]")
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass
- [ ] Schema migration runs cleanly via `pnpm db:migrate` (advisory-locked)
      and is reversible by `DROP COLUMN owner_user_id;` (no destructive
      backfill)

## Open questions

For `/mlabs-review` to resolve before implementation.

- **Notification creation for a banned recipient.** Today
  `createNotification` doesn't check `banned_at`. Should
  `sendBusinessOwnerBroadcast` filter banned users at the targeting query
  (preferred — single source of truth), or rely on
  `createNotification` to skip banned recipients (would require changing
  the shared helper)? Plan currently filters at the targeting query.
- **Archived business in "My Listings"** — show them with an "Archived"
  badge (proposed), or hide entirely? Archived businesses still have a
  legitimate ownership relationship for record-keeping; recommend show with
  label, but reviewer to confirm.
- **Order of files-to-touch and atomic commits.** Standard sequence is
  schema → validators → services → operations → routes → admin UI →
  account UI → audit-render branches. `/mlabs-review` should fix the exact
  task list and ordering.
- **Does the `Notify all business owners` modal need an admin-side audit
  log link** ("View past broadcasts → /admin/audit?action=business.broadcast_sent")
  in G1, or defer? Cheap to add; reviewer's call.
- **Test coverage**. Plan implies new unit tests for
  `assignBusinessOwner`, `unassignBusinessOwner`,
  `sendBusinessOwnerBroadcast` in
  `packages/services/src/{businesses,admin}/__tests__/`. `/mlabs-review`
  should confirm the exact list and any e2e (Playwright) scope.
- **Mobile.** Per CLAUDE.md the mobile app shares the validator + REST
  layer. The new `/api/v1/account/listings` endpoint and the new
  notification kind will be reachable from mobile automatically once the
  Apple account approves. `/mlabs-review` should add an explicit "mobile
  out of scope, but verify REST endpoints don't break the mobile fetch
  client" item.
