# Plan: REST API migration — eliminate Server Action + RSC bypasses of /api/v1/*

**Date:** 2026-06-07
**Slug:** 2026-06-07-rest-api-migration
**Status:** reviewed
**Author:** framer@millionlabs.co.uk

---

## Problem

`apps/web` ships substantial parallel-path code that bypasses the `/api/v1/*` HTTP boundary:

- **5 Server Action files** using `"use server"` + `runFromAction` (or direct `db` + `audit` calls).
- **10 Server Components** importing `@aira/services` or feature-local server-query modules directly, with no REST counterpart for mobile.

A scan of `apps/web/src` enumerated 15 violations (A1–A5 + B1–B10) plus one edge case (Stripe webhook, C).

The new CLAUDE.md rule (2026-06-07) requires that **every feature be reachable over `/api/v1/*` so the Expo app uses the same contract as the Next.js app**. Today's drift means:

- Web-only features (listings shell B4–B7) have no mobile path at all; the recent off-roadmap end-user-app-shell work built them RSC-first and never produced a REST counterpart.
- Auth-sensitive admin mutations (A1) and profile mutations (A3) live in two places (Server Actions vs. partial REST), making contract changes a multi-file dance with drift risk.
- `packages/api`'s `defineOperation.runFromAction` adapter encourages the bypass by design — its existence is the architectural license for the violation.

**Success looks like:** zero `"use server"` files in `apps/web/src/{features,server,app}`, every page-level data read goes through the `/api/v1/*` contract (in-process via a shared helper for RSCs, over HTTP for client components and mobile), and `runFromAction` is deleted from `packages/api` so future code can't reintroduce the bypass.

**Who benefits:** the mobile team (no more "this exists on web only"), the contract-versioning discipline in `docs/api-versioning.md` (one surface to evolve, not two), and future contributors (the type system, not just code review, enforces the rule).

## Scope

**In:**

