# Implementation log: REST API migration

## 2026-06-07

- Pre-flight: stashed pre-session WIP (app-sidebar/globals/hero/about-editorial), branched `feat/rest-api-migration` off `main`.
- Preamble commit `3e02b88` — plan + review + roadmap + CLAUDE.md + learnings bundle.

### Phase 0 — Foundation

- **T1 done** (`b287dfe`): `createApiClient` factory in `@aira/api/client`. 15 Vitest cases; 37/37 pass; typecheck clean.
- **T2 done** (`c1f0d90`): `apiServerFetch` helper in `@aira/api/server`. Bundled `ApiError.idleTimeout()` factory (precondition — was missing). Single swappable `invokeRedirect` (first version had test/real race). 10 new Vitest cases; 47/47 api tests pass.
- **T3 done** (`ad2b42a`): mobile ApiError collapse. **Pause-If fired** — review enumerated 3 files, grep found 5 (`features/auth/api.ts`, `features/avatar/api.ts` additional). User approved full scope. 9 construction sites + `@aira/api` workspace dep added.
- **T4 done** (`e4222d7`): web `apiClient` composition root. Trivial 20-line file.

### Phase 1 — Listings shell (pre-S3 fix)

- **T5 done** (`2f528c7`): promoted listings reads to `@aira/services/{businesses,categories}`. Validators gained `/businesses` + `/categories` subpaths. Services package needed `@aira/validators` added as a workspace dep (was implicit through `@aira/api`). 4 RSC pages bridged with direct service imports — T7 swaps to apiServerFetch.
- **T6 done** (`f12e5e7`): three new ops + routes (`GET /api/v1/businesses`, `GET /api/v1/businesses/[id]`, `GET /api/v1/categories`), all `permission: "user"`. `docs/api-versioning.md` route table extended.
- **T7 done** (`8152d1e`): 4 RSC pages (home, categories, listings/[category], listings/[category]/[id]) now read via apiServerFetch. **Phase 1 complete — pre-S3 listings shell fully on one REST contract.**
