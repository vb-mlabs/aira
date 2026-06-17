# Review: Author controls + threaded comments

**Date:** 2026-06-17
**Slug:** 2026-06-17-community-author-controls-and-comments
**Plan reviewed:** [2026-06-17-community-author-controls-and-comments.md](../plans/2026-06-17-community-author-controls-and-comments.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** Claude (mlabs-review)

---

## Summary

Plan is solid and ready to implement. Review surfaced one path
correction (the notification body union lives at
`packages/db/src/types.ts` + `packages/validators/src/notifications.ts`,
not at the non-existent `packages/services/src/notifications/types.ts`),
locked four blocker-class design decisions, and scoped six smaller v1
decisions. The implementation plan splits the work into 13 atomic tasks
that each leave the codebase typechecking-green.

## Findings

### Blockers (must fix before /mlabs-code)

- **Plan referenced a non-existent file `packages/services/src/notifications/types.ts`.**
  The canonical `NotificationBody` lives at
  `packages/db/src/types.ts` (because the jsonb column uses
  `$type<NotificationBody>()`), and the public over-the-wire schema lives
  at `packages/validators/src/notifications.ts`
  (`NotificationBodySchema`). The renderer branch lives at
  `apps/web/src/features/notifications/components/notification-item.tsx`.
  **Decision taken:** the new `post_comment` notification kind is added
  to all three locations. Captured in Tasks 9 + 10.

- **A stale duplicate exists at `apps/web/src/features/notifications/types.ts`.**
  It carries an outdated `NotificationBody` union missing the
  `post_interest` variant (and would be missing `post_comment` too if
  we follow it). Nothing in active code imports types from there for
  narrowing; readers pick up the validator schema instead. **Decision
  taken:** leave the stale file alone in this run (out of scope; it's
  unused), but flag a follow-up suggestion to either re-export from
  `@aira/db/types` or delete it.

### Concerns (raised, decided, recorded)

- **Concern:** Revert-to-pending audit shape — extend
  `community.post_edited` or write a separate audit kind?
  **Decision:** Separate audit kind `community.post_reverted_to_pending`
  with `{ from: "approved"; to: "pending"; prev_approved_at: string;
  prev_expires_at: string | null }`. Single semantic per audit row;
  keeps the `post_edited` shape stable. Implementation in Task 5.

- **Concern:** 1-level reply cap — DB trigger or service-layer only?
  **Decision:** Service-layer + Vitest cover. Matches how the
  1-active-post limit is enforced (service-only). No trigger in the
  migration. Implementation in Tasks 7 + 13.

- **Concern:** Top-level comment delete — cascade replies or tombstone
  parent?
  **Decision:** Cascade. `parent_id` FK declared `ON DELETE CASCADE`;
  replies disappear with the parent. Matches Reddit "deleted by
  author" semantics; keeps the DB clean.

- **Concern:** Form refactor approach.
  **Decision:** Extract `<PostFields>` (the four field rows: title,
  body, phone, email) into a shared component. New wrappers
  `PostCreateForm` (default trigger label + redirect-to-/account/posts
  on success) and `PostEditForm` (no trigger; controlled `open` + an
  `initialPost` prop + `onSaved` callback). The current
  `PostForm` export gets renamed to `PostCreateForm` and is re-exported
  for backwards compat. Implementation in Task 3.

- **Concern:** Standalone `/admin/community/comments` queue page.
  **Decision:** Skip for v1. Admin moderation lives inline on the
  existing admin post detail modal only.

- **Concern:** Discoverability of `/account/posts`.
  **Decision:** Account-hub link only, not the sidebar. Mirrors
  `/account/notifications` discovery. Implementation in Task 4.

- **Concern:** "Reply" affordance on a reply.
  **Decision:** Only top-level comments carry a "Reply" control.
  Replies render the body + delete (if author/admin) + relative time.

- **Concern:** `editMyPost` field scope.
  **Decision:** Accepts title, body, phone, email — all four
  user-editable fields. Mirrors what the create form collects.

- **Concern:** Comment email opt-out reuses `email_on_post_interest`
  for v1.
  **Decision:** Confirmed. No new user-table column.

- **Concern:** Hidden tombstone copy.
  **Decision:** "Comment removed by moderator." No author attribution
  on the tombstone; replies under it render normally.

### Suggestions (taken or deferred)

- **Suggestion:** Reconcile the stale `apps/web/src/features/notifications/types.ts`
  with the canonical db/types. **Deferred** — out of scope; nothing
  imports it for narrowing today. Followed up as a one-line entry in
  the report's "Follow-ups."

- **Suggestion:** Add a small DB-side check constraint
  `CHECK (status IN ('visible','hidden'))` for `post_comment.status`
  even though the column is a typed pgEnum. **Deferred** — Postgres
  enums already enforce this; redundant.

- **Suggestion:** Pagination on the comments list. **Deferred** — v1
  caps top-level comments at 50, sorted ASC. If a post hits that, v2
  adds cursor paging.

## Decisions locked

Net new decisions from this review:

- Audit kind `community.post_reverted_to_pending` (separate from
  `post_edited`).
- Service-only enforcement of the 1-level reply cap, covered by
  Vitest.
- `parent_id ON DELETE CASCADE` (replies follow parent into the void).
- `<PostFields>` extraction + `PostCreateForm` + `PostEditForm`
  separation; `PostForm` re-export retained for callers that don't
  need to switch shapes.
- Skip the `/admin/community/comments` standalone queue page for v1.
- Discovery via account hub only, not the sidebar.
- Reply affordance shows on top-level comments only.
- `editMyPost` accepts all four fields (title, body, phone, email).
- Email opt-out reuses `email_on_post_interest` in v1.
- Hidden tombstone copy: "Comment removed by moderator."
- Canonical notification body union touchpoints: `packages/db/src/types.ts`
  + `packages/validators/src/notifications.ts` + the renderer.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (one commit).

### Task 1: Validators — author-side post ops + `EditMyPostInputSchema`

- **Files:** `packages/validators/src/community.ts` (edit)
- **What:**
  - Add `EditMyPostInputSchema`: shape mirrors `EditPostInputSchema`
    but rejects unknown keys via `.strict()` and only allows
    `id` + `title?` + `body?` + `phone?` + `email?` (no status, no
    other admin-only fields). The `.refine()` predicate is the same
    as `EditPostInputSchema`'s widened version (at least one field
    must be present).
  - Add `MyPostsListOutputSchema`: `items: z.array(AdminPostRowSchema)`
    — author needs to see `rejected_reason` on their own row.
  - Re-use `DeletePostInputSchema` for `deleteMyCommunityPostOp` (the
    input shape is identical: `{ id }`).
