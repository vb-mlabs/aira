# Plan: F20 v2 — Community admin queue, edit/delete, respondent visibility

**Date:** 2026-06-14
**Slug:** community-admin-v2
**Status:** reviewed
**Author:** vb-mlabs

---

## Problem

The F20 v1 admin queue at `/admin/community` (shipped 2026-06-14) only
shows PENDING posts and only supports approve/reject. Once a post is
approved (or expired/rejected), it falls off the admin's radar — there's
no view, no edit, no delete, and no way for the admin to see who's
offered to help.

This blocks three real operational needs:

1. **Post-approval lifecycle:** an approved post needs a typo fix or
   needs to be removed (spam-after-the-fact, abuse, sensitive content
   that slipped through). Admin currently has no surface.
2. **Privacy + trust visibility:** when a user reports something via
   email — "the responder on my post said something inappropriate" —
   admin has no way to inspect the respondent list. `listInterests` is
   strictly author-only by design (F20 review decision).
3. **Auditability:** today the audit log only catches the
   `business.archived` / `subscription_recorded` family. Post deletion +
   edits leave no trail, so a complaint a month later has no ground truth.

**Who benefits:** the AIRA admin operating the directory. End users
inherit a safer board (because admin can act post-approval) and the
moderation flow itself doesn't change for them.

**Success:** an admin opens `/admin/community`, filters to Approved,
finds a post with two respondents, expands to read their messages, fixes
a typo in the title via a modal, and (in a separate case) deletes a
spam post — every action shows up in `audit_log` with the actor + before/
after metadata.

---

## Scope

**In:**
- **Filter chips** at the top of `/admin/community`: Pending /
  Approved / Expired / Rejected. Default: Pending (preserves the daily
  workflow). Status read from `?status=` URL param so the admin can deep-
  link to "approved" if they're triaging a complaint.
- **Inline respondent expansion** on every card. A "X helping — view"
  affordance toggles a list under the card with each respondent's name,
  optional message, and joined-at timestamp. Lazy-fetched on first
  expand; cached in the component state for the rest of the session.
- **Hard delete** a post via a confirm dialog. Cascades through
  `post_interest` (FK ON DELETE CASCADE was set in migration `0021`).
  Records an `audit_log` row with the deleted title/body/status/author.
- **Edit** the title and body via a modal (uses existing
  `AdminFormModal` pattern). Edit is allowed on any status; status
  stays unchanged. Records an `audit_log` row with the before/after.
- **Service additions:** `deletePost(db, ctx, { id })`,
  `editPost(db, ctx, { id, title?, body? })`,
  `adminListInterests(db, ctx, { id })` (admin permission, bypasses the
  author-only guard).
- **Operations:** `deleteCommunityPostOp`,
  `editCommunityPostOp`, `adminListInterestsOp`.
- **REST surface:**
  - `DELETE /api/v1/admin/community/posts/[id]`
  - `PATCH /api/v1/admin/community/posts/[id]/edit` (title + body)
  - `GET /api/v1/admin/community/posts/[id]/interests` (admin permission)
- **AuditMeta variants:** `community.post_deleted`,
  `community.post_edited`.
- **Validator additions:** `EditPostInputSchema` (title + body, both
  optional, length-bounded), `DeletePostInputSchema` (just an id).
  Re-export from `@aira/validators/community`.

**Out (deferred):**
- **Bulk actions** ("approve all selected", "delete all flagged"). No
  multi-select today; one action per row.
- **Soft-delete + restore.** Hard delete only. The audit log carries the
  evidence; recovery is not a goal for v2.
- **Per-user post history** ("show me everything `vb-mlabs` has posted").
  Status filter only; no author filter.
- **Re-approve a rejected post.** Rejection is final. The user resubmits
  if needed.
- **Edit auto re-approve.** Edits never change status. Spam protection:
  admin must explicitly approve a pending post even after editing it.
- **Audit on approve/reject.** Already implicit in `post.status` +
  `approved_at` / `rejected_reason`. Adding a row per state change is
  duplicate signal without a clear benefit.
- **Audit on admin respondent view.** Reading respondents is read-only;
  per-view audit would balloon the log. If GDPR/privacy review needs it
  later, add then.
- **Author profile linking.** No "click author name → /admin/users/[id]"
  for now. Author email shows in the card; that's enough triage.

---

## Approach

### Filter chips

The existing `adminListCommunityPostsOp` already accepts `status?:
CommunityPostStatus`. The page just needs to read `searchParams.status`
and pass it through. A row of `Pill` (or just `<button>`) chips at the
top of the page selects the status; clicking a chip updates the URL via
`Link`. Active chip styling comes from comparing the chip's status to
`searchParams.status` (default `"pending"`).

