# Review: F20 v2 — Community admin queue, edit/delete, respondent visibility

**Date:** 2026-06-14
**Slug:** community-admin-v2
**Plan reviewed:** [2026-06-14-community-admin-v2.md](../plans/2026-06-14-community-admin-v2.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** claude-sonnet-4-6

---

## Summary

Plan is sound. One product question resolved (filter chip count badges:
yes). Four implementation-detail questions decided as reviewer (admin
interests route shape, clear-body affordance, delete confirm pattern,
router.refresh on edit). Two file-list corrections folded in: the
existing `[id]/route.ts` already exports PATCH and is the right place
for the new `DELETE`, and `EditPostInputSchema` needs the path-forwarded
`id`. Six implementation tasks, ordered to keep each commit
typecheck-clean.

---

## Findings

### Blockers (must fix before /mlabs-code)

- **Existing `[id]/route.ts` is the right home for `DELETE`.** The plan
  listed delete under "Edit: routes" without naming the file; doing
  this right means `export const DELETE = deleteCommunityPostOp.runFromRequest`
  appended to the existing
  `apps/web/src/app/api/v1/admin/community/posts/[id]/route.ts`.
  **No new file for delete.** Edit lands as a separate sub-route file
  (`[id]/edit/route.ts`) because the existing PATCH on `[id]` is owned
  by `adminModerateCommunityPostOp` and re-mapping its action
  discriminator now would be a behavior-extending refactor for no
  payoff.

- **`EditPostInputSchema` and `DeletePostInputSchema` need a path-`id` field.**
  `defineOperation` merges dynamic params into the input via
  `_context.params`. The schema's `id: z.string().min(1)` lets the
  route's `{ params: { id } }` flow into the handler. Plan implied this
  but didn't write it.

### Concerns (raised, decided, recorded)

- **Concern:** Reviewer Q1 — separate admin interests route at
  `/api/v1/admin/community/posts/[id]/interests` vs widening the
  existing public `/api/v1/community/posts/[id]/interests` GET to allow
  admin to bypass the author guard.
  **Decision:** Separate admin route. Matches the existing
  `/api/v1/admin/community/posts/*` pattern, keeps the public service
  function (`listInterests`) untouched (it still throws 403 for
  non-authors), and gives admin its own audit-friendly entry point.

- **Concern:** Reviewer Q3 — clear-body affordance.
  **Decision:** Empty save → null. No explicit "Clear body" button.
  Admin clears the textarea and clicks Save; the service interprets a
  trimmed-empty body as a request to set `body = null`. Matches
  `createPost` semantics.

- **Concern:** Reviewer Q4 — delete confirm pattern.
  **Decision:** Use the lighter `@base-ui/react/alert-dialog`
  pattern, same as `apps/web/src/features/admin/components/archive-control.tsx`.
  `AdminFormModal` is overkill for a single yes/no.

- **Concern:** Reviewer Q5 — `router.refresh()` after edit.
  **Decision:** Skip. The modal updates the local card state with the
  fresh `AdminPostRow` returned from the PATCH, which is sufficient.
  `router.refresh()` would re-fetch the full list and flicker. Delete
  keeps `router.refresh()` because the list shape changes (row
  removed); skipping it would let a stale row reappear from cache on a
  subsequent navigation.

- **Concern:** Filter chip count query — separate `adminPostStatusCountsOp`
  vs extending `adminListCommunityPostsOp` output to include the
  4-status count breakdown.
  **Decision:** Extend `adminListCommunityPostsOp` output with a
  `status_counts: { pending: number, approved: number, expired: number,
  rejected: number }` field. Same RSC render fires both queries
  together; saves a network round-trip. Implemented as a single
  `SELECT status, count(*) FROM community_post GROUP BY status` in the
  service.

- **Concern:** Pending-status guard on action buttons. Plan says
  "non-pending cards do NOT show Approve / Reject" — confirmed; the
  moderate API rejects approve/reject on non-pending state anyway, but
  hiding the UI affordance keeps the surface honest.
  **Decision:** Approve / Reject only render when `post.status ===
  "pending"`. Edit + Delete render on every status. Respondent
  expansion renders on every status that can have respondents
  (approved + expired — pending has zero by definition; rejected too).

### Suggestions (taken or deferred)

- **Suggestion:** Extract title/body length bounds (1-120, 0-1000) into
  shared constants in the validators file so `CreatePostInputSchema`
  and the new `EditPostInputSchema` share one source of truth.
  **Taken** — small but worth it.

- **Suggestion:** Add a "soft warning" when admin tries to delete a
  post that has respondents (e.g. "5 neighbours offered to help — they
  won't be notified.").
  **Deferred.** Useful nuance; the confirm dialog body can include the
  count without UX rebuild. Not a blocker; can land as a polish PR
  later.

---

## Decisions locked

1. **Filter chips:** Pending (default) / Approved / Expired / Rejected,
   read from `?status=` URL param. Each chip shows `(N)` from the
   grouped COUNT query.
2. **Edit anytime, status unchanged.** Edit works on any status; never
   re-approves a pending post.
3. **Hard delete with cascade.** No soft delete. Audit row written
   BEFORE the delete, captures `{ title, body, status, author_id,
   interest_count }`.
4. **Reject is final.** No un-reject button. Delete is the only undo.
5. **Inline respondent expansion.** Lazy-fetched on first click; cached
   in component state thereafter. No drawer, no detail route.
6. **Audit on delete + edit only.** Approve / reject already tracked
   via `post.status` + `approved_at` + `rejected_reason`; admin
   respondent view is read-only and unaudited.
7. **Admin interests route is a separate path** under
   `/api/v1/admin/community/posts/[id]/interests`. Existing public
   `listInterests` author-only guard untouched.
8. **Empty save clears body.** No "Clear body" button.
9. **Delete confirm uses base-ui AlertDialog** (same as `ArchiveControl`).
   Not `AdminFormModal`.
10. **No `router.refresh()` after edit.** Delete still refreshes
    (list shape changes).
11. **`status_counts` lives on `adminListCommunityPostsOp` output.**
    Single op, one round-trip from the page.

---

## Implementation plan

### Task 1: Validators (Edit + Delete inputs, status_counts, shared length bounds)

- **Files:**
  - `packages/validators/src/community.ts` (edit)
- **What:**
  - Add `TITLE_MAX = 120`, `BODY_MAX = 1000` as module-level constants
    exported as `COMMUNITY_POST_TITLE_MAX` / `COMMUNITY_POST_BODY_MAX`.
    Reuse in the existing `CreatePostInputSchema` (replace the inline
    120/1000 with the constants).
  - Add `EditPostInputSchema`:
    ```ts
    z.object({
      id: z.string().min(1),
      title: z.string().trim().min(1).max(TITLE_MAX).optional(),
      body: z.string().trim().max(BODY_MAX).nullable().optional(),
    })
      .strict()
      .refine((v) => v.title !== undefined || v.body !== undefined, {
        message: "Nothing to update.",
      })
    ```
  - Add `EditPostOutputSchema`: `{ post: AdminPostRowSchema }`.
  - Add `DeletePostInputSchema`: `{ id: z.string().min(1) }` strict.
  - Add `DeletePostOutputSchema`: `{ ok: z.literal(true) }`.
  - Add `AdminListInterestsInputSchema`: `{ id: z.string().min(1) }`
    strict; reuse `ListInterestsOutputSchema` for the output.
  - Add `StatusCountsSchema`:
    ```ts
    z.object({
      pending: z.number().int().nonnegative(),
      approved: z.number().int().nonnegative(),
      expired: z.number().int().nonnegative(),
      rejected: z.number().int().nonnegative(),
    })
    ```
  - Extend `AdminListPostsOutputSchema` with `status_counts: StatusCountsSchema`.
- **Acceptance:**
  - `pnpm --filter @aira/validators typecheck` clean.
  - `EditPostInputSchema.parse({ id: "x" })` throws "Nothing to update."
  - `EditPostInputSchema.parse({ id: "x", title: "" })` throws on
    min length (after trim).
  - `EditPostInputSchema.parse({ id: "x", body: null })` succeeds
    (admin clearing the body).
  - `AdminListPostsOutputSchema.parse({ items: [], total: 0, page: 1,
    pageSize: 25 })` now THROWS because `status_counts` is required
    (intentional — every caller must provide it).

---

### Task 2: AuditMeta variants (delete + edit)

- **Files:**
  - `packages/db/src/audit.ts` (edit)
- **What:** Add two variants to the `AuditMeta` discriminated union:
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
      fields: Array<"title" | "body">
      title?: { from: string; to: string }
      body?: { from: string | null; to: string | null }
    }
  ```
  Add a header comment block above the variants explaining the audit
  intent (snapshot for delete, before/after for edit).
- **Acceptance:** `pnpm --filter @aira/db typecheck` clean.

---

### Task 3: Service additions (deletePost, editPost, adminListInterests, status counts)

- **Files:**
  - `packages/services/src/community/service.ts` (edit)
  - `packages/services/src/community/index.ts` (edit — re-export)
- **What:**
  - `deletePost(db, ctx, { id })` — fetches the post (404 if missing),
    returns the row's snapshot fields to the caller for audit logging
    (the audit call happens in the operation, NOT the service, to keep
    the service pure of `createAudit` knowledge — same pattern as
    `editPost` below). Then `db.delete(communityPost).where(eq(id, id))`.
    Cascade drops `post_interest` rows. Returns `{ snapshot: { title,
    body, status, author_id, interest_count } }`.
  - `editPost(db, ctx, { id, title, body })` — fetches the post (404 if
    missing), captures `before = { title, body }`. Builds the update set
    from defined fields only (don't overwrite a field the caller didn't
    send). When `body` is the trimmed-empty string OR explicit `null`,
    set to `null`. Returns `{ post: AdminPostRow, before: { title?, body? } }`
    so the op can write the audit row with old/new pairs.
  - `adminListInterests(db, ctx, { id })` — same query as `listInterests`
    BUT bypasses the author-only guard. Add an explicit `void ctx` line
    + comment noting that admin permission is enforced at the
    `defineOperation` boundary. Returns the same `{ items: InterestRow[] }`
    shape.
  - Status counts: add `getAdminPostStatusCounts(db)` that runs one
    `SELECT status, count(*)::int AS n FROM community_post GROUP BY status`
    and returns `{ pending, approved, expired, rejected }` with zeros
    for absent statuses.
  - Modify `adminListPosts` to call `getAdminPostStatusCounts` once
    and include it in the returned shape: `{ items, total, page,
    pageSize, status_counts }`.
  - Re-export the four new functions from `index.ts`.
- **Acceptance:**
  - `pnpm --filter @aira/services typecheck` clean.
  - Deleting a post with N interests cascades correctly (verified at
    schema level — FK ON DELETE CASCADE was set in `0021`).
  - Editing with only `title` doesn't touch `body` in the DB UPDATE.
  - `adminListInterests` returns rows regardless of `ctx.userId`.
  - `getAdminPostStatusCounts` returns zeros for statuses with no rows.

---

### Task 4: Operations + REST routes (delete, edit, adminListInterests)

- **Files:**
  - `apps/web/src/server/operations/community.ts` (edit — append ops)
  - `apps/web/src/app/api/v1/admin/community/posts/[id]/route.ts` (edit — append `DELETE`)
  - `apps/web/src/app/api/v1/admin/community/posts/[id]/edit/route.ts` (new)
  - `apps/web/src/app/api/v1/admin/community/posts/[id]/interests/route.ts` (new)
- **What:**
  - `deleteCommunityPostOp` — admin permission, input
    `DeletePostInputSchema`, output `DeletePostOutputSchema`. Handler:
    call `community.deletePost`, capture the returned snapshot, write
    an `audit_log` row with `kind: "community.post_deleted"` and the
    snapshot fields. Audit BEFORE the delete fires (service does the
    delete, but the order is preserved by writing the audit row inside
    the same handler before awaiting the delete — actually, since the
    service already deletes, we need to **fetch the snapshot in the op,
    write the audit, THEN call the service to delete**. Refactor:
    `community.deletePost` takes the snapshot fetch + delete as one
    call; the op wraps audit around that, fetching the post first via
    `community.adminGetPost` (a new tiny helper) for the audit
    snapshot, then calling delete. **Simpler:** keep the snapshot
    capture inside the service (since the service has to do it
    anyway), have the service return the snapshot, then the op writes
    the audit AFTER the service returns. Reject the
    "audit-before-mutation" convention here because the snapshot needs
    the row that no longer exists — we accept a small inversion (delete
    THEN audit) and document it.

    Actually — re-thinking the audit ordering: the convention is
    "audit row blocks the mutation when audit fails." For delete, we
    NEED the snapshot before the delete (the row is gone after). Best
    pattern: service fetches the snapshot, writes audit, then deletes,
    all inside a single transaction. If audit fails, the transaction
    rolls back and the row stays. **Lock this:** wrap the delete in
    `db.transaction(async (tx) => { snapshot ← select; createAudit(tx, ...); delete })`.
    The op's role is just to call the service.

  - `editCommunityPostOp` — admin permission, input `EditPostInputSchema`,
    output `EditPostOutputSchema`. Same transaction pattern: service
    snapshots `before`, writes audit with `before`/`after`, updates
    the row, all in one transaction.

  - `adminListInterestsOp` — admin permission, input
    `AdminListInterestsInputSchema`, output `ListInterestsOutputSchema`.
    Handler calls `community.adminListInterests`. No audit.

  - `[id]/route.ts` gains `export const DELETE =
    deleteCommunityPostOp.runFromRequest`. PATCH stays as moderate.

  - `[id]/edit/route.ts`: new file, exports `PATCH = editCommunityPostOp.runFromRequest`.

  - `[id]/interests/route.ts` (admin variant): new file. Exports
    `GET = adminListInterestsOp.runFromRequest`. Sits at
    `apps/web/src/app/api/v1/admin/community/posts/[id]/interests/`
    — distinct from the existing public path under
    `/api/v1/community/posts/[id]/interests`.

- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` clean.
  - `curl -X DELETE` on a post as admin: 200, response `{ ok: true }`,
    DB row gone, interests gone, `audit_log` row with
    `kind: "community.post_deleted"` and the snapshot.
  - `curl -X PATCH /edit` with `{ id, title }`: 200, response carries
    the updated post, audit row with `fields: ["title"]` and the
    correct from/to.
  - `curl -X PATCH /edit` with only `{ id }`: 400 `validation.input`
    "Nothing to update."
  - `curl GET /interests` as admin: 200, returns interests for ANY
    post.
  - `curl GET /interests` as a non-admin user: 403
    `auth.forbidden`.
- **Pause if:** the `createAudit` helper signature doesn't accept a
  transaction handle (`tx` instead of `db`). Same Pause if as F17
  T6 — check `audit.log` API before improvising.

---

### Task 5: Admin queue component refactor (filter chips + status-aware actions)

- **Files:**
  - `apps/web/src/features/admin/community/status-filter.tsx` (new)
  - `apps/web/src/features/admin/community/moderation-queue.tsx` (edit)
  - `apps/web/src/app/admin/community/page.tsx` (edit)
- **What:**
  - `status-filter.tsx`: server component. Takes `currentStatus:
    CommunityPostStatus` + `counts: StatusCounts` props. Renders four
    `<Link>` chips. Active chip styling derived from
    `currentStatus === chip.value`. Chip label format: `"Pending (3)"`.
    Uses `@aira/ui-web/utils` `cn` for active state.
  - `moderation-queue.tsx` refactor:
    - Rename to clarify it's not just moderation — keep file name but
      adjust the component name to `AdminCommunityList` (export both
      names from the same file via `export { AdminCommunityList as
      ModerationQueue }` for back-compat with any tests).
      **Actually: keep `ModerationQueue` to avoid touch surface in
      tests. Just update the JSDoc comment.**
    - Render Approve / Reject buttons **only when `post.status ===
      "pending"`**.
    - Add Edit + Delete buttons on every card. Edit opens the modal
      (Task 6). Delete opens the confirm (Task 6).
    - Add the inline respondent expander (Task 6).
    - Empty state copy varies by status: `"No pending posts."` /
      `"No approved posts yet."` / etc.
  - `page.tsx`:
    - Read `searchParams.status` (validate via `CommunityPostStatusSchema.safeParse`,
      fallback to `"pending"`).
    - Pass `status` into `adminListCommunityPostsOp` input.
    - Pass the returned `status_counts` to `StatusFilter`.
    - Render `<StatusFilter currentStatus={...} counts={...} />`
      above the queue.
- **Acceptance:**
  - `/admin/community` defaults to pending; the chip says
    "Pending (N)" with N matching the DB.
  - `/admin/community?status=approved` flips the active chip and the
    list.
  - Bad `?status=foo` falls back to pending silently.
  - Approve / Reject buttons absent on non-pending cards.
  - `pnpm --filter @aira/web typecheck` clean.
  - `pnpm --filter @aira/web lint` clean.

---

### Task 6: New UI primitives (respondent list, edit modal, delete confirm)

- **Files:**
  - `apps/web/src/features/admin/community/respondent-list.tsx` (new)
  - `apps/web/src/features/admin/community/edit-post-modal.tsx` (new)
  - `apps/web/src/features/admin/community/delete-confirm-dialog.tsx` (new)
- **What:**
  - **`respondent-list.tsx`** (client component): props `{ postId: string,
    interestCount: number }`. State: `expanded: boolean`,
    `items: InterestRow[] | null`, `loading: boolean`, `error: string |
    null`. Toggle button text:
    - `interestCount === 0`: "No respondents yet" (disabled button).
    - Otherwise: `"${interestCount} offered to help — ${expanded ? 'hide' : 'view'}"`.
    On first expand, GET `/api/v1/admin/community/posts/${postId}/interests`.
    Cache result; second expand renders from state. List rendering:
    name (bold) + relative time (muted) + the message (or italicised
    "No note attached" when null).
  - **`edit-post-modal.tsx`** (client component): props
    `{ post: AdminPostRow, onClose: () => void, onSaved: (post:
    AdminPostRow) => void }`. Uses `AdminFormModal` pattern from
    `apps/web/src/features/admin/components/admin-form-modal.tsx`
    (Dialog from `@base-ui/react/dialog`). Form fields: `title` (Input)
    and `body` (textarea). Initial values from props. Save button calls
    `PATCH /api/v1/admin/community/posts/${id}/edit` with ONLY the
    changed fields (compare current to initial). On 200, `onSaved` with
    the response post + close. On 400 "Nothing to update.", surface
    inline. Disable Save when no field changed.
  - **`delete-confirm-dialog.tsx`** (client component): uses
    `@base-ui/react/alert-dialog` (same as `ArchiveControl`). Props
    `{ post: AdminPostRow, onClose: () => void, onDeleted: () => void
    }`. Body copy: `"Delete \"${title}\"? This cannot be undone. The
    post and all respondents will be removed permanently."`. If
    `post.interest_count > 0`, append
    `"\n\n${count} neighbour${count === 1 ? "" : "s"} offered to help
    — they won't be notified."`. Confirm button calls `DELETE
    /api/v1/admin/community/posts/${id}`. On 200, `onDeleted` (parent
    removes the row from its local state + `router.refresh()`).
- **Acceptance:**
  - Respondent list expands and collapses; the network tab shows
    exactly one GET on first expand and zero on subsequent toggles.
  - Edit modal: typing a new title and saving lands the updated value;
    closing without changes does nothing.
  - Edit modal disables Save when nothing changed.
  - Delete confirm: cancelling does nothing; confirming removes the
    card from the list immediately and `audit_log` shows the snapshot
    row.
  - `pnpm --filter @aira/web typecheck` clean.

---

## Open questions

None remain — five plan-level open questions and one product question
(count badges) are all resolved + recorded above.
