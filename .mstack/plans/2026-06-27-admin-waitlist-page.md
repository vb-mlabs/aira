# Plan: Admin waitlist page

**Date:** 2026-06-27
**Slug:** 2026-06-27-admin-waitlist-page
**Status:** reviewed
**Author:** vb-mlabs

---

## Problem

The marketing site has two pre-launch capture forms — the hero / footer
consumer waitlist and the "Get Listed Early" business form on the For-business
section. Both write to `packages/db/src/schema/waitlist.ts`. There is no admin
UI to read those rows.

Today the only way to see signups is `pnpm db:studio` or a raw SQL query
against the prod DB. That's fine for one curious peek; it's not fine for the
founder/ops loop of "who's signed up this week, let's reach out to the
business leads first." The pain is severest for business rows because they
carry a phone number + preferred contact window — actionable data that's
sitting unactionable.

Success = an admin lands on `/admin/waitlist`, picks Consumer or Business,
sees the most recent signups with the contact fields visible, and can copy
email/phone to paste into WhatsApp / mail / their notes app. Spam rows can be
deleted on the spot (with audit).

## Scope

**In:**
- New `/admin/waitlist` RSC page, requires `admin` (operate-tier), reachable
  from the sidebar's Operate group.
- Tabbed layout via URL state: `?tab=consumer` (default) | `?tab=business`.
  Mirrors the URL-state pattern used by `/admin/renewals?withinDays=…`.
- Consumer tab: columns = email, source, created_at. Copy-email button per row.
- Business tab: columns = name, business, email, phone, preferred_contact,
  preferred_time, source, created_at. Copy-email and copy-phone buttons per row.
- Sort: `created_at DESC` (newest first). Cap at 100 rows per tab, report
  total (`"showing 100 of N"` subtitle) — same shape as Renewals.
- Delete row action with confirm dialog. Wired to a new
  `deleteWaitlistEntryOp` (`permission: "admin"`). Writes an audit log entry.
- New service module at `packages/services/src/waitlist/` exposing pure
  `listAdmin(db, { type, limit })` and `deleteOne(db, { id })` functions.
- New ops at `apps/web/src/server/operations/waitlist-admin.ts` —
  `listWaitlistOp` + `deleteWaitlistEntryOp`.
- New API routes: `GET /api/v1/admin/waitlist?type=…` and
  `DELETE /api/v1/admin/waitlist/[id]`.
- New audit action `waitlist.delete` added to
  `packages/validators/src/audit-meta.ts` (`AuditMeta` + `KNOWN_AUDIT_ACTIONS`)
  and rendered by `apps/web/src/features/admin/audit/render-*`.

**Out (deferred):**
- "Mark as contacted" status. Would need a schema migration; defer until
  somebody actually wants the workflow rather than just the contact info.
- CSV export. The 100-row table covers the realistic launch volume; come back
  to this if the list ever overflows.
- PII gating (phone hidden for plain admins). User picked "any admin",
  flat read access — revisit if the team shape changes.
- Search / filter by email, source, date range. Cap at 100 newest is fine for
  pre-launch; add filters when total > a few hundred rows.
- Mutating `confirmed_at`. Reserved for a future double-opt-in flow; not
  touched here.
- Dashboard quick-link tile on `/admin`. Sidebar entry is enough; the dashboard
  is already crowded.

## Approach

**Layer up cleanly using the existing op + service pattern.** The repo has a
boring, well-trodden path for "admin RSC page reads list, admin client UI
mutates": Renewals (`/admin/renewals` + `subscription-followups` op +
service), Categories admin, etc. We follow it exactly — no new abstractions,
no Server Actions, no direct service imports in the page.

1. **Service** — `packages/services/src/waitlist/service.ts`:
   - `listAdmin(db, { type, limit })` → `{ items, total }`. `type` is
     `"consumer" | "business"`. Selects from `waitlist` filtered by `type`,
     ordered `created_at DESC`, limited to `Math.min(limit, 100)`. Computes
     `total` with a separate `count(*)` query against the same `where`.
   - `deleteOne(db, { id })` → `{ deleted: boolean }`. Plain `delete` by id;
     returns whether a row was removed (so the route can 404 cleanly).
2. **Ops** — `apps/web/src/server/operations/waitlist-admin.ts`:
   - `listWaitlistOp` — `permission: "admin"`, input
     `{ type: "consumer" | "business" }`, output `{ items, total }`.
   - `deleteWaitlistEntryOp` — `permission: "admin"`, input `{ id }`, calls
     `createAudit(db)` BEFORE the delete with `action: "waitlist.delete"` +
     `target: { type: "waitlist", id }` + `meta: { kind: "waitlist.delete",
     email, waitlist_type }`. Per the repo contract in `packages/db/src/audit.ts`,
     audit-first-then-mutate means a failed audit aborts the delete.