- **Acceptance:** `pnpm --filter @aira/validators typecheck` passes.
  Manual parse trial: empty input rejected by `.refine()`, valid
  4-field input accepted.

### Task 2: Service — `listMyPosts` + `editMyPost` + `deleteMyPost`

- **Files:** `packages/services/src/community/service.ts` (edit)
- **What:**
  - `listMyPosts(db, ctx)`: SELECT against the existing `POST_SELECT`
    + author email join, filtered by `eq(communityPost.user_id,
    ctx.userId)`, ordered `desc(communityPost.created_at)`, mapped
    via `toAdminPostRow` (so the author sees `rejected_reason`).
  - `editMyPost(db, ctx, args)`:
    - Read the row first; throw `community.post_not_found` if
      missing.
    - Throw `community.forbidden` if `row.user_id !== ctx.userId`.
    - Reject with 400 (`community.post_not_editable`) if status is
      `expired` or `rejected`.
    - Compute the field diff (title / body / phone / email) using the
      same pattern as `editPost`.
    - If the row was `approved` AND at least one substantive field
      changed: also flip `status = "pending"`, `approved_at = null`,
      `expires_at = null`. Write TWO audit rows in the same tx:
      `community.post_edited` (existing kind) and
      `community.post_reverted_to_pending` (new kind from Task 5).
    - Return `{ post }` shaped as `AdminPostRow`.
  - `deleteMyPost(db, ctx, args)`: ownership guard + delegate to
    existing `deletePost`. FK cascade on `post_interest` (and
    `post_comment` once Task 6 ships) is unchanged.
  - Export all three from `packages/services/src/community/index.ts`.
