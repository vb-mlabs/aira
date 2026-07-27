# Implementation Report — Community Push Notifications

**Status:** complete
**Started:** 2026-07-27 13:00
**Finished:** 2026-07-27 13:18
**Review:** [.mstack/reviews/2026-07-27-community-push.md](../../reviews/2026-07-27-community-push.md)
**Branch:** `feat/business-logo`
**Commits landed on this branch:** 5 (1 prep-docs + 4 task commits, task 5 verify-only)

---

## Tasks

| # | Task                                              | Status | Commit    |
|---|---------------------------------------------------|--------|-----------|
| 1 | `sendPushToUser` service + tests                  | ✓ done | `6406650` |
| 2 | Wire push into `createCommunityCommentOp`         | ✓ done | `f8abb3a` |
| 3 | Mobile foreground + tap handler at root           | ✓ done | `b1ad7fd` |
| 4 | `markRead` on notification detail modal mount     | ✓ done | `fe09e07` |
| 5 | Final gate (typecheck + lint + services test)     | ✓ done | verify-only |

## Commits (in order, oldest first)

- `32e6678` — `docs(mstack): plan + review for community-push feature` (prep)
- `6406650` — `feat(services): sendPushToUser per-user push sender + tests` — Task 1
- `f8abb3a` — `feat(community): dispatch push after in-app comment notification` — Task 2
- `b1ad7fd` — `feat(mobile/push): foreground handler + tap-to-open at root` — Task 3
- `fe09e07` — `feat(mobile/notifications): mark as read on detail modal mount` — Task 4

## Deviations from the review

- **`console.warn` instead of an injected logger** in `sendPushToUser`.
  The review's Task 1 said "log-and-return on missing token" and
  proposed the sender would use `logger.warn`. When I went to
  import a logger, `packages/services/src/logger.ts` doesn't
  exist — services layer has no shared logger, and the sibling
  `push.ts` uses `throw` (not a log). Picked `console.warn` as
  the platform-neutral fallback and added a header comment
  explaining the choice. Same observable behaviour;
  logger-shaped semantics.

## Evidence (all commands ran in this session)

- **`pnpm --filter @aira/services test`** — `Test Files 8 passed
  (8) · Tests 68 passed (68)` (6 new tests in
  `push-to-user.test.ts` + 62 pre-existing).
- **`pnpm typecheck` at repo root** — `Tasks: 10 successful, 10
  total`.
- **`pnpm lint` at repo root** — `Tasks: 3 successful, 3 total`.
- **Lefthook pre-commit** (`check-migrations`, `check-contrast`,
  `check-no-server-actions`) passed on all four task commits
  without bypass. No `--no-verify`.
- **Prep-docs commit** (`32e6678`) tracked separately so the four
  task commits stay 1:1 with the review's task list.

## Concerns

None. Every `⚠ concern` slot in `tasks.md` was left empty.

## Follow-ups (deferred, either from review or discovered here)

Captured in TODOS.md by prior runs and this run:
- Extend `sendPushToUser` to post_interest push events.
- Extend `sendPushToUser` to direct-message push events.
- Stand up receipt polling cron/edge job — closes the delayed
  `DeviceNotRegistered` cleanup gap on BOTH the per-user AND
  broadcast paths.
- Confirm `EXPO_ACCESS_TOKEN` is set in the prod environment
  before real users start comment-driving the fan-out. Sender
  log-and-returns silently on missing token, so a missing env
  would ship a feature that silently no-ops.
- Consider per-event push opt-outs
  (`push_on_post_comment_reply`) if user complaints surface
  post-launch. MVP posture: device-registered = all pushes.

## Recommended next step

`/mstack-qa` scoped to:
- Real-device smoke on Expo Go with two accounts. User A comments
  on User B's post → User B receives push on-device → tap →
  land on `/(app)/account/notification/[id]` for the correct
  row.
- Same for reply case.
- Cold-start via push tap: kill app on iOS force-quit, tap push
  from lock screen, confirm the route.
- In-app notification row lands in bell icon regardless of push
  success; bell badge decrements after mark-as-read fires.
- Set `EXPO_ACCESS_TOKEN=""` in dev and verify the comment op
  succeeds, in-app row lands, `push_to_user` logs a warn line,
  no crash.