Server-side: page is already `dynamic = "force-dynamic"` so searchParam
changes always re-fetch. No client hydration needed for the chips
themselves — they're plain `<Link>`s.

### Inline respondent expansion

Each `AdminPostRow` gets a footer line: "{interest_count} neighbour(s)
offered to help — view ▾" (or "{interest_count} offered" if 0). Clicking
toggles a state in the queue component:

```ts
const [expandedById, setExpandedById] = useState<Record<string, InterestRow[]>>({})
```

On first expand, `apiClient.get<{ items: InterestRow[] }>(...)`. On
subsequent expand, render from local state (cheap; admin's looking at
a small dataset). Collapse just hides the list — state stays warm.

Empty state for an approved post with `interest_count: 0` is just "No
respondents yet."

### Edit modal

Existing `AdminFormModal` works. The admin clicks "Edit" on a card,
which opens a modal with title + body inputs prefilled. Submit calls
`PATCH /api/v1/admin/community/posts/[id]/edit` with the changed fields.
On success: close modal, update the local card state with the new
values, no page reload.

Validator: `EditPostInputSchema` accepts `{ title?: string, body?:
string | null }` — both optional so a typo fix doesn't have to roundtrip
the body. Length bounds match `CreatePostInputSchema` (title 1-120, body
0-1000).

