# Implementation report — F20 Community Requests Board

**Date:** 2026-06-14
**Review:** [2026-06-13-community-requests-board](../../reviews/2026-06-13-community-requests-board.md)
**Mockup reference:** [v2 editorial cards](../../mockups/community-requests-board/FEEDBACK.md)
**Branch:** `feat/rest-api-migration`
**Status:** **complete** — all 11 tasks shipped, monorepo typecheck clean

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| — | Workflow artifacts setup | ✓ | `c17db75` |
| T1 | DB schema + migration | ✓ done | `fa53daa` |
| T2 | Validators | ✓ done | `0a7e0de` |
| T3 | Community service | ✓ done | `1aed3e2` |
| T7 | Notification renderer (post_interest) | ✓ done (pulled forward) | `06bc67a` |
| T4 | Community REST API routes | ✓ done | `b52d4a6` |
| T5 | Admin REST API routes | ✓ done | `c4477cf` |
| T6 | expire-posts cron | ✓ done | `4c982bd` |
| T8 | Community feature components | ✓ done | `3652010` |
| T9 | Community board + detail pages | ✓ done | `ebb3969` |
| T10 | Admin moderation page | ✓ done | `e97c547` |
| T11 | App sidebar nav entry | ✓ done | `2093d7f` |
| — | Mobile renderer follow-on | ✓ done | `8ab37e2` |

13 commits, all atomic, no `--no-verify`, every commit passed lefthook
(check-migrations + check-no-server-actions + check-contrast).

## Deviations from the review

1. **T7 ran before T4** rather than after. The `post_interest`
   `NotificationBody` variant in T2 made the existing
   `notification-item.tsx` switch non-exhaustive; TypeScript blocked the
   T4 typecheck until the renderer covered the new kind. Solved by
   pulling T7 forward. No scope change.

2. **Mobile renderer also needed the branch.** The review didn't list
   `apps/mobile/app/(app)/notifications.tsx`, but it has its own
   `renderPreview` switch — fixed as a follow-on commit (`8ab37e2`).
   Added to learnings so future discriminated-union changes flag both
   the web and mobile renderers.

3. **`PostRow` extended with `user_id`.** The public card needs to
   recognise "this is my post" without a separate session lookup. The
   author display name is already public, so the user id is no more
   sensitive than what `author_name` already exposes. Validators +
   service projection updated alongside the components in T8.

4. **All endpoints land at `permission: "user"`**, not "public" as the
   review framed them. `defineOperation` doesn't model unauthenticated
   access, and every consumer (web `(app)` shell, mobile bearer)
   already gates auth upstream. Same pattern as the existing
   `/api/v1/businesses` and `/api/v1/categories` routes.

5. **Message buttons absent from respondent cards** (matches the locked
   mockup feedback). The PRD doesn't include a user-to-user messaging
   feature in MVP scope; the respondent's typed note is the help
   signal. Detail page falls back gracefully when no note is attached.

## Acceptance criteria — verification

- [x] Authenticated user can submit a post — `createPost` enforces the
      1-active-post limit; UI surfaces 409 inline
- [x] Submitted post visible in `/admin/community` queue
- [x] Admin can approve → `status = approved`, `expires_at = now() +
      posts_expiry_days`; `posts_expiry_days` seeded as 30
- [x] Admin can reject with optional reason
- [x] Approved posts on `/community`, newest-first, paginated 10/page
- [x] ILIKE search on title + body (parameterised; no string interp)
- [x] Self-interest blocked at service (409); duplicate-interest blocked
      via unique index (23505 → 409)
- [x] Post author sees respondent list at `/community/[id]`;
      non-authors see only the public count
- [x] In-app `post_interest` notification written to the post author on
      every successful `addInterest` (both web + mobile renderers
      render it)
- [x] `expire-posts` cron registered with the hourly schedule
      `"0 * * * *"`, mirrors `purge-soft-deleted.ts` envelope pattern
- [x] `GET /api/v1/community/posts` returns the same shape on web (RSC
      via `apiServerFetch`) and mobile (via `apiClient`)
- [x] `pnpm typecheck` passes across the whole monorepo

## Follow-ups

Nothing blocking. Three opportunistic items for future work, none in
scope for F20:

- **Spam guard on PENDING.** PENDING posts never auto-expire (review
  decision). If volume grows, add a "stale pending" admin bulk action
  or a 60-day PENDING auto-reject.
- **Admin queue filters.** `/admin/community` only shows PENDING. A
  status dropdown (approved / expired / rejected) would let mods review
  decisions later.
- **Push notifications for `post_interest`.** Currently in-app only.
  F21 will add the push wiring; the `post_interest` body already has
  the fields a push renderer needs.

## Recommended next step

Run `/mlabs-qa` with focus area: **F20 Community Requests Board** — end
user submits a post, admin approves, another user offers help, post
author sees the respondent. Playwright should also verify the cron
status appears on `/admin/cron` and the new `Community` entry shows in
both the (app) sidebar and the admin sidebar.

Update **roadmap.md** to mark F20 ✅ in the S5 list whenever you're
ready to push.