- **Phase 0 — Foundation.** Promote `apps/mobile/lib/api/client.ts` to `@aira/api/client` as a `createApiClient(deps)` factory so web and mobile import the same fetch wrapper. Add `apiServerFetch` helper in `@aira/api/server` that invokes `op.runFromRequest` in-process with forwarded cookies (no HTTP hop) — the supported pattern for Server Components.
- **Phase 1 — Listings shell (B4–B7).** Promote `apps/web/src/features/listings/server/queries.ts` into `packages/services/businesses` + `packages/services/categories`. Add `GET /api/v1/businesses` (with `?featured`, `?category`, `?id`), `GET /api/v1/businesses/[id]`, `GET /api/v1/categories?withCounts=true`. Switch four RSC pages to `apiServerFetch`.
- **Phase 2 — Profile (A3 + B3).** Promote `apps/web/src/features/profile/server/actions.ts` bodies into `packages/services/users` (single site in the codebase that writes `db` + `audit` outside services). Extend the existing `updateNameOp` family on `apps/web/src/server/operations/users.ts`. Add `GET /api/v1/profile` for the RSC read in `(app)/profile/page.tsx`. Delete the Server Action file.
- **Phase 3 — Admin surface (A1 + B8/B9/B10).** Add `listUsersOp`, `getUserDetailOp`, `listAuditOp` (currently in `@/features/admin/server/queries`). Add routes: `GET /api/v1/admin/{users,users/[id],audit}`, `POST /api/v1/admin/users/[id]/{ban,unban,role,reset-password,notify}`. Switch the three admin pages to `apiServerFetch`. Switch UI mutation callsites from Server Actions to `apiClient.post(...)`. Delete `features/admin/server/actions.ts`. Verify the admin freshness gate still fires through `apiServerFetch`.
- **Phase 4 — Messages + Notifications (B1 + B2 + A2).** RSC reads via `apiServerFetch` against existing `GET /api/v1/messages/conversations` and a new `GET /api/v1/notifications` (mobile already targets this URL — verify whether it currently 404s, which would mean we're also fixing a live mobile bug). Add `POST /api/v1/notifications/[id]/read` for the single-id case A2 needs. Switch `markRead/markAllRead` callsites to `apiClient`. Delete `features/notifications/server-actions.ts`.
- **Phase 5 — Cleanup + enforcement.** Delete `app/dev/messages/_seed-action.ts` + `app/dev/notifications/_seed-action.ts` (annotated for v1-ship removal). Delete `runFromAction` + `setActionHeadersResolver` + `loadActionHeaders` + the dynamic `next/headers` import from `packages/api/src/operation.ts`. Drop the `runFromAction` field from `Operation<I, O>`. Add a lefthook + ESLint check rejecting `"use server"` directives anywhere in `apps/web/src/{features,server,app}` (only the dev-only escape, if kept, would need an explicit allow-list). Update `docs/api-versioning.md` to reflect the new routes + the deletion of action-direct ops. Update `CLAUDE.md` "API surface" bullet + service-layer ADR to note the in-process `apiServerFetch` pattern is the supported alternative for RSCs.

**Stripe webhook carve-out (C):** `apps/web/src/app/api/stripe/webhook/route.ts` stays under `/api/stripe/*` (Stripe owns the URL contract — moving it would be a vendor reconfiguration, not a refactor). It already only imports `@aira/services` from a route handler, consistent with the service-layer rule. Document the carve-out in `CLAUDE.md` and `docs/api-versioning.md` so it doesn't look like an oversight.

**Out (deferred):**

- **Sponsored sort, multi-category attach, verified badge + rating, Google Places Autocomplete, gallery upload, admin Business CRUD** — these are Sprint 3 scope (per `roadmap.md`). This migration only covers what's already on `main`; it does not pre-build the unfinished S3 features. The listings REST endpoints land with the *shell's* current shape (single category, sample data) and grow when S3 ships.
- **Replacing React-side `fetch('/api/v1/...')` callsites that are already correct** (waitlist, avatar, messages/thread, messages/new-conversation) — they're not violations. They'll get a one-line refactor to `apiClient.get/post(...)` if Phase 0 lands the shared client and the lint check insists; otherwise leave alone.
- **GraphQL / tRPC introduction.** Out by CLAUDE.md "Don't introduce a new ORM / auth lib / styling system" spirit. We have REST. Stay there.
- **Re-architecting messages/notifications around websockets / SSE.** Not in this slice. Conditional GETs + `If-Modified-Since` are the current contract; preserve.
- **OpenAPI generation.** Nice to have, separate slice. Plan only ensures Zod schemas live in `packages/validators` so a future generator has a single source.
- **Touching `/api/auth/*` (Better Auth catch-all + JWT refresh) or `/api/storage/*` (avatar proxy).** Per `docs/api-versioning.md` these are explicitly un-versioned by design.

## Approach

**One plan, five ordered phases, one feature branch (`feat/rest-api-migration`).** Each phase is independently shippable in commits if the team prefers cherry-pick rollouts, but the plan + review pair is single-pass so we don't relitigate the architecture five times. `/mlabs-code` will execute phase-by-phase with atomic commits, pausing at any genuine ambiguity.

**RSC data path: in-process `op.runFromRequest`, not real HTTP and not Client Components.** The `defineOperation` adapter already accepts a `Request` and returns a `Response`; we add an `apiServerFetch(op, init?)` helper in `@aira/api/server` that:

1. Constructs a `Request` against `new URL("/api/v1/...", "http://internal")` with the current incoming cookies (read via `next/headers` `cookies()`).
2. Forwards `If-Modified-Since` when the caller passes it, so the 304 short-circuit still works for messages/notifications reads.
3. Invokes `op.runFromRequest(request)` directly in the same Node process — same auth pipeline, same admin freshness gate (the gate keys off `ctx.source === "web"` + cookies, which apiServerFetch sets), same Zod validation, same `ApiError` mapping.
4. Returns parsed JSON or throws a typed `ApiError`. RSCs still SSR; no spinner UX regressions.

This honors the new CLAUDE.md rule (every feature reachable over `/api/v1/*`, single contract) without paying for an HTTP round-trip per RSC. Mobile + Client Components hit the same routes via the new `@aira/api/client`. The contract — Zod input/output schemas in `packages/validators`, `ApiError` codes, auth + freshness behavior — is uniform across all four callers (web RSC, web client, mobile, internal in-process).

**Shared client factory (`@aira/api/client`).** Promotes `apps/mobile/lib/api/client.ts` as `createApiClient({ baseUrl, clientId, getAccessToken?, onRefresh?, refreshOnce? })`. Mobile composition root injects `expo-secure-store` token I/O + the refresh loop (mobile-specific bearer pattern). Web composition root creates an instance with `baseUrl: ""`, `clientId: "web"`, and no token deps — cookies ride along on `credentials: "include"`. Both call `apiClient.get/post/patch/delete`. The mobile-side `ApiError` collapses into the package root `ApiError` (already exported from `@aira/api`); mobile keeps a thin shim only if a re-export is needed for type identity.

**`runFromAction` deletion.** Once Phases 1–4 land, no callers remain. Phase 5 deletes the adapter + the `next/headers` dynamic import + the `setActionHeadersResolver` test seam + the `Operation.runFromAction` type field. This is the structural enforcement — future code reaching for the bypass gets a compile error, not just a review comment. The lint check is a belt-and-braces second line for the `"use server"` directive itself (since a future contributor could write a direct `db` action without `runFromAction`).

**Alternatives considered:**

- **B. Real `fetch()` from RSC over same-origin HTTP** — rejected. Adds latency per RSC for no contract benefit (the in-process helper runs through `op.runFromRequest`, so it exercises every gate the HTTP path does). Same-origin absolute URL construction is also fragile across Replit dev/prod hosts.
- **C. Convert pages to Client Components + React Query** — rejected. Loses SSR + initial-paint advantages; introduces spinner UX on every screen; bigger client bundle. Maximum web/mobile parity isn't worth those tradeoffs for SSR-friendly pages like `/home`, `/categories`, profile.
- **Sliced by domain (separate plan per phase)** — rejected. We'd relitigate the in-process-helper decision, the client-factory shape, and the `runFromAction`-deletion decision in every plan. One plan reduces that overhead to once.
- **Keep `runFromAction` as escape hatch** — rejected. "Escape hatch" tends to leak; the type-system enforcement is the whole point of the structural change.

## Data model changes

- **None.** This is an architectural refactor of how data is read and mutated; no schema changes. Phases 1 + 3 require new Zod validator schemas in `packages/validators` for the businesses, categories, and admin domains (`packages/validators/businesses.ts`, `packages/validators/categories.ts`, `packages/validators/admin.ts`), but no migrations.

## Files to touch

**New:**

- `packages/api/src/client.ts` — promote mobile fetch wrapper as `createApiClient(deps)` factory.
- `packages/api/src/server-fetch.ts` (or extend `server.ts`) — `apiServerFetch(op, init?)` helper.
- `packages/services/businesses/{index.ts,queries.ts}` — promoted from `apps/web/src/features/listings/server/queries.ts`.
- `packages/services/categories/{index.ts,queries.ts}` — promoted from same source.
- `packages/services/admin/queries.ts` — promoted from `apps/web/src/features/admin/server/queries.ts` (the read side; mutations are already in `packages/services/admin`).
- `packages/validators/{businesses,categories,admin}.ts` — Zod schemas shared by ops + clients.
- `apps/web/src/lib/api-client.ts` — composition root that calls `createApiClient` with web defaults.
- `apps/web/src/app/api/v1/businesses/route.ts` + `apps/web/src/app/api/v1/businesses/[id]/route.ts` — Phase 1.
- `apps/web/src/app/api/v1/categories/route.ts` — Phase 1.
- `apps/web/src/app/api/v1/notifications/route.ts` (GET list) + `apps/web/src/app/api/v1/notifications/[id]/read/route.ts` (POST) — Phase 4.
- `apps/web/src/app/api/v1/admin/users/route.ts` + `apps/web/src/app/api/v1/admin/users/[id]/route.ts` (GET detail) + `apps/web/src/app/api/v1/admin/users/[id]/{ban,unban,role,reset-password,notify}/route.ts` (POST mutations) + `apps/web/src/app/api/v1/admin/audit/route.ts` — Phase 3.
- Vitest specs: `packages/api/src/__tests__/{client.test.ts,server-fetch.test.ts}`, route-level integration tests (mockable subset) for each new route.

**Edit:**

- `packages/api/src/operation.ts` — Phase 5: delete `runFromAction`, `setActionHeadersResolver`, `loadActionHeaders`, the dynamic `next/headers` import, and the `Operation.runFromAction` field.
- `packages/api/src/server.ts` — drop `setActionHeadersResolver` re-export.
- `apps/web/src/server/operations/{users,admin,notifications}.ts` — extend with new `runFromRequest`-only ops (listUsers, getUserDetail, listAudit, listNotifications, markReadById, getProfile, etc.).
- `apps/web/src/app/api/v1/profile/route.ts` — add `GET` handler (Phase 2 / B3).
- `apps/web/src/app/(app)/{home,categories,listings/[category],listings/[category]/[id],messages,notifications,profile}/page.tsx` — switch from direct imports to `apiServerFetch`.
- `apps/web/src/app/admin/{audit,users,users/[id]}/page.tsx` — same switch.
- UI mutation callsites for admin/notifications/profile — switch from Server Action import to `apiClient.post/patch(...)`.
- `apps/mobile/lib/api/client.ts` — collapse into a thin shim that calls `createApiClient(...)` from `@aira/api/client` with mobile-specific dep injection (SecureStore + refresh loop). All 5 `apps/mobile/features/*/api.ts` files retain their import paths via re-export.
- `apps/mobile/features/{auth,avatar,messages,profile,notifications}/api.ts` — verify imports still resolve after the shim swap; usually no change.
- `docs/api-versioning.md` — extend the route table; add Stripe carve-out paragraph; mark the v1 surface complete relative to web's RSC reads.
- `docs/decisions/0007-service-layer.md` — append a section on `apiServerFetch` as the supported RSC pattern (so the ADR matches the new CLAUDE.md rule).
- `CLAUDE.md` — link the Stripe webhook carve-out, link to `apiServerFetch` from the "API surface" bullet, add the lefthook/ESLint check to the toolchain notes.
- `lefthook.yml` (or `tooling/eslint/...`) — add the `"use server"` check.

**Delete (Phase 5):**

- `apps/web/src/features/admin/server/actions.ts`
- `apps/web/src/features/notifications/server-actions.ts`
- `apps/web/src/features/profile/server/actions.ts`
- `apps/web/src/app/dev/messages/_seed-action.ts` (and parent `/dev/messages` route if it's the sole content)
- `apps/web/src/app/dev/notifications/_seed-action.ts` (same caveat)

## Edge cases

- **Admin freshness gate in RSCs.** The 30-min idle gate currently throws `ApiError.unauthorized` from `op.runFromRequest` when a cookie-authed admin is stale. RSCs calling `apiServerFetch` must catch and `redirect("/login?reason=idle")` instead of letting the error bubble to Next's error boundary. Decide: handle inside `apiServerFetch` for `ctx.source === "web"` cookie-authed admin operations, or require each RSC to catch + redirect. Recommend handling inside the helper to match the existing `requireAdmin()` ergonomics.
- **Cookie forwarding across in-process boundary.** `apiServerFetch` constructs a synthetic `Request` and reads cookies via `cookies()` from `next/headers`. The constructed `Request` must include those cookies in its `Cookie` header so `getSession()` resolves the same way an HTTP request would. Verify in the Phase 0 acceptance test.
- **Conditional GETs (304 short-circuit).** Messages list + notifications unread-count use `If-Modified-Since`. `apiServerFetch` must accept and forward `ifModifiedSince` and return a typed `{ data: null, status: 304, lastModified }` shape — same as mobile's `apiRequest`. RSCs should also expose `Last-Modified` to Next's revalidation if applicable.
- **Mobile `ApiError` reconciliation.** Mobile's local class has `(status, code, message, field?)`; the package-root `ApiError` has `code` + `message` + `toResponse()`. They're structurally close — collapse mobile onto the package root so `instanceof ApiError` matches across web and mobile. Risk: any `try { … } catch (e) { if (e instanceof ApiError) … }` site in mobile keeps working only if the re-export is identity-preserving.
- **`GET /api/v1/notifications` missing route.** Mobile's `apps/mobile/features/notifications/api.ts:20` already calls this URL, but the route file doesn't exist. Either the call is dead code in mobile (worth confirming) or this migration is also fixing a 404 on the deployed app. Either way, Phase 4 adds the endpoint with the schema mobile already expects.
- **`features/profile/server/actions.ts` includes side effects beyond db** — likely `redirect()` after some flows (sign out after account delete?), avatar deletion via `storage`, audit before action. The promotion to `packages/services/users` must preserve audit-before-write ordering (matches the rest of the services convention) and the route handler must orchestrate the redirect, not the service.
- **Dev seed actions A4/A5.** Confirm whether `app/dev/messages/page.tsx` (or sibling) still renders and uses these actions. If yes, the page also goes; if no, they're orphaned and deletion is trivial. Either way, they're tagged "Removed before v1 ship" in their own headers.
- **Lefthook lint rule scope.** Should reject `"use server"` in `apps/web/src/{features,server,app}` but tolerate it in `apps/web/src/__archive__/` or test fixtures if any exist. Use ESLint's `no-restricted-syntax` with a `Literal[value="use server"]` selector under an opt-in plugin, or a simple lefthook grep — review will lock the implementation choice.
- **API-version contract impact.** Per `docs/api-versioning.md`, adding endpoints under `/api/v1/*` is explicitly **additive** and non-breaking; the existing `PATCH /api/v1/profile` route stays. Mobile builds keep working without a re-release. No `v2` namespace needed.
- **Stripe webhook idempotency** — out of scope (untouched). Just call out in the carve-out doc that we are knowingly not migrating it.
- **`runFromAction` test coverage.** The `packages/api/src/__tests__/operation.test.ts` suite exercises `runFromAction` directly. Phase 5 must update or delete those test cases when the surface is removed; don't let them silently keep a stub alive.

## Acceptance criteria

- [ ] **Phase 0 foundation lands cleanly.** `@aira/api/client` exposes `createApiClient(deps)`; `@aira/api/server` exposes `apiServerFetch(op, init?)`; both have unit-level Vitest coverage; mobile's `apps/mobile/lib/api/client.ts` is a thin shim over the shared factory; `pnpm typecheck && pnpm lint && pnpm test` all green.
- [ ] **Zero `"use server"` directives in `apps/web/src/{features,server,app}`** (verified by `grep -rl '"use server"' apps/web/src` returning empty).
- [ ] **Zero imports of `@aira/services` outside `apps/web/src/app/api/{v1,stripe}/` and `apps/web/src/server/operations/`** (verified by `grep -rl "from ['\"]@aira/services"` returning only those paths).
- [ ] **Zero direct imports of `@aira/db` or `@/lib/db` in `apps/web/src/app/(app)/` or `apps/web/src/app/admin/` page files** (RSC pages go through `apiServerFetch`).
- [ ] **`defineOperation.runFromAction`, `setActionHeadersResolver`, `loadActionHeaders`, and the dynamic `next/headers` import are deleted** from `packages/api/src/operation.ts`. The `Operation<I, O>` type no longer has the `runFromAction` field. `pnpm typecheck` proves no caller remains.
- [ ] **`docs/api-versioning.md` route table is updated** to include all new routes; the Stripe webhook carve-out is explained; the `service-direct` rows in the existing table are reconciled with the new pattern.
- [ ] **`CLAUDE.md` is updated** with: the `apiServerFetch` pattern as the supported RSC alternative; the Stripe webhook carve-out; the lefthook/ESLint rule.
- [ ] **Lefthook (or ESLint) check rejects new `"use server"` files** under `apps/web/src/{features,server,app}` in pre-commit. Verified by introducing a single-line test fixture in a temp commit + watching the hook reject it (then revert).
- [ ] **All existing tests pass:** 164/164 apps/web, 42/42 services, 10/10 auth (counts may grow with new test files; baseline must not regress).
- [ ] **Manual QA on deployed Replit URL** (one round, ideally via `/mlabs-qa`): `/home`, `/categories`, `/listings/[category]`, `/listings/[category]/[id]` still render with the same data; admin user ban/unban/role-change still works end-to-end including the audit row; profile name update still saves + revalidates; admin idle-timeout still bounces an admin past 30 min; messages thread still posts + 304-shortcircuits on revisit; single notification mark-read still updates the bell.
- [ ] **Mobile sanity check.** `pnpm --filter @aira/mobile typecheck` clean; one end-to-end mobile flow (sign in → load notifications list → mark one read) works against the new `/api/v1/notifications` + `/api/v1/notifications/[id]/read` endpoints (this is the live-bug-fix half of Phase 4).
- [ ] **`runFromAction` test cases in `packages/api/src/__tests__/operation.test.ts` are deleted (not skipped or ignored)** as part of Phase 5.

## Open questions

For `/mlabs-review` to resolve before implementation.

- **Q1 — Branch strategy.** One branch with five ordered commit-groups, or `feat/rest-api-migration-phase-N` branches stacked off the previous? Recommend one branch with phase-tagged commits, matching the auth-rbac-hardening precedent.
- **Q2 — Freshness-gate redirect placement.** Should `apiServerFetch` automatically `redirect("/login?reason=idle")` when `op.runFromRequest` throws `unauthorized` for a cookie-authed admin, or should each RSC catch + redirect? Recommend auto-redirect in the helper for ergonomic parity with `requireAdmin()`.
- **Q3 — `GET /api/v1/notifications` confirmation.** Verify whether mobile's call to this URL currently 404s on prod. If yes, Phase 4 promotes from "refactor" to "live bug fix" — flag in the QA round.
- **Q4 — Dev seed deletion scope.** Confirm whether `apps/web/src/app/dev/messages/` and `apps/web/src/app/dev/notifications/` page files still exist and are used. If yes, delete the full directories; if no, the seed-action files are orphans and deletion is trivial.
- **Q5 — Lint enforcement implementation.** Lefthook grep, ESLint `no-restricted-syntax`, or a small custom ESLint plugin? Tradeoff: grep is one-line + cheap; ESLint is editor-integrated + catches in-flight. Recommend lefthook for the directive check (cheap, definitive) + a follow-up ADR for a richer custom rule.
- **Q6 — Listings page count of phase 1 endpoints.** Should `GET /api/v1/businesses` support all of `?featured=`, `?category=`, `?id=` (single endpoint with query parameters) or split into `/featured`, `/by-category/[slug]`, `/[id]`? Recommend one endpoint with query params + one detail endpoint (`/[id]`), matching the existing `/conversations` shape.
- **Q7 — Mobile re-export shim or full move?** When `createApiClient` lands in `@aira/api/client`, should mobile's `lib/api/client.ts` shrink to `export { ... } from "@aira/api/client"` re-exports, or should every mobile feature update its import paths to `@aira/api/client` directly? Recommend re-export shim for this slice (zero churn across mobile features) + a follow-up to flatten the indirection.
- **Q8 — Stripe webhook documentation placement.** A one-paragraph carve-out in `CLAUDE.md` is enough, or do we want a dedicated `docs/decisions/0009-stripe-webhook-carve-out.md` ADR? Recommend the latter — keeps CLAUDE.md tight and gives the decision a permanent home.
- **Q9 — `runFromAction` test deletion vs. preservation as historical record.** Phase 5 deletes the production code path; do we delete the tests outright or move them to an archive with a note? Recommend delete; git history is the archive.
