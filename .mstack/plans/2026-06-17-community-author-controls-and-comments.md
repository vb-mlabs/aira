# Plan: Author controls (find / edit / delete own post) + threaded comments

**Date:** 2026-06-17
**Slug:** 2026-06-17-community-author-controls-and-comments
**Status:** implemented
**Author:** Claude (mlabs-plan)

---

## Problem

The Post-on-AIRA community board ships with three usability gaps that
surfaced once the rebrand went live:

1. **Pending posts vanish from the author's view.** `listPosts` filters
   to `status = "approved"`, so the author's freshly-submitted pending
   post is invisible everywhere except by URL (which they never see —
   the create form just calls `router.refresh()`). They have no way to
   tell whether the post was submitted successfully, what its status
   is, or when it was approved.
2. **Author can't edit or delete their own post.** `editCommunityPostOp`
   and `deleteCommunityPostOp` are gated `permission: "admin"`. An
   author with a stuck pending post is blocked from posting again by
   the 1-active-post limit and has no way out.
3. **No discussion on a post.** A neighbour can tap "I'm interested"
   but can't leave a public comment, ask a clarifying question, or
   start a thread. The author can't reply. The conversation either
   moves out-of-band (DMs, phone, email) or doesn't happen at all.

**Success:** authors find and manage their own posts; signed-in
neighbours can talk on each post (with one level of replies); admins
keep moderation control without drowning in a comment queue.

## Scope

**In:**

- **A — Find your own posts.**
  - New service entry `listMyPosts(db, ctx)` returning the caller's own
    posts across all statuses (pending + approved + expired + rejected),
    newest-first.
  - New op `listMyCommunityPostsOp` + route `GET /api/v1/community/my-posts`.
  - New RSC page `/account/posts` rendering the list with status pills,
    timestamps, interest counts, edit/delete affordances.
  - PostForm success: instead of `router.refresh()`, redirect to
    `/account/posts` so the user lands on their new pending post with
    a clear "Waiting for moderation" banner.
  - Sidebar/account-hub link to the new page.

- **B — Self-service edit + delete.**
  - New ops `editMyCommunityPostOp` + `deleteMyCommunityPostOp` with
    `permission: "user"`. Service-layer guards ensure the row belongs
    to the caller (`ApiError.forbidden` otherwise).
  - Edit semantics: any title/body/contact change on an `approved` row
    **reverts status to `pending`** and clears `approved_at` +
    `expires_at`. Edits on a `pending` row stay pending. Edits on
    `expired` or `rejected` rows are rejected with a 400.
  - Delete semantics: hard delete (FK cascade already covers
    `post_interest`; new FK cascade for `post_comment`). Audit row
    written BEFORE the delete inside one transaction (mirror existing
    admin delete pattern).
  - UI: edit + delete affordances on `/account/posts` rows; inline
    confirmation on delete; uses the existing post-form modal in
    "edit mode" (state initialised from row) for editing.
  - Author edit modal: warning copy when the source row is `approved`
    that saving will re-enter moderation.