- **Acceptance:** `pnpm --filter @aira/services typecheck` + `test`
  pass. New service-layer tests cover: list-only-owned, edit-revokes-
  approval-on-approved-source, delete-cascades-interests, forbidden
  for non-owner.

### Task 3: Form refactor — `<PostFields>` + `PostCreateForm` + `PostEditForm`

- **Files:** `apps/web/src/features/community/components/post-fields.tsx` (new) ·
  `apps/web/src/features/community/components/post-form.tsx` (edit) ·
  `apps/web/src/features/community/components/post-edit-form.tsx` (new) ·
  `apps/web/src/features/community/index.ts` (edit re-exports)
- **What:**
  - `<PostFields>` accepts `title`, `body`, `phone`, `email` + their
    setters, max constants, and a `showApprovedWarning` boolean. Renders
    the four field rows + the warning banner when the boolean is true.
    No Dialog, no submit handler.
  - `PostCreateForm` (renamed from existing `PostForm` body):
    - Owns the Dialog trigger.
    - Default trigger label `Post on ${brand.name}`.
    - Submit hits `POST /api/v1/community/posts`.
    - On success, `router.push("/account/posts?just_posted=1")` instead
      of `router.refresh()`.
  - `PostEditForm`: no trigger; controlled `open` + `onClose` +
    `initialPost: AdminPostRow` + `onSaved(post)` callback.
    - Submit hits `PATCH /api/v1/community/posts/[id]`
      (`editMyCommunityPostOp` from Task 8).
    - Shows the approved-warning banner when `initialPost.status ===
      "approved"`.
  - Keep `PostForm` re-export pointing at `PostCreateForm` so
    `apps/web/src/app/(app)/community/page.tsx` doesn't need to
    update.
- **Acceptance:** Existing `/community` board renders identical to
  pre-refactor (typecheck + lint + the existing community Vitest
  files pass). Component file under 200 lines each.

### Task 4: `/account/posts` RSC page + account hub link

- **Files:** `apps/web/src/app/(app)/account/posts/page.tsx` (new) ·
  `apps/web/src/features/community/components/my-posts-list.tsx` (new) ·
  `apps/web/src/app/(app)/account/page.tsx` (edit)
- **What:**
  - RSC server-fetches via `apiServerFetch(listMyCommunityPostsOp, …)`.
  - Page renders header + `<MyPostsList initial={…} />`.
  - `<MyPostsList>` is a Client Component: renders a per-row card
    showing title, status pill, relative time, interest count, and an
    Edit + Delete control. Edit opens `<PostEditForm>` controlled by
    local state; Delete shows an inline confirm + calls
    `apiClient.delete(...)`.
  - Empty state CTA: link back to `/community` with "Post on AIRA"
    copy via `brand.name`.
  - When the URL carries `?just_posted=1`, render a one-off "Submitted
    — waiting for moderation" toast at the top of the list. Use the
    same `StatusLine` pattern other admin pages use.
  - Add `{ href: "/account/posts", label: "My posts", icon: <pick> }`
    to `ACCOUNT_ITEMS` in `account/page.tsx`, between Notifications
    and Privacy.
- **Acceptance:** Navigating to `/account/posts` while signed-in shows
  the author's posts; signed-out request redirects to `/login`
  (existing `(app)` layout behaviour). The new account-hub link is
  visible + tappable.

### Task 5: Audit meta — `community.post_reverted_to_pending`

- **Files:** `packages/validators/src/audit-meta.ts` (edit)
- **What:** Add a new union member:
  ```
  | {
      kind: "community.post_reverted_to_pending"
      from: "approved"
      to: "pending"
      prev_approved_at: string  // ISO 8601
      prev_expires_at: string | null
    }
  ```
  Then wire the service in Task 2 to write this row when the
  revert-on-edit branch fires.
