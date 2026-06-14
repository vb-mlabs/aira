# Implementation: F20 Community Requests Board

**Started:** 2026-06-14
**Review:** [2026-06-13-community-requests-board](../../reviews/2026-06-13-community-requests-board.md)
**Branch:** feat/rest-api-migration
**Setup commit:** c17db75 (workflow artifacts)
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **T1:** DB schema + migration — `fa53daa`
- [x] **T2:** Validators — `0a7e0de`
- [x] **T3:** Community service — `1aed3e2`
- [x] **T4:** Community REST API routes — `b52d4a6`
- [x] **T5:** Admin REST API routes — `c4477cf`
- [x] **T6:** expire-posts cron — `4c982bd`
- [x] **T7:** Notification renderer (post_interest) — `06bc67a` (pulled forward; see notes)
- [x] **T8:** Community feature components — `3652010`
- [x] **T9:** Community board + detail pages — `ebb3969`
- [x] **T10:** Admin moderation page — `e97c547`
- [x] **T11:** App sidebar nav entry — `2093d7f`

## Notes

- **T7 reordered before T4.** Adding the `post_interest` variant to
  `NotificationBody` in T2 made the existing notification renderer's switch
  non-exhaustive — TypeScript blocked T4's typecheck. T7 (the renderer
  branch) had to land before T4's routes could compile. Recorded as a
  learning so future plans dependency-order discriminated-union changes
  with their consumers.
- **Mobile renderer also needed updating.** `apps/mobile/app/(app)/notifications.tsx`
  had its own `renderPreview` switch — fixed in `8ab37e2` after the final
  monorepo typecheck surfaced it.
- **`PostRow` gained `user_id`** during T8 because the public card needs to
  recognise the post author. Validator + service updated together with the
  components.
