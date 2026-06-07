# Implementation report: REST API migration (Phase 0 + Phase 1)

**Date:** 2026-06-07
**Branch:** `feat/rest-api-migration` (8 commits — 1 preamble + 7 tasks)
**Review:** [.mstack/reviews/2026-06-07-rest-api-migration.md](../../reviews/2026-06-07-rest-api-migration.md)
**Status:** **partial** — Phase 0 + Phase 1 done; Phases 2-5 (T8-T18) deferred to a follow-up session at the user's request.

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| Preamble | plan + review + roadmap + CLAUDE.md + learnings | ✓ done | `3e02b88` |
| T1 | Promote mobile fetch wrapper → `@aira/api/client` | ✓ done | `b287dfe` |
| T2 | `apiServerFetch` helper in `@aira/api/server` | ✓ done | `c1f0d90` |
| T3 | Collapse mobile ApiError onto `@aira/api` | ✓ done | `ad2b42a` |
| T4 | Web composition root `apps/web/src/lib/api-client.ts` | ✓ done | `e4222d7` |
| T5 | Promote listings reads to `@aira/services/{businesses,categories}` | ✓ done | `2f528c7` |
| T6 | `/api/v1/businesses` + `/api/v1/categories` routes + ops | ✓ done | `f12e5e7` |
| T7 | Switch listings RSC pages to `apiServerFetch` | ✓ done | `8152d1e` |
| T8 | Profile Server Actions → REST | ⊘ deferred | — |
| T9 | Promote admin queries to `packages/services/admin/queries.ts` | ⊘ deferred | — |
| T10 | Admin GET routes + ops | ⊘ deferred | — |
| T11 | Admin mutation POST routes | ⊘ deferred | — |
| T12 | Switch admin RSC pages + UI; delete admin Server Actions | ⊘ deferred | — |
| T13 | Notifications routes + migrate surface (live mobile 404 fix) | ⊘ deferred | — |
| T14 | Switch messages RSC page to `apiServerFetch` | ⊘ deferred | — |
| T15 | Delete `app/dev/messages` + `app/dev/notifications` | ⊘ deferred | — |
| T16 | Delete `runFromAction` from `packages/api` | ⊘ deferred | — |
| T17 | Lefthook check rejecting `"use server"` | ⊘ deferred | — |
| T18 | Stripe ADR + CLAUDE.md cross-ref + api-versioning + service-layer addendum | ⊘ deferred | — |

## Commits

```
8152d1e feat(web): switch listings RSC pages to apiServerFetch
f12e5e7 feat(api): /api/v1/businesses + /api/v1/categories routes + ops
2f528c7 feat(services): promote listings reads to @aira/services + @aira/validators
e4222d7 feat(web): apiClient composition root at apps/web/src/lib/api-client.ts
ad2b42a refactor(mobile): collapse local ApiError onto @aira/api
c1f0d90 feat(api): apiServerFetch helper for in-process RSC op invocation
b287dfe feat(api): createApiClient factory in @aira/api/client
3e02b88 chore(mstack): plan + review + docs for REST API migration
```

## What changed (Phase 0 + Phase 1)

- **Shared fetch client** (`@aira/api/client`). `createApiClient({ baseUrl, clientId, getAccessToken?, refreshOnce?, fetchImpl? })` is the single factory web and mobile both consume. Mobile injects SecureStore + the `/api/auth/refresh` loop; web omits both and rides on cookies via `credentials: "include"`. 15 Vitest cases pin the cross-platform contract.
- **In-process RSC helper** (`@aira/api/server`). `apiServerFetch(op, init?)` builds a synthetic `Request`, forwards cookies + `X-Request-Id` + `If-Modified-Since` from the outer Next request scope, and invokes `op.runFromRequest` directly. Same auth pipeline, same admin freshness gate, same Zod validation as the HTTP path — no socket. Auto-redirects to `/login?reason=idle` when the freshness gate fires for a cookie-authed admin RSC. 10 new Vitest cases.
- **`ApiError.idleTimeout()` factory** added so the helper can branch on `code === "auth.idle_timeout"` instead of message-matching. `enforceAdminFreshness` in `apps/web/src/server/operations/index.ts` now throws this distinct code.
- **Mobile ApiError collapsed** onto the package-root class. 9 construction sites across 3 mobile files updated to the named-args constructor; `apps/mobile/lib/api/client.ts` shrunk to a re-export. `instanceof ApiError` now works across the web↔mobile boundary. Mobile gained `@aira/api: workspace:*` as a dep.
- **Web composition root** (`apps/web/src/lib/api-client.ts`) — 20-line singleton ready for Client Component mutations.
- **Listings reads promoted to services**. Constants + Zod schemas live in `@aira/validators/{businesses,categories}`; query functions live in `@aira/services/{businesses,categories}` with `(db, ...)` signatures (no auth, no captured singletons). `apps/web/src/features/listings/types.ts` re-exports from validators for source-compat. `apps/web/src/features/listings/server/queries.ts` is gone.
- **Three new REST endpoints**: `GET /api/v1/businesses` (`?featured`, `?category`, `?limit`), `GET /api/v1/businesses/[id]`, `GET /api/v1/categories`. All `permission: "user"`. `docs/api-versioning.md` route table extended.
- **Four RSC pages migrated**: `/home`, `/categories`, `/listings/[category]`, `/listings/[category]/[id]` — all read via `apiServerFetch`. Neither `@aira/services` nor `@/lib/db` is imported anywhere under `apps/web/src/app/(app)/{home,categories,listings/**}/page.tsx`. CLAUDE.md "API surface" rule fully honored for the listings shell.