3. **API routes** — under `apps/web/src/app/api/v1/admin/waitlist/`:
   - `route.ts` — `export const GET = listWaitlistOp.runFromRequest`
   - `[id]/route.ts` — `export const DELETE = deleteWaitlistEntryOp.runFromRequest`
4. **Page** — `apps/web/src/app/admin/waitlist/page.tsx` (RSC,
   `dynamic = "force-dynamic"`, `metadata.title = "Admin · Waitlist"`):
   - `requireAdmin()` at top.
   - Parses `?tab=` (whitelist `consumer | business`, default `consumer`).
   - Calls `apiServerFetch(listWaitlistOp, { input: { type } })`.
   - Renders `<AdminPageHeader>`, a `<WaitlistTabs>` URL-state tab strip
     (RSC, plain `Link`s — same pattern as `/admin/renewals` chips), and one
     of two client tables.
5. **Client tables** —
   `apps/web/src/features/admin/waitlist/consumer-table.tsx` and
   `business-table.tsx`. Pure presentation + per-row mutation buttons
   (Copy / Delete). They call `apiClient` from `apps/web/src/lib/api-client.ts`
   for delete; `navigator.clipboard.writeText` for copy. Delete uses
   `router.refresh()` after success so the RSC re-fetches.
6. **Sidebar** — `apps/web/src/app/admin/_components/admin-sidebar.tsx`: add
   `{ href: "/admin/waitlist", label: "Waitlist", icon: ClipboardSignature,
   requires: "admin" }` to the Operate group, between Renewals and Community.
7. **Validators** — `packages/validators/src/waitlist.ts`: add
   `WaitlistAdminListInputSchema`, `WaitlistAdminListItemSchema` (DB row
   shape — `id`, `type`, `email`, `created_at` ISO string, `source`,
   `full_name?`, `business_name?`, `phone?`, `preferred_contact?`,
   `preferred_time?`), and `WaitlistAdminListOutputSchema`
   (`{ items, total }`).

**Why URL-state tabs over client state.** Bookmark-friendly, copy-paste-able,
plays well with the existing pattern (`?withinDays=` in Renewals,
`?tab=` already present elsewhere in `/admin/settings`). Refreshing after a
delete keeps the same tab.

**Alternatives considered:**

- **Two top-level admin pages (Waitlist / Business signups).** Rejected —
  the user picked the tabs option, and two routes would double the sidebar
  cost without adding value when the two lists are read at the same time.
- **Single combined table with a type chip.** Rejected for the same reason
  and because the business row has 7 extra columns; merging them into one
  table either makes consumer rows look sparse or business rows look cramped.
- **Server Action for delete instead of REST.** Rejected — the
  `check-no-server-actions` lefthook + CLAUDE.md rule says mutations go
  through `/api/v1/*` so mobile + web share the contract. Web wouldn't gain
  anything by carving out an exception here.
- **Add a `confirmed_at`-driven status filter now.** Rejected — column is
  reserved for the future double-opt-in flow; the form never sets it; adding
  a filter that always shows "unconfirmed" would be misleading UI.

## Data model changes

None to the `waitlist` table. The only schema-adjacent change is the audit
metadata union:

- `packages/validators/src/audit-meta.ts`:
  - Add to `AuditMeta`: `| { kind: "waitlist.delete"; email: string;
    waitlist_type: "consumer" | "business" }`.
  - Add `"waitlist.delete"` to `KNOWN_AUDIT_ACTIONS`.
  - Compile-time `assertExact` parity check at the bottom of the file already
    enforces both sides stay in sync.

No DB migration required.

## Files to touch

**New:**
- `packages/services/src/waitlist/service.ts`
- `packages/services/src/waitlist/index.ts`
- `apps/web/src/server/operations/waitlist-admin.ts`
- `apps/web/src/app/api/v1/admin/waitlist/route.ts`
- `apps/web/src/app/api/v1/admin/waitlist/[id]/route.ts`
- `apps/web/src/app/admin/waitlist/page.tsx`
- `apps/web/src/features/admin/waitlist/waitlist-tabs.tsx` (RSC, plain Links)
- `apps/web/src/features/admin/waitlist/consumer-table.tsx` ("use client")
- `apps/web/src/features/admin/waitlist/business-table.tsx` ("use client")
- `apps/web/src/features/admin/waitlist/row-actions.tsx` (shared copy/delete
  buttons + confirm dialog — `"use client"`)