- **C — Thread-style comments (1-level replies, post-moderation).**
  - New table `post_comment` (id, post_id FK→community_post,
    parent_id self-FK NULL for top-level, user_id FK→user,
    body TEXT, status pgEnum [`visible`, `hidden`], created_at,
    updated_at). Parent constraint: if `parent_id` is non-null, the
    parent's `parent_id` must be null (1 level cap, enforced via
    service layer + a check constraint).
  - Auto-publish: new comments insert with `status = "visible"`.
  - New ops + routes:
    - `GET /api/v1/community/posts/[id]/comments` — public list for a
      post, returns top-level comments + a nested `replies[]` per top-
      level. Hidden comments either omitted entirely OR replaced by
      a `{ status: "hidden" }` stub so the thread layout doesn't
      collapse if the moderation removes a parent. Locked below.
    - `POST /api/v1/community/posts/[id]/comments` — create
      `{ body, parent_id? }`. Service rejects when the target post is
      not `approved` (no commenting on pending/rejected/expired).
    - `DELETE /api/v1/community/comments/[commentId]` — user can
      delete their own; admin can delete any.
    - `PATCH /api/v1/admin/community/comments/[commentId]` — admin
      moderation: flip `status` to `hidden` (with optional reason in
      audit meta) or back to `visible`.
  - UI on `/community/[id]` detail (and the post-detail-modal in the
    board):
    - Thread region below the body + interest button.
    - Each top-level comment shows author, relative time, body, "Reply"
      action, and (when viewer is comment-author OR admin) a "Delete"
      action.
    - Reply textarea expands inline beneath the parent comment when
      "Reply" is tapped.
    - Replies render indented under their parent; "Reply" on a reply
      pre-fills with `@author` and posts as a sibling reply (still
      `parent_id` = top-level), so the thread stays one level deep.
    - Hidden comments render as a muted "Comment removed by moderator"
      placeholder so removed parents don't orphan their replies.
  - Notification on a comment: notify the post author when someone
    comments (new notification body kind
    `post_comment` with `{ post_id, post_title, commenter_id,
    commenter_name, body_preview }`).
  - Notify the parent commenter when someone replies (skip if they're
    the same as the post author — one notification per event).
  - Honour `user.email_on_post_interest` for now as the email opt-out
    for both interest + comments (avoids adding a new column this round
    — flag for separation if user opt-out granularity becomes a
    complaint).
  - Admin moderation surface: new section on the existing admin
    post detail modal showing the comment thread with hide/restore +
    delete actions per comment, plus an admin-wide
    `/admin/community/comments` queue showing the latest-30 visible
    comments across all posts (keeps moderation lightweight; no
    pre-moderation pipeline). Locked: skip the dedicated queue page
    this round if scope tightens — admin can still moderate inline
    from the post detail modal.
  - Audit kinds: new `community.comment_hidden`,
    `community.comment_restored`, `community.comment_deleted`
    (deleted captures author_id + body snapshot for the record).

**Out (deferred):**

- Unbounded reply nesting.
- Pre-moderation of comments.
- Reporting a comment (user-side flag → admin queue). Out for v1; if
  abuse appears, add a `post_comment_report` table.
- Comment edits. v1 lets you delete and re-post. Easier to spec than
  audit-tracked edits and matches Reddit's "edited" UX (which we'd
  otherwise need to render).
- Rich text / markdown in comments. v1 is plain text with
  `whitespace-pre-line`.
- @-mentions notifying mentioned users. v1 only notifies post author +
  parent commenter.
- Mobile parity (the community surface doesn't ship on mobile yet —
  validators stay backward-compatible so future mobile builds aren't
  broken by the new fields).
- Separate `email_on_post_comment` user preference — re-use the
  existing `email_on_post_interest` for now; revisit if the conflated
  toggle becomes a complaint.
- Per-comment edit indicators (no comment-edit in v1).
- Pagination on comments — v1 returns up to 50 top-level comments
  (sorted by created_at ASC). If a post hits that, we add cursor
  paging in v2.
- Migrating prior `post_interest.message` rows into comments. The
  interest-message field stays in the schema (already shipped) but
  isn't exposed in the UI; it stays available for any future "private
  note to author" feature.

## Approach

Three coordinated additions to the F20 surface — none of them
architectural. The shape is:

- **A** is a thin query + a thin page. `listPosts` already exists;
  `listMyPosts` is the same query without the status filter and with
  an `eq(communityPost.user_id, ctx.userId)` predicate. The
  `/account/posts` RSC mirrors `/community/page.tsx`'s server-fetch
  pattern. Post-create flow learns to redirect with a query-string
  flash (`?just_posted=1`) so the destination page can show a one-off
  toast.

- **B** is two ops + a UI revision. `editPost` and `deletePost`
  already exist on the service layer; we add `editMyPost` /
  `deleteMyPost` thin wrappers that assert author ownership before
  delegating. The "edit → revert to pending" rule lives in the
  service: when status was `approved` and at least one substantive
  field changed, we set `status = "pending"`, `approved_at = null`,
  `expires_at = null` inside the same transaction. The form modal is
  the same one PostForm renders today, but parameterised by an
  optional `initialPost` prop.

- **C** is the only piece introducing new data. A `post_comment`
  table with self-FK + status enum, a service module
  (`packages/services/src/community/comments.ts`) for create/list/
  delete/moderate, and a `<CommentThread>` component that renders the
  top-level + nested replies. Comments inherit the existing
  `permission: "user"` gate on the read endpoints so non-signed-in
  visitors never see them (matches how the board itself is gated).

The 1-active-post limit is unchanged: it counts pending + approved
rows owned by the user. Deleting a stuck pending post removes the
constraint, which is the entire point of self-service delete.

