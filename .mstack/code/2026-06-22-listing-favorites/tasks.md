# Implementation: Favorite a listing

**Started:** 2026-06-22 (complete)
**Review:** [2026-06-22-listing-favorites](../../reviews/2026-06-22-listing-favorites.md)
**Branch:** feat/qa-test-accounts-seed
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** DB schema + migration — `810a12c`
- [x] **Task 2:** Validators — `95148d5`
- [x] **Task 3:** Services — `13db08e` (paused once to confirm exporting `toBusiness`/`attachRelations` from `businesses/queries.ts`; user picked "export the mappers")
- [x] **Task 4:** API ops — `aa00c9f` (added `./favorites` to `@aira/validators/package.json` subpath exports; needed explicit `AddFavoriteInput`/`RemoveFavoriteInput` type annotations because the service's primitive-arg signature doesn't back-infer the input shape)
- [x] **Task 5:** API route handlers — `438baa7` (used `[business_id]` snake-cased segment, matching the `[job_name]` precedent under `/admin/cron`)
- [x] **Task 6:** FavoriteButton component — `fbca162`
- [x] **Task 7:** Wire FavoriteButton into BusinessCard — `f9f016d`
- [x] **Task 8:** Wire FavoriteButton into BusinessDetail — `3cda516`
- [x] **Task 9:** /account/favorites page — `5c2e2d5`
- [x] **Task 10:** Account hub menu row — `3b407e0`
- [x] **Task 11:** Wire favorite ids through public listing surfaces — `388a48f`
