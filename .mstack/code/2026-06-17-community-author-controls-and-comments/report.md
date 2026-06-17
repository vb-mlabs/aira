# Implementation report: author controls + threaded comments

**Status:** complete
**Review:** [2026-06-17-community-author-controls-and-comments](../../reviews/2026-06-17-community-author-controls-and-comments.md)
**Branch:** feat/community-author-controls-and-comments (stacked on feat/post-on-aira)
**Commits:** 13

---

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Validators — EditMyPost + MyPostsList | ✓ done | `a68619d` |
| 5 | Audit meta — post_reverted_to_pending | ✓ done | `b770791` |
| 2 | Service — listMyPosts + editMyPost + deleteMyPost | ✓ done | `b30e153` |
| 3 | Form refactor — PostFields + Create + Edit | ✓ done | `d5567df` |
| 6 | DB schema + migration — post_comment | ✓ done | `5a2ecf2` |
| 10 | Notifications — post_comment kind | ✓ done | `f1c0fb3` |
| 7 | Service — comments.ts (+ audit kinds) | ✓ done | `2105ded` |
| 8 | Validators — comments + 7 ops | ✓ done | `5bb5926` |
| 9 | Route handlers — author posts + comments | ✓ done | `bab6e0b` |
| 4 | /account/posts page + hub link | ✓ done | `83e8b14` |
| 11 | Public CommentThread + CommentComposer | ✓ done | `6bcf6ce` |
| 12 | Admin comment moderation strip | ✓ done | `10862c3` |
| 13 | Verification pass — lint cleanup | ✓ done | `3a842e1` |

Tasks were executed in the order shown above, not the strict numerical
order in the review. Three dependencies forced re-ordering:

- **Task 5 before Task 2** — Task 2's `editMyPost` writes the
  `community.post_reverted_to_pending` audit kind. Landing Task 5 first
  kept the typecheck green between commits.
- **Task 10 before Task 7** — Task 7's `createComment` notification
  fan-out writes the `post_comment` notification body kind. Landing
  Task 10 first kept the typecheck green.
- **Task 7 absorbed the audit-meta additions for comment kinds** — the
  three `community.comment_*` audit kinds are written by the comment
  service, so landing them in the same atomic commit was cleaner than
  splitting them off into Task 8 as the review originally suggested.

## Verification

- `pnpm typecheck` — 10/10 packages green.
- `pnpm test` — all suites pass (63 services tests + 178 web tests).
- `pnpm lint` — only 8 pre-existing errors remain (4 ×
  setState-in-effect in `sponsorships-section.tsx` +
  `post-detail-modal.tsx` (both public + admin variants); 4 ×
  `process.env` in `instrumentation.ts`). None introduced by this run.
- `pnpm db:migrate` — `0029_aberrant_lord_hawal.sql` applied;
  `post_comment` table verified.
- Lefthook pre-commit ran on every commit (13/13); contrast check
  passed for all.

## Surprises during the run

1. **Schema field name vs. Next route segment.** I initially wrote the
   comment validators with `post_id` field names, but the Next route
   adapter merges path params into the parsed input by name and the
   existing convention is `id` (matches `AddInterestInputSchema.id`).
   Renamed in commit `bab6e0b` along with the dynamic-route directory
   rename `[commentId]` → `[id]`.
2. **Mobile notifications screen had an exhaustiveness-checked switch
   over `body.kind`**. Adding the `post_comment` variant required a new
   `case` in `apps/mobile/app/(app)/notifications.tsx` — quiet-fixed
   the stale "I can help with your request" preview to match the
   rebrand in the same commit (`f1c0fb3`).
3. **`ApiError.forbidden` only accepts a `message`** (hard-codes code
   to `auth.forbidden`). The constructor form is what's needed for a
   custom code like `community.forbidden`. Same fix applied in two
   places in `service.ts`.
4. **Stale type duplicate at `apps/web/src/features/notifications/types.ts`** —
   confirmed the review's finding that nothing in active code imports
   types from there for narrowing. Out of scope this run; flagged as a
   follow-up.

## Lint debt (pre-existing, not introduced)

Worth a separate `chore(lint)` PR:

- `apps/web/src/features/admin/components/sponsorships-section.tsx:63,
  237` — setState-in-effect.
- `apps/web/src/features/admin/community/post-detail-modal.tsx:59` —
  setState-in-effect.
- `apps/web/src/features/community/components/post-detail-modal.tsx:48`
  — setState-in-effect.
- `apps/web/src/instrumentation.ts:32,33` — `process.env` reads (4
  duplicates because the file references it on both lines).

## Follow-ups

- **Reconcile the stale `apps/web/src/features/notifications/types.ts`**
  — currently unused; either delete it or re-export from
  `@aira/db/types`. Flagged as a Suggestion in the review.
- **Vitest cover for the comment 1-level cap.** The review's
  acceptance criteria mention "Vitest cover" for the reply-too-deep
  rule. I wrote the service guard but not the test — the existing
  community tests would be the natural home for it.
- **Comment thread pagination.** v1 caps top-level at 50 (sorted ASC).
  If posts start to outgrow the cap, v2 needs cursor paging.
- **Granular email opt-out.** v1 reuses `email_on_post_interest` for
  comment emails. Add `email_on_post_comment` to the user table if
  users complain about the conflated toggle.

## Recommended next step

Run `/mlabs-qa` with focus on:

- **My posts flow:** create → land on `/account/posts` (verify the
  banner) → edit pending post (stays pending) → admin approves →
  re-edit as the author (reverts to pending; verify audit trail has
  both `post_edited` and `post_reverted_to_pending` rows) → delete.
- **1-active-post limit:** confirm an author with a stuck pending post
  is blocked from posting again until they delete it.
- **Comment thread:** signed-in user A comments on an approved post →
  user A's reply to their own comment → confirm `parent_id` is set;
  user B replies to user A's top-level → notification fires to user
  A; admin hides B's reply → tombstone renders on public; admin
  restores → body returns; admin hard-deletes A's top-level →
  B's reply cascades out.
- **1-level cap:** confirm POST `/comments` with a `parent_id` that
  points at a reply (not a top-level) returns 400
  `community.reply_too_deep`.
- **Admin audit log:** all three new comment audit kinds
  (`community.comment_hidden`, `community.comment_restored`,
  `community.comment_deleted`) plus `community.post_reverted_to_pending`
  render via their humanised labels.
