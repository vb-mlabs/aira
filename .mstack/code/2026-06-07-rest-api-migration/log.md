# Implementation log: REST API migration

## Session 1 (2026-06-07)

- Pre-flight: stashed pre-session WIP (app-sidebar/globals/hero/about-editorial), branched `feat/rest-api-migration` off `main`.
- Preamble commit `3e02b88` — plan + review + roadmap + CLAUDE.md + learnings bundle.

### Phase 0 — Foundation

- **T1 done** (`b287dfe`): `createApiClient` factory in `@aira/api/client`. 15 Vitest cases.
- **T2 done** (`c1f0d90`): `apiServerFetch` helper. Bundled `ApiError.idleTimeout()` factory (review's spec referenced a code that didn't exist). Single swappable `invokeRedirect`. 10 new Vitest cases; 47/47 api tests.
- **T3 done** (`ad2b42a`): mobile ApiError collapse. **Pause-If fired** — review enumerated 3 files, grep found 5. User approved full scope.
- **T4 done** (`e4222d7`): web `apiClient` composition root.

### Phase 1 — Listings shell

- **T5 done** (`2f528c7`): promoted listings reads. Bridge state on RSC pages (direct service imports — T7 cleans up).
- **T6 done** (`f12e5e7`): three new ops + routes.
- **T7 done** (`8152d1e`): 4 RSC pages on `apiServerFetch`. **Phase 1 complete.**

### Mid-run checkpoint

- User chose checkpoint after T7. `5c7ba3a` partial-run report; `6ea24ac` learning chore.

## Session 2 (2026-06-07, resumed)

- Pre-flight: working tree clean except the resume learning (committed as `6ea24ac` in session 1 wrap-up).

### Phase 2 — Profile

- **T8 done** (`8d78142`): four Server Actions deleted; `requestEmailChangeOp` + `getProfileOp` added; UI forms migrated to apiClient. Pause-If clear (no `useActionState`).

### Phase 3 — Admin

- **T9 done** (`0f3c4d0`): admin queries promoted; bridge pattern across RSC pages (direct service imports + explicit `requireAdmin()` — T12 cleans up).
- **T10 done** (`869d709`): three GET routes + ops.
- **T11 done** (`03f538c`): five mutation POST routes. Decision: rename op input `targetId` → `id` so `[id]` path-param auto-merge works.
- **T12 done** (`b016a3d`): admin RSC pages on `apiServerFetch`; UI mutation callers on `apiClient.post`; `features/admin/server/actions.ts` deleted. **Phase 3 complete.**

### Phase 4 — Notifications + Messages

- **T13 done** (`60926c4`): GET /api/v1/notifications + POST /api/v1/notifications/[id]/read. **Live mobile 404 fixed.** Validators package gained `/notifications` subpath (NotificationRow with ISO strings + NotificationBody discriminated union). Mobile screen + hook updated to new field names + body renderer.
- **T14 done** (`5121d82`): messages RSC pages migrated. Decision: in-process-only ops (no public route) so the existing service-direct GET routes can keep the `If-Modified-Since` 304 short-circuit for mobile + polling Client Components. **Phase 4 complete.**

### Phase 5 — Cleanup

- **T15 done** (`9b89a12`): `app/dev/{messages,notifications}/` directories deleted; `.next` cleared.
- **T16 done** (`60e5e52`): `runFromAction` + `setActionHeadersResolver` + `loadActionHeaders` + dynamic `next/headers` import deleted from `packages/api`. 3 vitest cases removed. 44/44 api tests still pass.
- **T17 work** (`a237159` + `cc6e497` + `4982a7c`):
  - `a237159` accidentally committed a verify-hook fixture before lefthook was reinstalled (gate didn't fire).
  - `cc6e497` shipped the hook config + script + removed the fixture.
  - **Inline resolution**: the first version of the hook script used pathspec `**` globs which git doesn't expand. Manual verification (stage a fixture + run the script directly) caught the false-pass.
  - `4982a7c` fixed the glob (directory filter + `grep -E '\.(ts|tsx)$'`); verified by re-staging a fixture → script exits 1 with the expected violation message.
- **T18 done** (`e617047`): ADR 0009 (Stripe carve-out) + addendum to ADR 0007 (apiServerFetch pattern) + CLAUDE.md cross-refs + api-versioning Stripe row.

### Run complete

23 commits on `feat/rest-api-migration`. All migrate-suite typechecks + tests green. lefthook passes on every commit (no `--no-verify`).
