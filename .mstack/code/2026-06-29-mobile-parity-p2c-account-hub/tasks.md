# Implementation: Mobile parity (P2c) — Account hub + sub-pages

**Started:** 2026-06-29
**Completed:** 2026-06-29
**Review:** [2026-06-29-mobile-parity-p2c-account-hub](../../reviews/2026-06-29-mobile-parity-p2c-account-hub.md)
**Branch:** feat/qa-test-accounts-seed
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Hub layout restructure (flat row list)
  - Commit: `1093448`
  - Notes: New HubRow component with leading MaterialCommunityIcons glyph. 7 sub-page rows + Sign out + Delete in locked order.

- [x] **Task 2:** Notifications move
  - Commit: `361fb3f`
  - Notes: `(app)/notifications.tsx` deleted, recreated under `account/` with `../..` → `../../..` import path adjustment. Hidden Tabs.Screen entry dropped from `(app)/_layout.tsx`. Push deep-link routing note flagged for P3 in the commit message.

- [x] **Task 3:** /account/listings
  - Commit: `ac9ee6c`
  - Notes: BusinessCard FlatList. EmptyState carries mailto:supportEmail "Claim my business" button.

- [x] **Task 4:** /account/posts (list)
  - Commit: `f44f528`
  - Notes: MyPostRow component with per-status pill + rejected_reason. Keyed to AdminPostRowSchema.

- [x] **Task 5:** /account/posts/edit/[id]
  - Commit: `dd17c7b`
  - Notes: apiPatch already existed in lib/api/client.ts — review's "needs to be added" was a stale grep. Edit cache expired on api.ts mid-task; re-Read + re-Edited cleanly. Form pre-fills via a `primed` ref so re-fetches don't clobber in-progress edits. Body field always sent as string-or-undefined, never null.

- [x] **Task 6:** Privacy & Security + Terms + About bundle
  - Commit: `6316aac`
  - Notes: Version pulled from expo-constants (already installed), not expo-application. Every brand reference goes through `brand.*` from `@aira/config` — no string drift.
