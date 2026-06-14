# Plan: F20 Community Requests Board

**Date:** 2026-06-13
**Slug:** community-requests-board
**Status:** reviewed
**Author:** vb-mlabs

---

## Problem

Atlanta's Indian community currently coordinates word-of-mouth referrals through
ephemeral group chats — "Does anyone know a good Indian dentist?" gets answered
once and is gone. There's no persistent, searchable place to post a need and
have the community close the loop with a trusted lead.

**Who benefits:** Community members (app users) who need trusted referrals within
their network. The board gives those needs a durable home that's moderated and
on-brand for AIRA.

**Success:** A member can post a request, an admin approves it within a working
day, another member taps "I can help", and the requester gets a notification
directing them to the responder's contact.

---

## Scope

**In:**
- Submit a community request (title + optional body text)
- Admin moderation queue: approve (sets expiry) or reject with optional note
- Public board: approved posts only, newest first, text-search, paginated (10/page)
- "I can help" intent button — one per user per post (not the author)
- Post-author detail view: list of respondents + their optional short message
- In-app notification to post author when a new interest is registered
- Hourly cron: expire approved posts past `expires_at` (read from `posts_expiry_days` in `app_setting`)
- REST API at `/api/v1/community/*` and `/api/v1/admin/community/*` consumed by both web and mobile

**Out (deferred):**
- Push notifications (F21)
- Images in posts
- Upvotes / reactions
- Public comment threads
- Category tagging / filtering (can add in V1.5 if content volume warrants)
- Email digest of new posts
- Soft-launch announcement / marketing

---

## Approach

### Schema

Two new tables: `community_post` and `post_interest`.

`community_post` holds the request with a status enum
(`pending | approved | expired | rejected`). `expires_at` is NULL until an admin
approves — the cron only operates on rows where `status = 'approved'` and
`expires_at <= now()`. `rejected_reason` is admin-only and never exposed
publicly.

`post_interest` is the "I can help" signal. Unique constraint on
`(post_id, user_id)` so one tap per person. `message` is optional (≤300 chars).
Cascade-deletes when the post or the user is removed.

A new `post_interest` variant is added to `NotificationBody` in
`packages/db/src/types.ts` so the existing notification bell picks it up
automatically.

`posts_expiry_days` is seeded as an `app_setting` row (default `"30"`) in the
migration so the cron always has a value to fall back on.

### Services

`packages/services/src/community.ts` — pure functions:
`createPost`, `listPosts`, `getPost`, `approvePost`, `rejectPost`,
`addInterest`, `removeInterest`, `expirePosts`.

`expirePosts` reads `posts_expiry_days` from `app_setting` (fallback: 30), runs
a single `UPDATE … SET status='expired' WHERE status='approved' AND expires_at <= now()`,
and returns `rowsAffected` for the cron ledger.

### REST API

| Method | Route | Auth |
|--------|-------|------|
| GET | `/api/v1/community/posts` | public |
| POST | `/api/v1/community/posts` | session |
| GET | `/api/v1/community/posts/[id]` | public |
| POST | `/api/v1/community/posts/[id]/interests` | session |
| DELETE | `/api/v1/community/posts/[id]/interests` | session |
| GET | `/api/v1/community/posts/[id]/interests` | session (author only) |
| GET | `/api/v1/admin/community/posts` | admin |
| PATCH | `/api/v1/admin/community/posts/[id]` | admin |

`defineOperation` + Zod schemas in `packages/validators/src/community.ts`.

### Cron

New job `expire-posts` registered in the existing scheduler
(`apps/web/src/lib/cron/index.ts`). Runs hourly (same pattern as existing jobs).
Logs to `cron_run` table via the shared `runCronJob` helper.

### Web UI

New feature folder `apps/web/src/features/community/` following the same
structure as `features/listings/` and `features/messages/`.

Public board: `/community` (App Router page, RSC via `apiServerFetch`).
Post detail: `/community/[id]` — shows respondents to the author only.
Submit: slide-in sheet or modal, reuses existing Sheet primitive.

Admin: new tab on the admin dashboard at `/admin/community` — pending queue
with Approve / Reject actions. Follows the same admin table pattern already
used for businesses.

**Alternatives considered:**

- **Option A (posts only)** — rejected because it gives users no action to take
  after reading a request; word-of-mouth loop stays broken.
- **Option C (public comments)** — rejected because it doubles the moderation
  surface area and is premature for a soft-launch with low initial volume.

---

## Data model changes

### New tables

```sql
-- community_post
id           text PK
user_id      text FK → user.id CASCADE
title        text NOT NULL (≤120 chars)
body         text (≤1000 chars, nullable)
status       enum('pending','approved','expired','rejected') DEFAULT 'pending'
expires_at   timestamp (nullable, set on approval)
rejected_reason  text (nullable, admin-only)
created_at   timestamp DEFAULT now()
approved_at  timestamp (nullable)

-- Indexes
idx_community_post_status_created  ON (status, created_at DESC)
idx_community_post_user            ON (user_id)

-- post_interest
id           text PK
post_id      text FK → community_post.id CASCADE
user_id      text FK → user.id CASCADE
message      text (≤300 chars, nullable)
created_at   timestamp DEFAULT now()

-- Unique
uq_post_interest  ON (post_id, user_id)
-- Index
idx_post_interest_post  ON (post_id, created_at)
```