- **Acceptance:** `pnpm typecheck` green. A test in Task 2 triggers
  the revert and asserts both audit rows (`post_edited` +
  `post_reverted_to_pending`) land with the expected meta shapes.

### Task 6: DB schema + migration — `post_comment` table

- **Files:** `packages/db/src/schema/post-comment.ts` (new) ·
  `packages/db/src/schema/index.ts` (edit re-export) ·
  `packages/db/drizzle/migrations/0029_*.sql` (generated)
- **What:**
  - Define `postCommentStatusEnum` (`'visible' | 'hidden'`).
  - Define `postComment` table:
    - `id text PRIMARY KEY` (uuid).
    - `post_id text NOT NULL REFERENCES community_post(id) ON DELETE CASCADE`.
    - `parent_id text REFERENCES post_comment(id) ON DELETE CASCADE`
      (null for top-level).
    - `user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE`.
    - `body text NOT NULL`.
    - `status postCommentStatusEnum NOT NULL DEFAULT 'visible'`.
    - `created_at timestamp DEFAULT NOW() NOT NULL`.
    - `updated_at timestamp DEFAULT NOW() NOT NULL $onUpdate(() => new Date())`.
  - Indexes:
    - `(post_id, created_at)` for the list query.
    - `(user_id)` for "all comments by this user" admin lookups.
  - Generate via `pnpm db:generate`; apply via `pnpm db:migrate`.
- **Acceptance:** Migration file present (0029); `\d post_comment` in
  psql shows the table with correct FKs + indexes.
- **Pause if:** the next migration number isn't `0029` (check
  `packages/db/drizzle/migrations/` first). **Pause if** the generated
  migration includes anything beyond the table + enum + indexes — a
  collision/drift check.

### Task 7: Service — `comments.ts` (create / list / delete / moderate)

- **Files:** `packages/services/src/community/comments.ts` (new) ·
  `packages/services/src/community/index.ts` (edit re-export)
