# Implementation report: REST API migration

**Date:** 2026-06-07
**Branch:** `feat/rest-api-migration` (23 commits — 1 preamble + 18 task commits + 1 partial-run report + 1 partial-run learning chore + 1 verify-fixture commit + 1 hook fix-up)
**Review:** [.mstack/reviews/2026-06-07-rest-api-migration.md](../../reviews/2026-06-07-rest-api-migration.md)
**Status:** **complete** — all 18 tasks landed.

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
| Mid-run | Partial-run report (Phase 0+1 checkpoint) | ✓ done | `5c7ba3a` |
| Housekeeping | Partial-run learning chore | ✓ done | `6ea24ac` |
| T8 | Profile Server Actions → REST | ✓ done | `8d78142` |
| T9 | Promote admin queries to `packages/services/admin/queries.ts` | ✓ done | `0f3c4d0` |
| T10 | Admin GET routes + ops | ✓ done | `869d709` |
| T11 | Admin mutation POST routes | ✓ done | `03f538c` |
| T12 | Switch admin RSC pages + UI; delete admin Server Actions | ✓ done | `b016a3d` |
| T13 | Notifications routes + migrate surface (live mobile 404 fix) | ✓ done | `60926c4` |
| T14 | Switch messages RSC pages to `apiServerFetch` | ✓ done | `5121d82` |
| T15 | Delete `app/dev/messages` + `app/dev/notifications` | ✓ done | `9b89a12` |
| T16 | Delete `runFromAction` from `packages/api` | ✓ done | `60e5e52` |
| Fixture | verify-hook fixture commit (T17 prep) | ✓ done | `a237159` |
| T17 | Lefthook `"use server"` gate | ✓ done | `cc6e497` |
| Fixup | Hook glob fix (pathspec `**` not supported) | ✓ done | `4982a7c` |
| T18 | Stripe ADR + CLAUDE.md + api-versioning + service-layer addendum | ✓ done | `e617047` |

## Commits

```
e617047 docs: Stripe webhook ADR + CLAUDE.md cross-refs + service-layer addendum
4982a7c fix(lefthook): use grep-based glob instead of pathspec ** in use-server check
cc6e497 feat(lefthook): use-server pre-commit gate
a237159 test: verify lefthook use-server gate
60e5e52 refactor(api)!: delete defineOperation.runFromAction + Server Action plumbing
9b89a12 chore(dev): delete app/dev/{messages,notifications} dev seed routes
5121d82 feat(web): switch messages RSC pages to apiServerFetch
60926c4 feat(api): /api/v1/notifications routes + migrate surface (fixes live mobile 404)
b016a3d feat(web): switch admin RSC pages + mutation UI to REST
03f538c feat(api): /api/v1/admin mutation POST routes (ban, unban, role, reset, notify)
869d709 feat(api): /api/v1/admin GET routes + ops (users, users/[id], audit)
0f3c4d0 feat(services): promote admin queries to @aira/services + @aira/validators
8d78142 feat(web): profile Server Actions → REST (apiClient + apiServerFetch)
6ea24ac chore(mstack): append partial-run learning for rest-api-migration
5c7ba3a chore(mstack): partial run report — Phase 0 + Phase 1 of REST API migration
8152d1e feat(web): switch listings RSC pages to apiServerFetch
f12e5e7 feat(api): /api/v1/businesses + /api/v1/categories routes + ops
2f528c7 feat(services): promote listings reads to @aira/services + @aira/validators
e4222d7 feat(web): apiClient composition root at apps/web/src/lib/api-client.ts
ad2b42a refactor(mobile): collapse local ApiError onto @aira/api
c1f0d90 feat(api): apiServerFetch helper for in-process RSC op invocation
b287dfe feat(api): createApiClient factory in @aira/api/client
3e02b88 chore(mstack): plan + review + docs for REST API migration
```

## What changed

**Foundation (Phase 0).** `@aira/api/client` now exposes `createApiClient(deps)` — the single factory web and mobile both consume. Mobile injects SecureStore + a `/api/auth/refresh` loop; web omits both and rides on cookies via `credentials: "include"`. `@aira/api/server` exposes `apiServerFetch(op, init?)` — builds a synthetic `Request`, forwards cookies + `X-Request-Id` + `If-Modified-Since` from the outer Next request scope, invokes `op.runFromRequest` directly in-process. Auto-redirects to `/login?reason=idle` when `ApiError.idleTimeout()` fires for a cookie-authed admin RSC (new factory added; `enforceAdminFreshness` migrated to use it). Mobile's local `ApiError` class collapsed onto the package-root class; 9 construction sites + 2 importers updated; `apps/mobile/lib/api/client.ts` shrunk to a re-export shim. Web composition root `apps/web/src/lib/api-client.ts` (20-line singleton) ready for Client Component mutations.

