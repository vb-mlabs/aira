# Implementation: REST API migration

**Started:** 2026-06-07
**Review:** [2026-06-07-rest-api-migration](../../reviews/2026-06-07-rest-api-migration.md)
**Branch:** `feat/rest-api-migration`
**Status:** complete — 18/18 tasks landed across 2 sessions (Phase 0 + Phase 1 in session 1; Phases 2–5 in session 2).

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Preamble

- [x] **Plan + review + docs bundle** — commit `3e02b88`

## Phase 0 — Foundation

- [x] **T1:** Promote mobile fetch wrapper into `@aira/api/client` — `b287dfe`
- [x] **T2:** Add `apiServerFetch` helper in `@aira/api/server` — `c1f0d90`
- [x] **T3:** Collapse mobile `ApiError` onto `@aira/api` — `ad2b42a` (Pause-If fired; user approved full scope)
- [x] **T4:** Wire web composition root `apps/web/src/lib/api-client.ts` — `e4222d7`

## Phase 1 — Listings shell (pre-S3 fix)

- [x] **T5:** Promote listings queries to `packages/services/{businesses,categories}` — `2f528c7`
- [x] **T6:** Add `/api/v1/businesses` + `/api/v1/categories` routes + ops — `f12e5e7`
- [x] **T7:** Switch listings RSC pages to `apiServerFetch` — `8152d1e`

## Mid-run checkpoint

- [x] **Partial-run report** — `5c7ba3a`
- [x] **Resume-learning chore** — `6ea24ac`

## Phase 2 — Profile

- [x] **T8:** Delete profile Server Actions; migrate callers + add `requestEmailChange` + `getProfile` — `8d78142`

## Phase 3 — Admin

- [x] **T9:** Promote admin queries to `packages/services/admin/queries.ts` — `0f3c4d0`
- [x] **T10:** Admin GET routes + ops — `869d709`
- [x] **T11:** Admin mutation POST routes — `03f538c` (renamed op input `targetId` → `id` for path-param auto-merge)
- [x] **T12:** Switch admin RSC pages + UI; delete `features/admin/server/actions.ts` — `b016a3d`

## Phase 4 — Notifications + Messages

- [x] **T13:** Notifications routes + migrate surface (live mobile 404 fix) — `60926c4`
- [x] **T14:** Switch messages RSC pages to `apiServerFetch` — `5121d82` (in-process-only ops; service-direct routes kept for 304)

## Phase 5 — Cleanup + enforcement

- [x] **T15:** Delete `app/dev/{messages,notifications}/` — `9b89a12`
- [x] **T16:** Delete `runFromAction` from `packages/api` — `60e5e52`
- [x] **Fixture commit (T17 prep)** — `a237159` (verify-fixture for the new hook)
- [x] **T17:** Lefthook `"use server"` gate — `cc6e497` + glob fix-up `4982a7c`
- [x] **T18:** Stripe ADR + CLAUDE.md + api-versioning + service-layer addendum — `e617047`

## Summary

23 commits on `feat/rest-api-migration`. Zero `"use server"` in `apps/web/src`. Zero `@aira/services` imports outside `/api/v1/*` routes + the documented Stripe webhook carve-out. `defineOperation.runFromAction` deleted from `packages/api`. Lefthook + type-system both gate the rule.