## Live bug found (deferred to T13)

`apps/mobile/features/notifications/api.ts:20` calls `GET /api/v1/notifications`. Probed during this session: **the route file does not exist on `main` and returns 404 on the deployed server.** Mobile's notifications list is dead today. Task 13 adds the route — it's the first deferred task that's also a bug fix, not just a refactor.

## Pause events

One genuine pause during the run:

- **T3 — mobile ApiError scope.** Review enumerated 3 mobile files; grep found 5 (`features/auth/api.ts`, `features/avatar/api.ts` were additional). User approved full-scope migration. All 9 construction sites updated together; coexisting ApiError types would have been worse than today.

One implementation surprise resolved without escalation:

- **T2 — missing `auth.idle_timeout` error code.** Review's design depended on `apiServerFetch` branching on `code === "auth.idle_timeout"`, but the existing `enforceAdminFreshness` threw plain `ApiError.unauthorized()` (code `auth.unauthenticated`). Added `ApiError.idleTimeout()` factory + changed `enforceAdminFreshness` to use it. Minimum-surface additive change; no architectural shift.

No silent skips, no `--no-verify`, no destructive operations.

## Bridge state on the branch

T5 left a temporary state where 4 RSC pages imported `@aira/services` directly (bridge between query-promotion and apiServerFetch-swap). T7 cleaned that up — no bridge code remains on `main` of `feat/rest-api-migration`.

## Follow-ups (deferred to Phases 2-5)

Tracked as 11 pending tasks in `.mstack/code/2026-06-07-rest-api-migration/tasks.md`:

- **Phase 2 (T8):** Profile — delete `apps/web/src/features/profile/server/actions.ts` (4 duplicated Server Actions: `updateName`, `requestEmailChange`, `changePassword`, `deleteAccount`); add the one genuine gap (`requestEmailChangeOp` + `POST /api/v1/profile/email`); add `getProfileOp` + `GET /api/v1/profile` for the RSC read; migrate 4 UI form callsites under `apps/web/src/features/profile/components/`. **Pause-If**: if UI uses React 19's `useActionState` / `useFormStatus` patterns that don't trivially map to `fetch`.
- **Phase 3 (T9-T12):** Admin surface — promote 3 queries to `packages/services/admin/queries.ts` (strip `requireAdmin()` calls; op layer enforces); add 8 routes (`/api/v1/admin/users`, `/api/v1/admin/users/[id]`, `/api/v1/admin/audit` + 5 mutation routes); migrate 3 RSC pages + admin UI mutation callsites; delete `apps/web/src/features/admin/server/actions.ts`.
- **Phase 4 (T13-T14):** Notifications + messages — add `GET /api/v1/notifications` (live bug fix; mobile already calls it), `POST /api/v1/notifications/[id]/read`; migrate `(app)/notifications/page.tsx`, `(app)/messages/page.tsx`, `(app)/messages/[id]/page.tsx`; delete `apps/web/src/features/notifications/server-actions.ts`.
- **Phase 5 (T15-T18):** Cleanup + enforcement — delete `apps/web/src/app/dev/{messages,notifications}/`; delete `runFromAction` + `setActionHeadersResolver` from `packages/api/src/operation.ts`; add lefthook `"use server"` lint check; write `docs/decisions/0009-stripe-webhook-carve-out.md` + cross-references.

The plan + review docs already encode every decision needed for the deferred tasks. Resuming via `/mlabs-code` against the same review will pick up at T8 (skill resume path: existing `.mstack/code/<slug>/` directory with in-progress tasks).

## Recommended next step

Two paths, depending on preference:

1. **Ship Phase 1 in isolation now.** Push `feat/rest-api-migration` + open a PR for the foundation + listings work. Then `/mlabs-code` against the same review in a fresh session for Phases 2-5 (the skill detects the existing ledger and resumes). This gives the team an early review surface on the foundation pieces (shared client, `apiServerFetch`, mobile ApiError collapse) before the bigger admin/profile changes land.

2. **Keep Phases 2-5 on the same branch and ship as one PR.** Re-invoke `/mlabs-code` in a fresh session to continue. The branch is in a clean state — every commit is atomic, every commit passes typecheck + lefthook.

Either way, the next concrete action is **re-invoking `/mlabs-code`** to resume at T8 (or to ship + plan the resume).
