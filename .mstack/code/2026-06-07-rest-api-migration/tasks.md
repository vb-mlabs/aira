# Implementation: REST API migration

**Started:** 2026-06-07
**Review:** [2026-06-07-rest-api-migration](../../reviews/2026-06-07-rest-api-migration.md)
**Branch:** `feat/rest-api-migration`
**Status:** paused — Phase 0 + Phase 1 done (T1–T7); Phases 2–5 (T8–T18) deferred to a follow-up `/mlabs-code` run (resume against the same review).

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Preamble

- [x] **Plan + review + docs bundle** — commit `3e02b88`

## Tasks

- [x] **T1:** Promote mobile fetch wrapper into `@aira/api/client`
  - Files: `packages/api/src/client.ts` · `packages/api/src/__tests__/client.test.ts` (new)
  - Commit: `b287dfe`
  - Notes: 15 new Vitest cases; 37/37 api tests pass; no existing importers of `@aira/api/client` (was a stub).

- [x] **T2:** Add `apiServerFetch` helper in `@aira/api/server`
  - Commit: `c1f0d90`
  - Notes: Bundled `ApiError.idleTimeout()` factory + flipped `enforceAdminFreshness` to use it (precondition for the redirect branch). Single swappable `invokeRedirect` (test path raced the real one in v1).

- [x] **T3:** Collapse mobile `ApiError` onto `@aira/api`
  - Commit: `ad2b42a`
  - Notes: **Pause-If fired** — review enumerated 3 files, grep found 5. User approved full scope. 9 construction sites + workspace dep added.

- [x] **T4:** Wire web composition root `apps/web/src/lib/api-client.ts`
  - Commit: `e4222d7`

- [x] **T5:** Promote listings queries to `packages/services/{businesses,categories}`
  - Commit: `2f528c7`
  - Notes: Validators package gained `/businesses` + `/categories` subpaths. Services package gained `@aira/validators` as a workspace dep (was implicit via `@aira/api` only). RSC pages bridged via direct service imports — T7 switches to apiServerFetch.

- [x] **T6:** Add `/api/v1/businesses` + `/api/v1/categories` routes + ops
  - Commit: `f12e5e7`

- [x] **T7:** Switch listings RSC pages to `apiServerFetch`
  - Commit: `8152d1e`
  - Notes: **Phase 1 complete** — pre-S3 listings shell fully on one REST surface.

- [ ] **T8:** Delete profile Server Actions; migrate callers + add `requestEmailChange` + `getProfile`
  - Files: `packages/services/src/users/{index.ts,service.ts}` · `apps/web/src/server/operations/users.ts` · `apps/web/src/app/api/v1/profile/route.ts` · `apps/web/src/app/api/v1/profile/email/route.ts` (new) · `apps/web/src/app/(app)/profile/page.tsx` · `apps/web/src/features/profile/components/**` · `apps/web/src/features/profile/server/actions.ts` (delete)
  - Pause-if: UI uses `useActionState` / `useFormStatus` patterns that don't trivially map to fetch
  - Commit: —
  - Notes: —

- [ ] **T9:** Promote admin queries to `packages/services/admin/queries.ts`
  - Files: `packages/services/src/admin/queries.ts` (new) · `packages/services/src/admin/index.ts` · `packages/validators/src/admin.ts` (new) · `apps/web/src/features/admin/server/queries.ts` (delete) · `apps/web/src/features/admin/types.ts`
  - Commit: —
  - Notes: —

- [ ] **T10:** Add admin GET routes + ops
  - Files: `apps/web/src/server/operations/admin.ts` · `apps/web/src/app/api/v1/admin/{users/route.ts,users/[id]/route.ts,audit/route.ts}` (new) · `docs/api-versioning.md`
  - Commit: —
  - Notes: —

- [ ] **T11:** Add admin mutation POST routes
  - Files: `apps/web/src/app/api/v1/admin/users/[id]/{ban,unban,role,reset-password,notify}/route.ts` (new) · `docs/api-versioning.md`
  - Commit: —
  - Notes: —

- [ ] **T12:** Switch admin RSC pages + UI; delete `features/admin/server/actions.ts`
  - Files: `apps/web/src/app/admin/{users,users/[id],audit}/page.tsx` · `apps/web/src/features/admin/components/**` · `apps/web/src/features/admin/server/actions.ts` (delete)
  - Commit: —
  - Notes: —

- [ ] **T13:** Add notifications routes + migrate surface (fixes live mobile 404)
  - Files: `packages/services/src/notifications/index.ts` · `apps/web/src/server/operations/notifications.ts` · `apps/web/src/app/api/v1/notifications/{route.ts,[id]/read/route.ts}` (new) · `apps/web/src/app/(app)/notifications/page.tsx` · `apps/web/src/features/notifications/components/{notification-item,notification-list}.tsx` · `apps/web/src/features/notifications/server-actions.ts` (delete) · `docs/api-versioning.md`
  - Pause-if: mobile's notifications/api.ts types don't cleanly match existing service return shape
  - Commit: —
  - Notes: —

- [ ] **T14:** Switch messages RSC page to `apiServerFetch`
  - Files: `apps/web/src/app/(app)/messages/page.tsx` · `apps/web/src/app/(app)/messages/[id]/page.tsx`
  - Commit: —
  - Notes: —

- [ ] **T15:** Delete `app/dev/messages` + `app/dev/notifications`
  - Files: `apps/web/src/app/dev/messages/{page.tsx,_seed-action.ts}` (delete) · `apps/web/src/app/dev/notifications/{page.tsx,_seed-action.ts}` (delete)
  - Pause-if: any sidebar/Link references the deleted routes
  - Commit: —
  - Notes: post-delete, run `rm -rf apps/web/.next` per ADR 0008

- [ ] **T16:** Delete `runFromAction` from `packages/api`
  - Files: `packages/api/src/operation.ts` · `packages/api/src/server.ts` · `packages/api/src/__tests__/operation.test.ts`
  - Pause-if: `pnpm typecheck` flags a `runFromAction` reference outside the enumerated files
  - Commit: —
  - Notes: —

- [ ] **T17:** Lefthook check rejecting `"use server"`
  - Files: `lefthook.yml` · `tooling/scripts/check-no-server-actions.sh` (new, optional)
  - Pause-if: existing `app/dev/{emails,states}/page.tsx` contains `"use server"`
  - Commit: —
  - Notes: —

- [ ] **T18:** Docs — Stripe ADR + CLAUDE.md + api-versioning + service-layer addendum
  - Files: `docs/decisions/0009-stripe-webhook-carve-out.md` (new) · `CLAUDE.md` · `docs/api-versioning.md` · `docs/decisions/0007-service-layer.md`
  - Commit: —
  - Notes: —