### Modified types

`packages/db/src/types.ts` — add `post_interest` variant to `NotificationBody`:

```ts
| {
    kind: "post_interest"
    post_id: string
    post_title: string   // denormalized, avoids join in notification renderer
    responder_id: string
    responder_name: string
    message: string | null
  }
```

### New app_setting seed

Migration seeds `{ key: "posts_expiry_days", value: "30" }` with
`ON CONFLICT DO NOTHING`.

---

## Files to touch

**New:**
- `packages/db/src/schema/community-post.ts`
- `packages/db/src/schema/post-interest.ts`
- `packages/db/src/migrations/<timestamp>_community_posts.sql` (generated)
- `packages/validators/src/community.ts`
- `packages/services/src/community.ts`
- `apps/web/src/app/api/v1/community/posts/route.ts`
- `apps/web/src/app/api/v1/community/posts/[id]/route.ts`
- `apps/web/src/app/api/v1/community/posts/[id]/interests/route.ts`
- `apps/web/src/app/api/v1/admin/community/posts/route.ts`
- `apps/web/src/app/api/v1/admin/community/posts/[id]/route.ts`
- `apps/web/src/features/community/` (index, types, components/)
- `apps/web/src/app/(app)/community/page.tsx`
- `apps/web/src/app/(app)/community/[id]/page.tsx`
- `apps/web/src/features/admin/community/` (moderation queue component)
- `apps/web/src/app/admin/community/page.tsx`
- `apps/web/src/lib/cron/expire-posts.ts`

**Edit:**
- `packages/db/src/schema/index.ts` — export new tables
- `packages/db/src/types.ts` — add `post_interest` NotificationBody variant
- `packages/validators/src/index.ts` — re-export community validators
- `apps/web/src/lib/cron/index.ts` — register `expire-posts` job
- `apps/web/src/app/(app)/layout.tsx` or nav component — add "Community" nav item
- `apps/web/src/features/notifications/components/notification-item.tsx` — render `post_interest` kind

---

## Edge cases

- **Author self-interest:** `POST /interests` returns 409 if `post_id.user_id === requester`. Validated server-side.
- **Duplicate interest:** unique constraint on `(post_id, user_id)` returns 409; surface as "You've already offered to help."
- **Post approved before expiry config is set:** cron falls back to 30 days. `posts_expiry_days` seeded in migration so this is a last resort.
- **PENDING posts and expiry:** `expires_at` is NULL until approval. The cron `WHERE status='approved'` guard means pending posts never expire automatically — they wait in the queue indefinitely. Admin should have a bulk-reject action for stale pending posts (can be a V1.5 addition).
- **User deletes account:** cascade removes their posts and interests. Orphaned notifications (now pointing to deleted content) should degrade gracefully — renderer checks `post_interest` href validity before showing a link.
- **Empty board:** show a friendly empty state ("Be the first to ask for help") rather than a blank page.
- **Long titles / body:** Zod max-length on submit (120 / 1000 chars); DB column uncapped as guard.
- **Search SQL injection:** use parameterised `ILIKE '%' || $1 || '%'` — never string interpolation.

---

## Acceptance criteria

- [ ] Authenticated app user can submit a post (title required, body optional); it arrives with `status = 'pending'`
- [ ] Submitted post is visible in admin moderation queue at `/admin/community`
- [ ] Admin can approve a post → `status = 'approved'`, `expires_at = now() + posts_expiry_days`
- [ ] Admin can reject a post with optional reason → `status = 'rejected'`
- [ ] Approved posts appear on `/community`, sorted newest-first, paginated 10/page
- [ ] Free-text search on title + body works across approved posts
- [ ] Authenticated user can tap "I can help" on a post they didn't author; duplicate tap returns 409
- [ ] Post author can view respondent list + messages at `/community/[id]` (non-authors see 403 on that endpoint)
- [ ] In-app notification is created for post author when a new interest is registered
- [ ] Hourly cron sets `status = 'expired'` on approved posts past `expires_at`; expired posts absent from public board
- [ ] `GET /api/v1/community/posts` returns correct shape for mobile consumption (no server-only imports leak through)
- [ ] TypeScript compiles clean (`pnpm typecheck`)

---

## Open questions

For `/mlabs-review` to resolve before implementation:

1. **One active post per user?** Should we limit a user to 1 non-expired, non-rejected post at a time to prevent spam, or allow multiple?
2. **Respondent visibility:** Should the list of "I can help" respondents be visible to all logged-in users (not just the author) to encourage connection? Or strictly author-only?
3. **Admin edit before approve?** Should the admin moderation queue allow light editing (e.g. clean up a title) before approving, or approve-as-submitted only?
4. **Nav placement:** Should "Community" appear in the main bottom-nav on mobile, or live inside a secondary menu to keep nav slots for Listings / Messages / Profile?
5. **Interest message vs contact reveal:** Should "I can help" show the responder's profile contact info (phone/WhatsApp if available) directly to the post author, or only the message they type? Latter avoids any data-exposure concerns.