**Listings (Phase 1, pre-S3 fix).** Constants + Zod schemas moved to `@aira/validators/{businesses,categories}`; query functions moved to `@aira/services/{businesses,categories}` with `(db, ...)` signatures. Three new REST endpoints (`GET /api/v1/businesses?featured&category&limit`, `GET /api/v1/businesses/[id]`, `GET /api/v1/categories`). Four RSC pages (`/home`, `/categories`, `/listings/[category]`, `/listings/[category]/[id]`) migrated to `apiServerFetch`.

**Profile (Phase 2).** The 4 Server Actions at `apps/web/src/features/profile/server/actions.ts` deleted; 3 of them duplicated existing ops (`updateNameOp`, `deleteAccountOp`, `changePasswordOp`). The one genuine gap (`requestEmailChange`) became a new op + `POST /api/v1/profile/email` route. New `getProfileOp` + `GET /api/v1/profile` for the RSC read. UI forms migrated to `apiClient.patch/post/delete` with `try { … } catch (ApiError)` shape replacing the `{ ok, error }` action result; `deleteAccount`'s server-side `redirect("/")` became client-side `router.push("/")` after success.

**Admin (Phase 3).** Three reads (`listUsers`, `getUserDetail`, `listAudit`) promoted to `@aira/services/admin/queries.ts` with `requireAdmin()` stripped — op layer enforces. Shared shapes moved to `@aira/validators/admin`. Three new GET ops + routes (`/api/v1/admin/{users, users/[id], audit}`). Five mutation POST routes (`/api/v1/admin/users/[id]/{ban, unban, role, reset-password, notify}`); op inputs renamed `targetId` → `id` so `[id]` path-param auto-merge from `defineOperation` lines up. Three admin RSC pages migrated to `apiServerFetch`. `UserDetail` Client Component's five Server Action callers swapped for `apiClient.post`. `apps/web/src/features/admin/server/actions.ts` deleted.

**Notifications + Messages (Phase 4).** **Live bug fixed**: mobile's `apps/mobile/features/notifications/api.ts:20` had been calling `GET /api/v1/notifications` against a non-existent route (404 on prod). New `listInboxOp` + route lands the contract. Public wire shape moved to `@aira/validators/notifications`: `NotificationRow` with ISO-string dates + `NotificationBody` discriminated union (`generic` | `message`). New `POST /api/v1/notifications/[id]/read` for the single-id case. Notifications RSC page + Client Components + Server Actions migrated. Mobile's notifications screen + hook adapted to the new field names (`read_at`/`created_at` + body union renderer). Messages got three new in-process-only ops (`listConversationsOp`, `listMessagesOp`, `getOtherParticipantOp`) — they have no public route export; the existing service-direct GET routes still serve mobile + the polling Client Components (preserving the `If-Modified-Since` 304 short-circuit on those hot paths). Both messages RSC pages migrated to `apiServerFetch`.

**Cleanup + enforcement (Phase 5).** `apps/web/src/app/dev/{messages,notifications}/` directories deleted (annotated "Removed before v1 ship"). `defineOperation.runFromAction` + `setActionHeadersResolver` + `loadActionHeaders` + dynamic `next/headers` import deleted from `packages/api/src/operation.ts`; the `Operation` interface no longer has the `runFromAction` field; the 3 vitest cases for the deleted surface removed. Lefthook `check-no-server-actions` hook + script added — rejects new `"use server"` directives under `apps/web/src/{features,server,app}`. New `docs/decisions/0009-stripe-webhook-carve-out.md` ADR + addendum to ADR 0007 + CLAUDE.md cross-refs + api-versioning Stripe row.

## Behavior after the migration

| Check | Result |
|---|---|
| `grep -rln '"use server"' apps/web/src` | **empty** |
| `grep -rn "runFromAction\|setActionHeadersResolver" apps packages --include='*.ts*'` | **empty** |
| `grep -rn "from '@aira/services" apps/web/src/app` | only `/api/v1/*` routes + `/api/stripe/webhook` (documented carve-out) |
| `grep -rn "from '@/lib/db" apps/web/src/app/(app)` + `apps/web/src/app/admin` | **empty** |
| Vitest suites | `@aira/api`: 44/44 · `@aira/services`: 42/42 · `@aira/web`: 164/164 (unchanged baseline) · `@aira/auth`: 10/10 |
| `pnpm --filter @aira/{api,web,services,validators,mobile} typecheck` | green |
| lefthook pre-commit | `check-migrations` + `check-contrast` + `check-no-server-actions` (path-scoped) all wired |
| Mobile contract | `/api/v1/notifications` exists; mobile's stale `Notification` interface replaced with `NotificationRow` from the validators package |

