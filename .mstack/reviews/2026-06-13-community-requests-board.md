# Review: F20 Community Requests Board

**Date:** 2026-06-13
**Slug:** community-requests-board
**Plan reviewed:** [2026-06-13-community-requests-board.md](../plans/2026-06-13-community-requests-board.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** claude-sonnet-4-6

---

## Summary

The plan is sound and ready to implement after five corrections to the files list
and four open-question resolutions. The approach (posts + private intent signal,
admin moderation, hourly expiry cron) fits the existing codebase patterns well.
The main structural fixes are: services use a folder-per-domain pattern
(not a flat file), the cron central file is `registry.ts` not `index.ts`,
two `package.json` export entries are missing, and the admin sidebar edit was
omitted. All open questions are now locked — see Decisions locked below.

---

## Findings

### Blockers (must fix before /mlabs-code)

- **Bottom tab bar is locked at 3 tabs.** The `bottom-tab-bar.tsx` comment
  reads "3-tab bottom bar locked by V4 mockup approved 2026-05-27." Community
  cannot be added there. Community nav entry goes in **`app-sidebar.tsx`**
  only — desktop sidebar + mobile hamburger drawer already expose it.
  Plan's vague "layout.tsx or nav component" edit corrected to
  `apps/web/src/app/(app)/_components/app-sidebar.tsx`.

- **Services are folder-per-domain, not flat files.** Every domain in
  `packages/services/src/` is a folder with its own `index.ts`
  (e.g. `notifications/`, `messages/`, `businesses/`). The plan lists
  `packages/services/src/community.ts` — must be
  `packages/services/src/community/index.ts`. The `package.json` also needs
  a new `"./community"` subpath export or the route handlers can't import it.

- **Cron central file is `registry.ts`, not `index.ts`.** No `index.ts`
  exists under `apps/web/src/lib/cron/`. The file to edit is `registry.ts`.

- **Two `package.json` export entries missing.**
  - `packages/validators/package.json` → add `"./community": "./src/community.ts"`
  - `packages/services/package.json` → add `"./community": "./src/community/index.ts"`

- **Admin sidebar edit missing from files list.** Adding `/admin/community`
  to the admin nav requires editing `ADMIN_NAV` in
  `apps/web/src/app/admin/_components/admin-sidebar.tsx`.
  `admin-mobile-sidebar.tsx` wraps `AdminSidebar` and inherits the change
  automatically — no separate edit needed.

### Concerns (raised, decided, recorded)

- **Concern:** `GET /api/v1/community/posts` is listed as "public" but all web
  UI lives inside the `(app)` auth shell. Does unauthenticated API access
  make sense?
  **Decision:** Keep it public at the API level. Mobile clients can call with a
  bearer token; the web UI will always be inside the auth shell and the RSC
  page will call `apiServerFetch` with the user session. The public flag is
  correct — it lets mobile access the board without session cookies.

- **Concern:** `community/[id]` page needs to handle the case where the
  current user is not the post author (interests endpoint returns 403).
  **Decision:** RSC page fetches interests in a try/catch. If 403, the
  respondents section is simply not rendered (no error state shown). Non-authors
  see the post content + a count "X people offered to help" (denormalized on
  the post row or a separate count endpoint), no names/messages.

- **Concern:** The `expirePosts` service targets `status = 'approved'` posts
  with `expires_at <= now()`. PENDING posts that have been sitting for months
  will never auto-expire.
  **Decision:** Acceptable for V1 (soft-launch, low volume). Admin moderation
  queue handles cleanup manually. Document in the cron job comment.

### Suggestions (taken or deferred)

- Add `interest_count` as a denormalized integer column on `community_post`
  (incremented on INSERT to post_interest, decremented on DELETE) so the
  public board can show "X offered to help" without a subquery on every page
  load. **Taken** — added to Task 1 schema.

---

## Decisions locked

1. **One active post per user:** Yes — 1 active (pending OR approved) post limit
   per user. `createPost` service checks before INSERT and returns a structured
   error if one exists. Rejected/expired posts do not count toward the limit.

2. **Respondent visibility:** Author-only. Non-authors see the post detail + a
   public count (`interest_count`), but no names/messages.
   `GET /api/v1/community/posts/[id]/interests` returns 403 for non-authors.

3. **Help signal content:** Responder name + optional message only. No profile
   contact info (phone/WhatsApp). Users who want to connect use the existing
   Messages feature.

4. **Admin edit before approve:** No — approve as-submitted. Admin can reject
   with a note asking the user to resubmit with corrections.

5. **Nav placement:** Sidebar only (no bottom tab bar). "Community" added as a
   `SidebarRow` in `app-sidebar.tsx`, positioned above the categories list.

---

## Implementation plan

### Task 1: DB schema + migration

- **Files:**
  - `packages/db/src/schema/community-post.ts` (new)
  - `packages/db/src/schema/post-interest.ts` (new)
  - `packages/db/src/schema/index.ts` (edit — export new tables)
  - `packages/db/src/types.ts` (edit — add `post_interest` NotificationBody variant)
- **What:** Define `communityPost` and `postInterest` Drizzle tables. Add `interest_count integer NOT NULL DEFAULT 0` column to `communityPost` (denormalized counter). Add `post_interest` to the `NotificationBody` discriminated union:
  ```ts
  | {
      kind: "post_interest"
      post_id: string
      post_title: string
      responder_id: string
      responder_name: string
      message: string | null
    }
  ```
  Run `pnpm db:generate` to produce the migration SQL. Seed `posts_expiry_days = "30"` in the migration via `INSERT INTO app_setting … ON CONFLICT DO NOTHING`. Then run `pnpm db:migrate` to apply.
- **Acceptance:**
  - `pnpm db:generate` produces a migration with both tables and the seed row
  - `pnpm db:migrate` applies cleanly
  - `pnpm typecheck` on the `@aira/db` package passes
- **Pause if:** Migration tool reports a destructive change to an existing table.

---

### Task 2: Validators

- **Files:**
  - `packages/validators/src/community.ts` (new)
  - `packages/validators/src/index.ts` (edit — re-export)
  - `packages/validators/package.json` (edit — add `"./community"` subpath)
- **What:** Zod schemas for:
  - `CreatePostInput` — `{ title: z.string().min(1).max(120), body: z.string().max(1000).optional() }`
  - `ListPostsInput` — `{ search?: string, page?: number, limit?: number }`
  - `ListPostsResponse` — array of `PostRow` + pagination metadata
  - `PostRow` — approved post shape (no `rejected_reason`, no `user_id`)
  - `AddInterestInput` — `{ message: z.string().max(300).optional() }`
  - `InterestRow` — `{ id, responder_name, message, created_at }`
  - `AdminPostRow` — full post row including `user_id`, `rejected_reason`
  - `AdminModerateInput` — `{ action: z.enum(['approve','reject']), rejected_reason?: string }`
  Add `"./community": "./src/community.ts"` to `exports` in `package.json`.
- **Acceptance:** `pnpm typecheck` on `@aira/validators` passes; all schemas importable via `@aira/validators/community`.

---

### Task 3: Community service

- **Files:**
  - `packages/services/src/community/index.ts` (new)
  - `packages/services/package.json` (edit — add `"./community"` subpath)
- **What:** Pure functions (each takes `db` as first arg, follows existing service conventions):
  - `createPost(db, ctx, { user_id, title, body })` — checks 1-active-post limit, INSERTs with `status='pending'`
  - `listPosts(db, { search?, page, limit })` — ILIKE search on title+body, filters `status='approved'`, orders by `created_at DESC`
  - `getPost(db, { id })` — returns approved post (or all statuses for admin variant)
  - `approvePost(db, { id })` — sets `status='approved'`, `approved_at=now()`, `expires_at = now() + posts_expiry_days days`; reads `posts_expiry_days` from `app_setting` (fallback 30)
  - `rejectPost(db, { id, rejected_reason? })` — sets `status='rejected'`
  - `addInterest(db, ctx, { post_id, user_id, message? })` — prevents self-interest, INSERTs into `post_interest`, increments `interest_count`, writes `post_interest` notification for post author
  - `removeInterest(db, ctx, { post_id, user_id })` — deletes row, decrements `interest_count`
  - `listInterests(db, { post_id, requesting_user_id })` — returns interests only if `requesting_user_id === post.user_id`, else throws a 403-equivalent
  - `expirePosts(db)` — `UPDATE community_post SET status='expired' WHERE status='approved' AND expires_at <= now()`, returns `rowsAffected`
  - `adminListPosts(db, { status?, page, limit })` — unfiltered list for admin
  Add `"./community": "./src/community/index.ts"` to `exports` in `package.json`. Include `"use server-only"` (or `import "server-only"`) at top.
- **Acceptance:** `pnpm typecheck` on `@aira/services` passes; `@aira/services/community` resolves without errors.

---

### Task 4: Community REST API routes

- **Files:**
  - `apps/web/src/app/api/v1/community/posts/route.ts` (new)
  - `apps/web/src/app/api/v1/community/posts/[id]/route.ts` (new)
  - `apps/web/src/app/api/v1/community/posts/[id]/interests/route.ts` (new)
- **What:**
  - `GET /api/v1/community/posts` — public, calls `listPosts`, returns paginated `PostRow[]`
  - `POST /api/v1/community/posts` — session required (Bearer or cookie), calls `createPost`; returns 409 if active-post limit hit
  - `GET /api/v1/community/posts/[id]` — public, calls `getPost`
  - `POST /api/v1/community/posts/[id]/interests` — session required, calls `addInterest`; returns 409 on duplicate or self-interest
  - `DELETE /api/v1/community/posts/[id]/interests` — session required, calls `removeInterest`
  - `GET /api/v1/community/posts/[id]/interests` — session required; calls `listInterests`, returns 403 if requester is not post author
  Follow `defineOperation` pattern from `@aira/api`; validate inputs with `@aira/validators/community` schemas.
- **Acceptance:** `pnpm typecheck` passes; each route reachable via `curl` with correct status codes for happy + auth-failure paths.

---

### Task 5: Admin REST API routes

- **Files:**
  - `apps/web/src/app/api/v1/admin/community/posts/route.ts` (new)
  - `apps/web/src/app/api/v1/admin/community/posts/[id]/route.ts` (new)
- **What:**
  - `GET /api/v1/admin/community/posts` — admin auth, calls `adminListPosts`, supports `?status=pending` filter and pagination
  - `PATCH /api/v1/admin/community/posts/[id]` — admin auth, calls `approvePost` or `rejectPost` based on `{ action }` body
- **Acceptance:** `pnpm typecheck` passes; non-admin request returns 403; happy-path approve + reject change the post's status in DB.

---

### Task 6: Expire-posts cron job

- **Files:**
  - `apps/web/src/lib/cron/expire-posts.ts` (new)
  - `apps/web/src/lib/cron/registry.ts` (edit)
- **What:** New job file exporting `JOB_NAME = "expire-posts"` and `runExpirePosts(runId)`. Uses `cronService.claimWithAdvisoryLock` pattern (same as `purge-soft-deleted.ts`). Calls `community.expirePosts(db)`, finishes run with row count. Register in `registry.ts` with hourly schedule `"0 * * * *"` (same as `sponsorship-status-rollover`).
- **Acceptance:** Job appears in `getRegisteredJobs()`. Admin cron page lists "expire-posts". `pnpm typecheck` passes.

---

### Task 7: Notification renderer — post_interest kind

- **Files:**
  - `apps/web/src/features/notifications/components/notification-item.tsx` (edit)
- **What:** Add `post_interest` case to the `renderBody` switch/if-else. Return:
  - `title`: `"${body.responder_name} can help with your request"`
  - `message`: `body.message ?? "Tap to view their details"`
  - `href`: `/community/${body.post_id}`
  The notification item is already a link when `href` is present — no structural changes needed.
- **Acceptance:** A `post_interest` notification row renders with the correct title, message, and link. `pnpm typecheck` passes.

---

### Task 8: Community feature components

- **Files:**
  - `apps/web/src/features/community/index.ts` (new)
  - `apps/web/src/features/community/types.ts` (new)
  - `apps/web/src/features/community/components/post-card.tsx` (new)
  - `apps/web/src/features/community/components/post-form.tsx` (new — "use client")
  - `apps/web/src/features/community/components/interest-button.tsx` (new — "use client")
  - `apps/web/src/features/community/components/post-list.tsx` (new — "use client" for pagination/search)
- **What:**
  - `PostCard` — displays title, body excerpt, `interest_count` badge, relative timestamp, "I can help" button slot
  - `PostForm` — Sheet-based create-post form with title (required) + body (optional textarea). Submits to `POST /api/v1/community/posts`. Shows 409 error as "You already have an active request — wait for it to expire or be resolved."
  - `InterestButton` — toggle button: "I can help" (idle) / "Offered to help ✓" (active state). POST / DELETE to interests endpoint. Disabled for post author.
  - `PostList` — client component: text search input (debounced, 300ms), paginated list of `PostCard`s, empty state, loading skeleton
- **Acceptance:** All components render without errors. TypeScript clean. No `process.env` direct access; no brand string literals outside `@aira/config`.

---

### Task 9: Community board + post detail pages

- **Files:**
  - `apps/web/src/app/(app)/community/page.tsx` (new)
  - `apps/web/src/app/(app)/community/[id]/page.tsx` (new)
- **What:**
  - `community/page.tsx` — RSC, calls `apiServerFetch(listPostsOp)`. Renders `PostList` with server-fetched initial data, plus a "Ask the community" button that opens `PostForm`.
  - `community/[id]/page.tsx` — RSC, calls `apiServerFetch(getPostOp)`. Renders full post. Then attempts `apiServerFetch(listInterestsOp)` in a try/catch: if 403 (non-author), renders only `interest_count` ("X people offered to help"); if success (author), renders the full respondent list with names + messages.
- **Acceptance:**
  - `/community` renders with empty state when no approved posts exist
  - Submitting a post from the UI results in a PENDING row in the DB
  - `/community/[id]` for the post author shows respondent list
  - `/community/[id]` for a non-author shows count only, no names
  - `pnpm typecheck` passes

---

### Task 10: Admin community moderation page

- **Files:**
  - `apps/web/src/features/admin/community/moderation-queue.tsx` (new — "use client")
  - `apps/web/src/app/admin/community/page.tsx` (new)
  - `apps/web/src/app/admin/_components/admin-sidebar.tsx` (edit)
- **What:**
  - `ModerationQueue` — client component: table of PENDING posts with author info, title, body, date. Each row has Approve (green) and Reject (red, opens reason textarea popover) buttons. POSTs to `PATCH /api/v1/admin/community/posts/[id]`. On success, removes row from list.
  - `admin/community/page.tsx` — RSC, `requireAdmin()`, fetches pending posts via `apiServerFetch(adminListPostsOp, { input: { status: 'pending' } })`.
  - Add `{ href: "/admin/community", label: "Community", icon: MessageSquare }` to `ADMIN_NAV` array in `admin-sidebar.tsx` (import `MessageSquare` from `lucide-react`).
- **Acceptance:**
  - `/admin/community` appears in admin sidebar nav
  - Approving a PENDING post sets `status='approved'` and removes it from the queue
  - Rejecting with a reason sets `status='rejected'` with the reason stored
  - `pnpm typecheck` passes

---

### Task 11: App sidebar nav entry

- **Files:**
  - `apps/web/src/app/(app)/_components/app-sidebar.tsx` (edit)
- **What:** Add a "Community" `SidebarRow` entry with `Users` (or `MessageSquare`) icon from `lucide-react`. Position it immediately above the categories list, after the "Home" row. Use `isActive("/community")` for the active state.
- **Acceptance:**
  - "Community" nav item appears in the desktop sidebar
  - Visible in the mobile hamburger drawer
  - Clicking navigates to `/community`
  - `pnpm typecheck` passes
  - `pnpm lint` passes

---

## Open questions

All five original open questions resolved — none remain for `/mlabs-code` to
escalate.