**Alternatives considered:**

- **Add a `parent_comment_id` for unbounded nesting.** Rejected at the
  question gate — UI density explodes on mobile, recursive CTEs make
  the list query non-trivial, and a 1-level cap covers the
  "neighbour-reply" use case the user described.

- **Pre-moderate comments.** Rejected at the question gate — kills
  conversational flow, scales badly for moderators. Post-moderation
  matches how every comparable product ships this.

- **Skip the "revert to pending" rule and trust authors to not
  bait-and-switch.** Rejected at the question gate — the
  bait-and-switch is the central reason moderation exists, and an
  edit silently moves the row out of moderation's purview. Re-entering
  moderation on edit is the correct safety property.

- **Put "My posts" on a top-level route `/my-posts`.** Rejected at the
  question gate — the account hub pattern is well-established and a
  new top-level entry adds sidebar noise.

- **Combine the interest message field into comments.** Rejected
  silently — the interest signal is already shipped and serves a
  distinct purpose ("this resonates" lightweight tap vs. "I want to
  say something"). Keeping them separate also means existing
  notification + email plumbing for interest doesn't churn.

## Data model changes

**New migration (`packages/db/drizzle/migrations/0029_post_comment.sql`,
generated via `pnpm db:generate`):**

```sql
CREATE TYPE "post_comment_status" AS ENUM ('visible', 'hidden');

CREATE TABLE "post_comment" (
  "id"          text PRIMARY KEY,
  "post_id"     text NOT NULL REFERENCES "community_post"("id") ON DELETE CASCADE,
  "parent_id"   text REFERENCES "post_comment"("id") ON DELETE CASCADE,
  "user_id"     text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "body"        text NOT NULL,
  "status"      "post_comment_status" NOT NULL DEFAULT 'visible',
  "created_at"  timestamp NOT NULL DEFAULT NOW(),
  "updated_at"  timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX "post_comment_post_idx"
  ON "post_comment"("post_id", "created_at");
CREATE INDEX "post_comment_user_idx"
  ON "post_comment"("user_id");
-- 1-level cap enforced at the service layer; we *also* want a check
-- constraint so a bug in the service can't violate it. The constraint
-- references a function that asserts the parent has parent_id IS NULL.
-- (Captured here as a TODO for /mlabs-review to lock the exact SQL —
-- some teams skip the DB-side check to keep migrations simple.)
```

Schema file `packages/db/src/schema/post-comment.ts` exposes the
table; `packages/db/src/schema/index.ts` re-exports.

No schema change to `community_post` or `post_interest` — the
1-level-revert-to-pending rule writes existing columns; the comments
table stands alone.

## Files to touch

**New:**

- `packages/db/src/schema/post-comment.ts` — Drizzle table + enum.
- `packages/db/drizzle/migrations/0029_*.sql` — generated.
- `packages/services/src/community/comments.ts` — create/list/delete/
  moderate service.
- `packages/services/src/community/index.ts` — re-export.
- `apps/web/src/server/operations/community-comments.ts` — five ops
  (listCommentsOp, createCommentOp, deleteCommentOp,
  adminModerateCommentOp, optionally adminListRecentCommentsOp).
- `apps/web/src/app/api/v1/community/posts/[id]/comments/route.ts` —
  GET + POST.
- `apps/web/src/app/api/v1/community/comments/[commentId]/route.ts` —
  DELETE.
- `apps/web/src/app/api/v1/admin/community/comments/[commentId]/route.ts`
  — PATCH.
- `apps/web/src/app/(app)/account/posts/page.tsx` — RSC list page.
- `apps/web/src/features/community/components/comment-thread.tsx` —
  list + reply UI.
- `apps/web/src/features/community/components/comment-composer.tsx`
  — textarea + post + reply variants.
- `apps/web/src/features/community/components/my-posts-list.tsx`
  — author-side row list with edit/delete actions.
- `apps/web/src/features/admin/community/comment-moderation.tsx` —
  admin inline moderation strip embedded in the admin post detail
  modal.

**Edit:**

- `packages/validators/src/community.ts`:
  - Add `PostCommentSchema`, `CreateCommentInputSchema`,
    `ListCommentsOutputSchema`, `DeleteCommentInputSchema`,
    `AdminModerateCommentInputSchema`, `MyPostsListOutputSchema`.
  - Add `EditMyPostInputSchema` (subset of `EditPostInputSchema`
    minus admin-only fields, but mirrors the four user-editable
    fields).
- `packages/validators/src/audit-meta.ts` — three new union members:
  `community.comment_hidden`, `community.comment_restored`,
  `community.comment_deleted` (captures snapshot for the record).
- `packages/services/src/community/service.ts`:
  - Add `listMyPosts(db, ctx)`.
  - Add `editMyPost(db, ctx, args)` thin wrapper around `editPost`
    with author-ownership guard + "revert to pending" rule when
    transitioning from approved.
  - Add `deleteMyPost(db, ctx, args)` thin wrapper around `deletePost`
    with author-ownership guard.
- `apps/web/src/server/operations/community.ts`:
  - Add `listMyCommunityPostsOp`, `editMyCommunityPostOp`,
    `deleteMyCommunityPostOp`.
- `apps/web/src/app/api/v1/community/my-posts/route.ts` (new).
- `apps/web/src/app/api/v1/community/posts/[id]/route.ts` — already
  serves GET; add `PATCH` for `editMyCommunityPostOp` and `DELETE`
  for `deleteMyCommunityPostOp`.
- `apps/web/src/features/community/components/post-form.tsx`:
  - Accept optional `initialPost` (Post or null) and `mode` (`create`
    | `edit`).
  - On submit-success, redirect to `/account/posts` (currently calls
    `router.refresh()`).
  - When `mode === "edit"` and source was approved, show banner
    "Saving these changes sends the post back for re-moderation."
- `apps/web/src/features/community/components/post-detail-modal.tsx`
  — embed `<CommentThread postId={post.id} />` below the existing
  interest section.
- `apps/web/src/app/(app)/community/[id]/page.tsx` — render the
  thread on the standalone detail page too.
- `apps/web/src/app/(app)/_components/app-sidebar.tsx` (or account
  hub) — link to `/account/posts`.
- `apps/web/src/app/(app)/account/page.tsx` — add the "My posts"
  card to the account hub.
- `apps/web/src/features/admin/community/post-detail-modal.tsx` —
  embed `<CommentModeration postId={post.id} />` below the existing
  respondent list.
- `apps/web/src/features/notifications/components/notification-item.tsx`
  — render the new `post_comment` notification body kind.
- `packages/services/src/notifications/types.ts` (or equivalent) —
  add `post_comment` discriminator to the notification body union.

## Edge cases

- **Author deletes their pending post → 1-active-post limit clears
  immediately.** Service-level race: ensure delete runs in a
  transaction so the FK cascade on `post_interest` + `post_comment`
  commits atomically.
- **Author edits approved post → revert-to-pending fires; live
  respondents' interest counts persist.** Existing `interest_count` +
  `post_interest` rows stay attached; the post is just back in
  moderation. Audit row captures the transition with
  `community.post_edited` + an additional `status_change` field. Lock
  exact audit-meta shape with `/mlabs-review`.
- **Author edits same fields back to original values → no
  status flip.** The "revert to pending" rule fires only when an edit
  actually changes a substantive field. Use the existing diff logic
  in `editPost` to drive this.
- **Comment on a non-approved post.** Service rejects with
  `community.post_not_active` (mirrors `addInterest`'s existing 400).
- **Reply parent is itself a reply (parent has non-null parent_id).**
  Service rejects with `community.reply_too_deep`. UI prevents it
  pre-flight by passing the top-level id as `parent_id`.
- **Reply parent has been hidden.** Allow replies still (the hidden
  comment renders as a tombstone); the reply belongs to the same
  thread. If the parent is hard-deleted, FK cascade removes replies
  too.
- **Deleting a top-level comment with replies.** Hard-delete cascades
  to replies. That matches Reddit's "deleted by author" behaviour and
  avoids ghost-reply trees. (Alternative: keep replies + tombstone
  parent. Decide in `/mlabs-review` — default to cascade.)
- **Long comment body / XSS.** Plain text, max 1000 chars, rendered
  via `{body}` JSX expression — React escapes by default.
- **N+1 in comment list.** One query for all comments belonging to
  the post (filter by `post_id`, order by `created_at`), assemble
  parent/replies in memory. With max ~50 comments per post this is
  cheap.
- **Notifications storm — author posts a comment on their own post →
  no self-notification.** Skip notify when `commenter_id ===
  post.user_id`.
- **Reply notification + author notification when commenter replies
  to author's top-level.** Combine: only fire the
  parent-commenter notification (the author already gets pinged for
  the top-level comment that contains the reply chain). Pragmatic
  but reviewer should confirm.
- **Hidden comment privacy.** Hidden body still lives in the DB.
  Public list endpoint returns `{ status: "hidden", body: null,
  user_id: null }` so the body never leaks.
- **Author deletes their own approved post → unfair to interested
  neighbours?** Surfaces in audit log; the cascade tells the story.
  Author is the source of truth for their post.
- **Author edits an expired or rejected post.** Out of scope —
  service returns 400 (`community.post_not_editable`).
- **`/account/posts` empty state.** Render the existing
  EmptyState component pointing back to the board with "Post on
  AIRA" CTA.

## Acceptance criteria

- [ ] DB migration applied; `post_comment` table exists with the
      shape above and the documented indexes.
- [ ] `GET /api/v1/community/my-posts` returns the caller's own
      posts across all statuses, newest-first; 401 for unauthed.
- [ ] `/account/posts` renders the list with status pill +
      relative-time + interest count, and an edit + delete control
      per row. Empty state surfaces the post-on-AIRA CTA.
- [ ] After creating a post, the user is redirected to
      `/account/posts` and sees their pending row at the top.
- [ ] Author can edit their own pending post; the row stays pending,
      audit row written.
- [ ] Author can edit their own approved post; the row reverts to
      pending, `approved_at` + `expires_at` cleared, audit row captures
      the transition.
- [ ] Author edit with no substantive change → no audit row, no
      status flip (matches existing no-op behaviour in `editPost`).
- [ ] Author can delete their own post regardless of status (except
      already-deleted); FK cascade removes `post_interest` +
      `post_comment` rows; the 1-active-post limit clears.
- [ ] Non-author trying any of the above gets 403.
- [ ] `POST /api/v1/community/posts/[id]/comments` with body creates
      a visible top-level comment; with `parent_id` creates a reply.
      Server rejects deeper nesting (parent has non-null `parent_id`).
- [ ] Public list endpoint returns top-level + replies grouped per
      top-level, oldest-first within each tier.
- [ ] Comment author can delete their own comment; admin can delete
      any. Cascade removes replies on top-level delete.
- [ ] Admin can flip a comment's status to `hidden`; the public list
      surfaces it as a tombstone with no body, no author name.
- [ ] Post author gets an in-app + (opt-in) email notification when
      anyone comments on their post.
- [ ] Parent commenter gets an in-app notification on a reply, unless
      they are the post author (in which case the post-author
      notification already fired).
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass.
- [ ] Grep: no admin-only "request" / "Ask the community" wording
      surfaces in any new code.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **Exact "revert to pending" audit shape.** The existing
  `community.post_edited` audit kind carries per-field before/after
  pairs. Should we add a `status: { from: "approved"; to: "pending"
  }` field there, or write a *separate* audit row with kind
  `community.post_reverted_to_pending`? Recommend the latter so the
  rebrand isn't part of an "edit" event semantically.
- **DB-side check constraint for 1-level reply cap.** The plan
  flagged this as a TODO. Some shops skip it (service-level only);
  the safer pick is `CHECK (parent_id IS NULL OR parent_id IN (
  SELECT id FROM post_comment WHERE parent_id IS NULL))` — Postgres
  doesn't allow subqueries in CHECK, so this becomes a trigger.
  Reviewer to lock: trigger, or trust the service layer + tests.
- **Admin comments queue page vs. inline-only.** Plan lists both. If
  scope tightens, drop the standalone `/admin/community/comments`
  page; inline moderation from the post detail modal is enough.
  Reviewer to lock.
- **Notification preference granularity.** Re-use
  `email_on_post_interest` for comment emails, or add
  `email_on_post_comment`? Plan defaults to re-use; reviewer can
  add the column if granularity matters in v1.
- **Should `editMyPost` accept the `phone`/`email` fields like
  `editPost` does?** Yes, but reviewer should explicitly confirm so
  the form fields aren't accidentally restricted by the validator.
- **Display name for hidden-comment tombstone.** "Comment removed by
  moderator" or just "Removed comment"? Lock the copy.
- **Reply UI affordance.** Should "Reply" appear on a reply (which
  posts as a sibling reply under the same top-level) or only on the
  top-level comment? UX trade-off; lock during review.