- **What:**
  - `createComment(db, ctx, args: { post_id, body, parent_id? })`:
    - Lookup the post; throw `community.post_not_found` if missing.
    - Throw 400 `community.post_not_active` if the post's status isn't
      `"approved"`.
    - If `parent_id` is provided: lookup the parent; throw
      `community.parent_not_found` / `community.parent_post_mismatch` /
      `community.reply_too_deep` (parent has non-null parent_id).
    - Insert the row with `status = "visible"`.
    - Fire two notifications inside best-effort `try/catch` (mirrors
      `addInterestOp`'s email pattern in `operations/community.ts`):
      one to the post author (skip if self); one to the parent
      commenter on reply (skip if same as post author).
    - Return the new row mapped to `CommentRow`.
  - `listComments(db, ctx, args: { post_id })`:
    - SELECT all comments for the post (visible + hidden).
    - For hidden: project `{ status: "hidden", body: null, user_id:
      null, user_name: null }`. Visible: full shape.
    - Group in memory: top-level first (parent_id IS NULL) sorted
      ASC, each with a `replies` array (parent_id matches that
      top-level's id) sorted ASC.
    - Cap at 50 top-level comments per post in v1 (sorted ASC).
  - `deleteComment(db, ctx, args: { id })`:
    - Lookup the row; throw `community.comment_not_found` if missing.
    - Ownership guard: caller must be `user_id === ctx.userId` OR
      have admin permission. Service signals this by accepting an
      optional `isAdmin: boolean` flag from the op handler.
    - Write `community.comment_deleted` audit row BEFORE the delete,
      snapshot includes `{ post_id, author_id, body, was_reply }`.
    - Delete the row; FK cascade removes replies if it was top-level.
  - `moderateComment(db, ctx, args: { id, action: "hide" | "restore" })`:
    - Admin only. Op handler enforces the permission gate.
    - Updates `status` accordingly.
    - Writes `community.comment_hidden` or
      `community.comment_restored` audit row.
- **Acceptance:** Vitest suite covers: create on non-approved post
  rejected; reply-too-deep rejected; visible/hidden projection in
  list; delete-by-author allowed; delete-by-stranger rejected;
  delete-cascades-replies; admin moderate flips status + writes audit.

### Task 8: Validators — comment schemas + audit meta + ops

- **Files:** `packages/validators/src/community.ts` (edit) ·
  `packages/validators/src/audit-meta.ts` (edit) ·
  `apps/web/src/server/operations/community-comments.ts` (new) ·
  `apps/web/src/server/operations/community.ts` (edit — add
  `listMyCommunityPostsOp`, `editMyCommunityPostOp`,
  `deleteMyCommunityPostOp`)
- **What:**
  - Add to `community.ts`:
    - `CommentRowSchema` — id, post_id, parent_id, user_id (nullable
      for hidden), user_name (nullable), body (nullable), status,
      created_at.
    - `ListCommentsInputSchema` — `{ post_id }`.
    - `ListCommentsOutputSchema` — `{ items: <thread shape> }`
      (top-level comments each with `replies` array).
    - `CreateCommentInputSchema` — `{ post_id, body: trim().min(1).max(1000), parent_id?: string }`.
    - `DeleteCommentInputSchema` — `{ id }`.
    - `AdminModerateCommentInputSchema` —
      `{ id, action: enum ["hide", "restore"] }`.
  - Add to `audit-meta.ts`:
    - `community.comment_hidden` `{ post_id, body_snapshot }`.
    - `community.comment_restored` `{ post_id }`.
    - `community.comment_deleted` `{ post_id, author_id,
      body_snapshot, was_reply: boolean }`.
  - `community-comments.ts`:
    - `listCommunityCommentsOp` (`permission: "user"`),
      `createCommunityCommentOp` (`"user"`),
      `deleteCommunityCommentOp` (`"user"` — service does the
      author-or-admin check, op handler reads
      `ctx.permission === "admin"`),
      `adminModerateCommentOp` (`"admin"`).
  - In `community.ts` ops, add the three author-side post ops:
    - `listMyCommunityPostsOp` — input
      `z.object({}).strict()`, output `MyPostsListOutputSchema`.
    - `editMyCommunityPostOp` — input `EditMyPostInputSchema`,
      output `{ post: AdminPostRowSchema }`.
    - `deleteMyCommunityPostOp` — input `DeletePostInputSchema`,
      output `{ ok: true }`.
- **Acceptance:** `pnpm typecheck` green. Validator parse trials match
  the documented shapes.

### Task 9: Route handlers — author-side posts + comments

- **Files:**
  - `apps/web/src/app/api/v1/community/my-posts/route.ts` (new) —
    GET binds `listMyCommunityPostsOp.runFromRequest`.
  - `apps/web/src/app/api/v1/community/posts/[id]/route.ts` (edit) —
    add `PATCH` (edit) + `DELETE` (delete) bound to the author-side
    ops. GET stays bound to `getCommunityPostOp`.
  - `apps/web/src/app/api/v1/community/posts/[id]/comments/route.ts`
    (new) — GET + POST.
  - `apps/web/src/app/api/v1/community/comments/[commentId]/route.ts`
    (new) — DELETE.
  - `apps/web/src/app/api/v1/admin/community/comments/[commentId]/route.ts`
    (new) — PATCH.
- **What:** Thin handlers; each file is 5–10 lines. `runtime = "nodejs"`
  on every one.
- **Acceptance:** Hitting each endpoint with `curl` while signed-in
  returns the expected shape; 403 from non-author / non-admin paths.

### Task 10: Notifications — new `post_comment` kind end-to-end

- **Files:** `packages/db/src/types.ts` (edit) ·
  `packages/validators/src/notifications.ts` (edit) ·
  `apps/web/src/features/notifications/components/notification-item.tsx`
  (edit)
- **What:**
  - Add to the `NotificationBody` union (db/types):
    ```
    | { kind: "post_comment"
        post_id: string
        post_title: string
        commenter_id: string
        commenter_name: string
        body_preview: string  // ≤ 140 chars
        is_reply: boolean
      }
    ```
  - Mirror in the Zod schema (validators/notifications.ts).
  - Renderer branch:
    - `is_reply === false`: title =
      `${commenter_name} commented on your post`.
    - `is_reply === true`: title =
      `${commenter_name} replied to your comment`.
    - message = `body_preview`.
    - href = `/community/${post_id}`.
- **Acceptance:** `pnpm typecheck` green. Manual: insert a
  `post_comment` notification via `pnpm db:studio`; bell renders
  correctly.

### Task 11: Public comments UI — `<CommentThread>` + `<CommentComposer>`

- **Files:** `apps/web/src/features/community/components/comment-thread.tsx`
  (new) ·
  `apps/web/src/features/community/components/comment-composer.tsx`
  (new) ·
  `apps/web/src/features/community/components/post-detail-modal.tsx`
  (edit) ·
  `apps/web/src/app/(app)/community/[id]/page.tsx` (edit) ·
  `apps/web/src/features/community/index.ts` (edit re-export)
- **What:**
  - `<CommentComposer>` — controlled textarea with character counter
    (≤1000) + a Submit button. Variant prop: `topLevel` (renders an
    "Add a comment" CTA above the textarea) vs. `reply` (renders the
    `@<parent author>` prefix + a cancel button). On submit, hits
    `POST /comments` and lifts the new row via `onPosted(comment)`.
  - `<CommentThread postId>` — Client Component. On mount, fetches
    `GET /comments`. Renders a list of top-level comments. Each
    top-level shows the body, author, relative time, a "Reply"
    button (only top-level), and a Delete button for the author + any
    admin viewer. When "Reply" is tapped, a `<CommentComposer
    variant="reply">` mounts inline below; on success, the new reply
    appends to the parent's `replies` array. Hidden tombstones render
    the locked copy "Comment removed by moderator" with no author
    attribution; their replies stay rendered.
  - Embed `<CommentThread postId={post.id} />` below the existing
    interest section in both `post-detail-modal.tsx` and
    `community/[id]/page.tsx`.
  - When the viewer is unauth or the post is not approved, the
    composer is replaced by a muted "Sign in to comment" / "This post
    isn't accepting comments yet" line.
- **Acceptance:** Manual smoke: comment + reply + delete + (admin
  hide) all reflect immediately. Hidden tombstone renders correctly.
  Plain text only (no HTML); pasting `<script>` shows as literal text.

### Task 12: Admin comments moderation strip

- **Files:** `apps/web/src/features/admin/community/comment-moderation.tsx`
  (new) ·
  `apps/web/src/features/admin/community/post-detail-modal.tsx` (edit)
- **What:**
  - `<CommentModeration postId>` fetches the same list endpoint as
    `<CommentThread>` (admin permission is implicit via the user's
    session). Per row: show the body (or its snapshot if hidden),
    author, status pill, and Hide/Restore + Delete actions. Calls
    `PATCH /api/v1/admin/community/comments/[id]` to flip status;
    calls `DELETE /api/v1/community/comments/[id]` to hard delete
    (the user-side endpoint accepts admin actors via service-layer
    gate).
  - Embed below the existing respondents section in the admin post
    detail modal.
- **Acceptance:** Admin can hide a visible comment + see it render as
  a tombstone for non-admin viewers. Admin can restore. Admin can
  delete (cascade through replies confirmed in DB).

### Task 13: Verification pass

- **Files:** none
- **What:**
  - `pnpm typecheck` — 10/10 green.
  - `pnpm lint` — only pre-existing errors remain (the same 8 found
    in the previous run).
  - `pnpm test` — all Vitest suites pass; new comments tests + new
    edit/delete-my-post tests included.
  - Manual smoke: end-to-end as a non-admin user — create post →
    redirect to `/account/posts` → see pending row → edit it (stays
    pending) → switch admin → approve → view as non-admin → edit
    again (reverts to pending) → delete it (interest + comment
    cascade verified in DB).
  - Comments smoke: signed-in user A comments; signed-in user B
    replies; user A deletes their comment + cascade removes B's
    reply; admin hides a separate comment + verify tombstone.
- **Acceptance:** All criteria above; no new lint regressions.

## Open questions

Nothing for `/mlabs-code` to escalate. Blockers + concerns all
resolved during this review.