**Edit:**
- `packages/validators/src/waitlist.ts` — add admin list schemas.
- `packages/validators/src/audit-meta.ts` — add `waitlist.delete` kind +
  string literal.
- `packages/services/src/index.ts` — re-export the new service.
- `apps/web/src/app/admin/_components/admin-sidebar.tsx` — add Waitlist nav row.
- `apps/web/src/features/admin/audit/render-detail.tsx` and `render-target.tsx`
  — handle the `waitlist.delete` kind / `waitlist` target_type so the audit
  log renders nicely.

## Edge cases

- **Tab querystring tampering.** Anything other than `consumer` / `business`
  defaults to `consumer`; do not 404. Same as Renewals' `withinDays`.
- **Race: delete a row twice from two tabs.** `deleteOne` returns
  `{ deleted: false }` for "already gone"; the route returns 404 in that
  case; the client surfaces a toast "Row was already removed" and refreshes.
- **Honeypot rows.** Rows captured before the `route.ts` fix shipped earlier
  today are normal `waitlist` rows (the buggy submissions never landed
  because Zod rejected them). No special handling needed — but if a
  badly-behaved bot future-trips the honeypot AND the row gets persisted by
  mistake, the admin can delete it like any other row.
- **Empty state.** Each tab handles `items.length === 0` with a one-line
  "Nothing here yet" panel — mirrors Renewals' "You're caught up" subtitle.
- **Large rows over 100.** Subtitle shows `Showing 100 of N · Older signups
  hidden`. Acceptable for MVP; revisit when pagination is needed.
- **Copy to clipboard on insecure context.** `navigator.clipboard` only
  works on HTTPS / localhost. Fall back to selecting the value in a
  temporary `<input>` + `document.execCommand("copy")` if needed — same
  pattern shadcn's data-table examples use. (Likely fine — admins use
  HTTPS in prod and localhost in dev.)
- **Audit failure during delete.** `createAudit()` throws on insert failure;
  per the contract the row is NOT deleted. Op surfaces the throw as a 500;
  client shows a generic toast.
- **Sidebar nav order.** Inserting Waitlist between Renewals and Community
  is a deliberate position choice — pre-launch context is closer to
  Renewals (revenue-adjacent) than to Community (content moderation).

## Acceptance criteria

- [ ] An admin can visit `/admin/waitlist` and see the Consumer tab populated
      with the newest 100 consumer rows in `created_at DESC` order.
- [ ] Clicking the Business tab updates the URL to `?tab=business` and
      renders the business columns (name, business, email, phone,
      preferred_contact, preferred_time, source, created_at).
- [ ] Each row has Copy Email and (Business tab only) Copy Phone buttons
      that write to the clipboard and show a brief "Copied" affordance.
- [ ] Each row has a Delete button that opens a confirm dialog; on confirm
      the row is removed, the table refreshes, and an `audit_log` entry with
      `action = "waitlist.delete"` is recorded.
- [ ] The Waitlist sidebar entry appears in the Operate group between
      Renewals and Community, visible to plain admins.
- [ ] `GET /api/v1/admin/waitlist?type=consumer` and `?type=business` both
      return `{ items, total }`; calling them without an admin session
      returns 401 (op `permission: "admin"`).
- [ ] `DELETE /api/v1/admin/waitlist/<id>` returns 204 on success, 404 when
      the id doesn't exist, 401 when unauthenticated.
- [ ] The mobile API client does NOT gain any new surface — these are
      admin-web-only ops, but the routes still live under `/api/v1/*` so the
      contract pattern is preserved.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pass.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **Icon choice for the sidebar entry.** `ClipboardSignature` (a sign-up
  feel), `MailPlus` (signup capture feel), or `Users` redux? Pick one of
  the existing Lucide icons already imported elsewhere in the admin shell.
- **Should the page render a small two-tile counts header** (Consumer total,
  Business total)? Adds one extra `apiServerFetch` call (or one extra op
  that returns both totals). Probably yes for at-a-glance triage, but the
  scope above keeps it minimal — confirm whether to include.
- **Empty-state copy.** Want a CTA line ("Share the waitlist link…") or
  just "Nothing here yet"? Defaults to the latter.
- **Source column display.** The `source` enum (`marketing-hero`,
  `marketing-footer`, `business-mailto`, `business-listing-cta`) is
  internal-looking. Should we render a human label (e.g. "Hero form",
  "Footer form") via a small map, or expose the raw value? Defaults to a
  human label map declared inline in the table component.
- **Delete confirm UX.** Lucide trash icon button → shadcn AlertDialog (used
  elsewhere in admin), or a simpler `window.confirm`? AlertDialog is more
  consistent; confirm is fewer files.