## Pause events

Three genuine pause events during the run:

1. **T3 — mobile ApiError scope** (Phase 0 / session 1). Review enumerated 3 mobile callsites; `grep` found 5 (`features/auth/api.ts` + `features/avatar/api.ts` also had construction sites, not just `instanceof` checks). User approved full-scope migration. 9 construction sites + `@aira/api` workspace dep added.
2. **T2 — missing `auth.idle_timeout` error code** (inline resolution, no user pause). Review's `apiServerFetch` design depended on branching on that code; `enforceAdminFreshness` threw plain `ApiError.unauthorized`. Added `ApiError.idleTimeout()` factory + flipped `enforceAdminFreshness` to use it. Minimum-additive change.
3. **T17 — lefthook glob mismatch** (inline resolution, no user pause). The first version of `check-no-server-actions.sh` used pathspec `**` globs which git doesn't expand natively, so the hook matched zero files and silently passed. Manual verification (stage a fixture, run the script directly) caught the false-pass. Fix-up commit `4982a7c` swapped the glob for a directory filter + `grep -E '\.(ts|tsx)$'`.

No silent skips, no `--no-verify`, no destructive operations.

## Notable decisions made mid-run

- **T11 op input rename `targetId` → `id`.** Lets the `[id]` path-param auto-merge from `defineOperation` line up at the route layer without per-route wrappers. Service signatures kept their `targetId` field; the op handler translates at the boundary. `features/admin/server/actions.ts` (which T12 deletes) was patched in the same commit to pass `id`.
- **T13 wire shape over mobile's stale interface.** Mobile's `Notification` interface (`{ id, kind, body: string, link?, read, createdAt }`) was speculative — written against the 404'ing route. The validators `NotificationRow` ships the actual data layer (`{ id, type, body: NotificationBody, read_at, created_at }`). Mobile's screen + hook adapted to match.
- **T14 in-process-only ops for messages reads.** The two existing service-direct GET routes (`/api/v1/messages/conversations` + `…/[id]/messages`) emit `If-Modified-Since` 304 short-circuits that `defineOperation.runFromRequest` doesn't. Keeping the service-direct routes for mobile + the polling Client Component preserves that optimization; the RSC pages call `apiServerFetch` against new ops with no public route export. Net: two server-side paths exist for the same data, both converge on the same service function. Worth a sentence in any future re-review.
- **T12 dropping `requireAdmin()` from listings/audit RSCs.** The op's `permission: "admin"` + `enforceAdminFreshness` gate cover both checks. `/admin/users/[id]/page.tsx` kept its `requireAdmin()` call because the admin's id is needed for the self-action gate in `UserDetail`.

## Follow-ups (out of scope for this slice)

Carried into `TODOS.md` from the original review's deferred list:

- **Audit log retention cron.** Migration added more high-volume audit kinds (`user.email_changed` from `requestEmailChangeOp` + admin GET/mutation rows). 90-day cleanup is more pressing now.
- **Real-Postgres integration tests.** Enum-violation acceptance criterion (`UPDATE "user" SET role = 'hacker'` raises Postgres error) still unverified at the unit-test layer.
- **S3 listings features.** Admin Business CRUD, Google Places Autocomplete, sponsored sort, verified badge + rating, multi-category, gallery upload, city slugs — all out of scope; the migration only covered the existing shell.

## Recommended next step

**`/mlabs-qa`** — focused QA pass on the deployed Replit URL. Concrete scenarios worth running:

1. Sign-in as a regular user → `/home`, `/categories`, `/listings/<slug>` render with real data via the new routes.
2. Update profile name + change email + change password + delete account (don't actually delete — abort after confirming the form posts) — verify each form flows through the right `/api/v1/profile*` route.
3. Sign-in as admin → `/admin/users` list + filter + paginate → click into a user → exercise each of ban / unban / role-change / reset-password / notify → verify audit rows land.
4. Sit on `/admin/users` for >30 min → next click should bounce to `/login?reason=idle` via `apiServerFetch`'s redirect path.
5. From `/notifications`, mark a single row read + mark-all-read → bell unread-count updates.
6. From mobile (Expo Go): notifications list (live bug fix) + mark one read.
7. Push a manual commit with `"use server"` in `apps/web/src/features/` → verify lefthook rejects.

If anything regresses, `/mlabs-debug` against the failure → `/mlabs-code` against the resulting fix proposal.