If both are absent or unchanged, return 400 `validation.input` ("Nothing
to update.").

### Delete with confirm

Confirm dialog (also `AdminFormModal` or a smaller `AlertDialog`
pattern). Body explains "This cannot be undone. The post + all
respondents will be removed permanently." On confirm:
`DELETE /api/v1/admin/community/posts/[id]`. Server writes the audit row
BEFORE the delete (same convention as `users.ts`), captures the post's
state into `metadata`, then deletes.

Card optimistically removes from the local list. If the server returns
an error, restore.

### Service authorisation

All three new functions take `ctx: CallerContext` and rely on
`defineOperation`'s admin permission gate at the route boundary. No
extra in-service check — the ops are admin-only. `adminListInterests`
intentionally bypasses the author-only guard that `listInterests`
enforces.

### Audit

Add to `AuditMeta` (in `packages/db/src/audit.ts`):

```ts
| {
    kind: "community.post_deleted"
    title: string
    body: string | null
    status: "pending" | "approved" | "expired" | "rejected"
    author_id: string
    interest_count: number
  }
| {
    kind: "community.post_edited"
    fields: ("title" | "body")[]   // which fields changed
    title?: { from: string; to: string }
    body?: { from: string | null; to: string | null }
  }
```

Both written BEFORE the mutation. If the audit insert fails, the
mutation is aborted (existing convention).

**Alternatives considered:**

- **Two pages (`/admin/community` = pending, `/admin/community/all` =
  everything else).** Rejected — duplicates the queue UI in two places;
  the filter chip approach keeps a single mental model.
- **Edit auto re-approves pending posts.** Rejected by the user — risk
  of accidental approval of spam.
- **Soft-delete with a Restore button.** Rejected by the user — wider
  surface area without a clear "we'd actually restore this" use case
  at MVP.

---

## Data model changes

- **None.** All capabilities are SELECT/UPDATE/DELETE on the existing
  `community_post` + `post_interest` tables (migration `0021`).
- `AuditMeta` discriminated union gains two variants in
  `packages/db/src/audit.ts` (type-only change, no SQL).
- Validators gain `EditPostInputSchema` + `DeletePostInputSchema` in
  `packages/validators/src/community.ts` (no new file).

---

## Files to touch

**New:**
- `apps/web/src/app/api/v1/admin/community/posts/[id]/edit/route.ts`
- `apps/web/src/app/api/v1/admin/community/posts/[id]/interests/route.ts` (admin variant — note this collides with the existing public/author route; see Open Questions)
- `apps/web/src/features/admin/community/respondent-list.tsx` (lazy-loaded inline list)
- `apps/web/src/features/admin/community/edit-post-modal.tsx` (uses `AdminFormModal`)
- `apps/web/src/features/admin/community/delete-confirm-dialog.tsx`
- `apps/web/src/features/admin/community/status-filter.tsx` (chip row, server-rendered `<Link>`s)

**Edit:**
- `apps/web/src/app/admin/community/page.tsx` — read `searchParams.status`, render `StatusFilter`
- `apps/web/src/features/admin/community/moderation-queue.tsx` — handle non-pending statuses (different action buttons), wire respondent expansion + edit + delete buttons
- `apps/web/src/server/operations/community.ts` — add `deleteCommunityPostOp`, `editCommunityPostOp`, `adminListInterestsOp`
- `packages/services/src/community/service.ts` — add `deletePost`, `editPost`, `adminListInterests`
- `packages/services/src/community/index.ts` — re-export
- `packages/validators/src/community.ts` — `EditPostInputSchema`, `DeletePostInputSchema`
- `packages/db/src/audit.ts` — add `community.post_deleted` + `community.post_edited` variants

---

## Edge cases

- **Admin tries to edit a post that was just deleted in another tab.** Service returns 404 `community.post_not_found`. UI surfaces the error and removes the stale card.
- **Admin clicks Edit then Cancel without changing anything.** Modal closes; no PATCH fires; no audit row.
- **Edit with both title and body unchanged.** Server returns 400 `validation.input` "Nothing to update." UI surfaces inline.
- **Title trimmed to empty string.** Same 400 — title min length 1 enforced by Zod.
- **Body trimmed to empty string.** Treated as `null` (matching `createPost` shape) — clears the body.
- **Hard delete while a user has the detail page open.** User's next interaction (refresh, "I can help" tap) returns 404; the public detail page degrades gracefully (existing `notFound()` path).
- **Audit insert fails mid-delete.** Service aborts; post stays. Admin sees an error inline. No partial state.
- **Respondent expansion when count is 0.** No fetch fires; the inline area shows "No respondents yet."
- **Respondent list size.** Admin can see up to whatever the service returns (default order: newest first). No pagination — unlikely to exceed a couple dozen per post at MVP volume; revisit if a single post grows past 50 helpers.
- **Filter chip on a status with zero posts.** Page shows the existing `EmptyState`, scoped to the active status ("No approved posts." / "No rejected posts.").
- **Author email column on rejected posts.** Already in `AdminPostRow`. The card already shows it for pending.

---

## Acceptance criteria

- [ ] `/admin/community?status=approved` shows only approved posts; the Approved chip is active.
- [ ] Default `/admin/community` (no `?status=`) shows Pending posts (existing daily workflow preserved).
- [ ] Each card shows "X neighbour(s) offered to help — view ▾"; clicking expands a list of respondents with names + messages. A second click collapses.
- [ ] First expand triggers exactly one `GET /api/v1/admin/community/posts/[id]/interests`; second expand is local.
- [ ] Edit button opens a modal prefilled with current title + body. Save updates the card in place and writes a `community.post_edited` audit row whose `fields` matches what changed.
- [ ] Edit with no changes returns 400 `validation.input` inline.
- [ ] Delete button opens a confirm. Confirm hard-deletes the post + interests via cascade, writes a `community.post_deleted` audit row with the snapshot fields populated, removes the card from the UI.
- [ ] `adminListInterests` returns the same rows regardless of which admin calls it (no author-only guard).
- [ ] Pending-status cards keep the existing Approve / Reject buttons; non-pending cards do NOT show those.
- [ ] All four status chips render even when their count is 0; switching to an empty status shows an empty state with the status name.
- [ ] `pnpm typecheck` passes; `pnpm --filter @aira/web lint` passes.

---

## Open questions

For `/mlabs-review` to resolve:

1. **Route collision: admin interests endpoint.** The public route already
   exists at `/api/v1/community/posts/[id]/interests` (author-only). The
   plan proposes a new `/api/v1/admin/community/posts/[id]/interests`.
   That's clean — but could we instead route through the existing public
   endpoint with admin permission widening the guard? Lean: separate
   admin path. Cleaner separation, matches the existing
   admin/community/posts pattern.
2. **Filter chip count badges.** Should each chip show "(N)" with the
   row count for that status? Cheap: one extra COUNT query per status.
   Costs ~4 extra COUNTs per page render. Probably worth it for the
   "I have 3 things to moderate" cue. **TBD in review.**
3. **Edit modal: clear-body affordance.** If admin wants to remove the
   body entirely, do they leave the textarea empty + save? Or do we need
   an explicit "Clear body" button? Empty save → null is fine for me;
   confirm in review.
4. **Delete confirm pattern.** Reuse `AdminFormModal` (consistent with
   edit) or use a lighter `AlertDialog` (consistent with
   `business-soft-delete`'s archive control)? Both work; review picks.
5. **Cache invalidation on edit/delete.** The current admin queue uses
   `router.refresh()` after mutations. Same here? Yes for delete (the
   list changes). For edit, the card already updates locally — calling
   `router.refresh()` causes a small flicker. Lean: skip `router.refresh()` on edit; rely on local state.
