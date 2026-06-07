# Review: REST API migration — eliminate Server Action + RSC bypasses of /api/v1/*

**Date:** 2026-06-07
**Slug:** 2026-06-07-rest-api-migration
**Plan reviewed:** [2026-06-07-rest-api-migration.md](../plans/2026-06-07-rest-api-migration.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** framer@millionlabs.co.uk

---

## Summary

Plan is approved and ready for `/mlabs-code`, with one structural correction recorded as a concern: Phase 2 was framed as "promote profile actions to services," but `updateNameOp`, `deleteAccountOp`, and `changePasswordOp` already exist at `apps/web/src/server/operations/users.ts` — the Server Action file is fully **duplicated** logic, not pre-service logic to be promoted. Phase 2 becomes delete-the-duplicate + migrate-callsites + add the one genuine gap (`requestEmailChangeOp` has no route or op today). The UI-Significant flag is `yes` mechanically (10 `page.tsx` files touched), but mockups can be skipped — this is a pure data-path refactor with zero rendered-pixel changes; recommended next step is `/mlabs-code` directly.

Live-bug confirmation: a local `curl http://localhost:5000/api/v1/notifications` returns **404**. Mobile's `apps/mobile/features/notifications/api.ts:20` already calls that URL — Phase 4's new route fixes a real bug, not just a refactor target.

## Findings

### Blockers (must fix before /mlabs-code)

None outstanding after concern resolution — see C1 below; the rewrite is captured in the task list.

### Concerns (raised, decided, recorded)

- **C1 — Phase 2 was mis-framed as "promote actions to services."**
  **Evidence:** `apps/web/src/server/operations/users.ts:42` defines `updateNameOp` whose handler reads current name, audits, then calls `auth.api.updateUser({ headers: await headers() })`. `apps/web/src/features/profile/server/actions.ts:34` defines `updateName(formData)` which does the **exact same flow** with its own audit + `auth.api.updateUser`. Likewise `deleteAccountOp` (line 22) + `deleteAccount` action (line 152), and `changePasswordOp` (referenced in the file comment) + `changePassword` action (line 108). All three op-action pairs are duplicated logic, kept in sync by hand.
  **Decision:** Phase 2 becomes: (a) delete the four Server Actions in `features/profile/server/actions.ts`, (b) migrate UI callers in `features/profile/components/` to `apiClient.patch("/api/v1/profile", { name })`, `apiClient.delete("/api/v1/profile")`, `apiClient.post("/api/v1/profile/password", ...)`, (c) add the one genuine gap: `requestEmailChangeOp` + `POST /api/v1/profile/email` route, (d) add `GET /api/v1/profile` + a `getProfileOp` for the RSC read in `(app)/profile/page.tsx`. Net effect identical to the plan's intent; mechanism is "delete duplicates" not "promote to services."

- **C2 — `features/admin/server/queries.ts` calls `requireAdmin()` itself.**
  **Evidence:** Lines 18 / 41 / etc. of `features/admin/server/queries.ts` `await requireAdmin()` inside each query function (`listUsers`, `getUserDetail`, `listAudit`).
  **Decision:** Once promoted to `packages/services/admin/queries.ts`, strip the `requireAdmin()` calls — services are pure (no auth, no Next deps) and the op's `permission: "admin"` gate covers it. `defineOperation` already enforces `meetsPermission(...)` and the cookie-only freshness gate (`enforceAdminFreshness` on `ctx.source === "web"` + admin). Double-checking would be redundant.

- **C3 — `features/listings/server/queries.ts` has no auth check today.**
  **Evidence:** Functions like `getFeaturedBusinesses` go straight to the DB. The pages that consume them sit under `apps/web/src/app/(app)/` — gated by the (app) layout's auth requirement, so the listing reads are effectively user-scope.
  **Decision (locked via question 2):** New `/api/v1/businesses` + `/api/v1/categories` ops use `permission: "user"` to preserve today's effective behavior. Downshifting to public is an additive change in v1 if PRD F7-F10 turns out to require unauth browse; no v2 bump needed.

- **C4 — Mobile `ApiError` is positional, package-root `ApiError` is named-args.**
  **Evidence:** `apps/mobile/lib/api/client.ts:84` `new ApiError(status, code, message, field?)` vs `packages/api/src/errors.ts:28` `new ApiError({ status, code, message, field?, cause? })`. Mobile-side importers: `apps/mobile/app/(auth)/login.tsx:10`, `apps/mobile/app/(auth)/reset-password.tsx:10`, and the class definition itself in `client.ts`.
  **Decision (locked via question 3):** Phase 0 collapses mobile onto the package root. Update the 3 callsites + the class definition; mobile re-exports `ApiError` from its shim for source-compat with any future importer. Single type identity across web + mobile. `instanceof ApiError` works regardless of which side throws.

- **C5 — `next/headers` inside operation handlers is the cookie source today.**
  **Evidence:** `users.ts` `updateNameOp.handler` does `await headers()` from `next/headers` to feed `auth.api.updateUser`. This works in both `runFromRequest` (Next request scope active) and `runFromAction` (same Next request scope). For the new `apiServerFetch` (in-process), the RSC outer scope is the *same* Next request, so `headers()` returns the outer request's headers, not the synthetic Request's. This is fine **only** because the synthetic Request is constructed from the outer request's cookies — they're the same headers either way.
  **Decision:** `apiServerFetch`'s synthetic `Request` constructor takes the outer `headers()` snapshot and copies cookies + `If-Modified-Since` + `X-Request-Id` (when present) into a new `Headers`. The handler's `next/headers` reads continue to work because we're still inside the outer Next scope. Acceptance test verifies: a stale admin RSC call gets bounced to `/login?reason=idle` by the same freshness gate path mobile uses for HTTP.

- **C6 — `apps/web/src/app/api/v1/profile/route.ts:7-9` comment is now wrong.**
  **Evidence:** The route file's docstring says "Web pages use Server Actions in features/profile/server/actions.ts; mobile reaches these routes. Logic stays in sync because both layers ultimately call the same operation handlers (or service functions)." After Phase 2 there are no Server Actions; web and mobile both hit `/api/v1/profile`.
  **Decision:** Phase 2 rewrites the comment to "Single REST surface for web + mobile; web RSC reads via apiServerFetch, mutations via apiClient." Trivial edit; calling it out so the migration doesn't leave docs stale.

- **C7 — Dev seed pages exist and consume the seed actions.**
  **Evidence:** `apps/web/src/app/dev/messages/page.tsx` + `apps/web/src/app/dev/notifications/page.tsx` exist. The `_seed-action.ts` files are imported by them.
  **Decision (locked via question 1):** Phase 5 deletes both `app/dev/messages/` and `app/dev/notifications/` directories whole (page + seed action). `app/dev/emails/` and `app/dev/states/` stay (they don't use Server Actions per the directory listing; will verify in Task 17). The lint check covers `app/dev/` without an allowlist.

- **C8 — Stripe webhook ADR.**
  **Evidence:** `apps/web/src/app/api/stripe/webhook/route.ts` already follows the service-layer rule (only the route handler imports `@aira/services`). The carve-out is purely an exemption from the `/api/v1/*` versioning prefix.
  **Decision (locked via question 4):** Write `docs/decisions/0009-stripe-webhook-carve-out.md`. Cross-reference from `CLAUDE.md` "API surface" bullet. Existing service-layer ADR (0007) stays unchanged; the carve-out doc explicitly notes Stripe still complies with 0007 — only 0006 (versioning, if it exists, else just `docs/api-versioning.md`) is exempt.

- **C9 — `runFromAction` test scope is bounded.**
  **Evidence:** `grep runFromAction packages/api/src/__tests__/operation.test.ts` shows one `describe("defineOperation.runFromAction")` block at line 261 with 3 test cases (lines 275, 291, 307). No other test file references it.
  **Decision:** Phase 5 deletes the block outright (per question 9 in plan — git history is the archive). No skip / no `.todo()`.

### Suggestions (taken or deferred)

- **S1 — Restate audit-log retention TODO urgency** (deferred).
  Phase 2's `requestEmailChangeOp` adds another high-volume audit kind (`user.email_changed`). The existing TODO in `TODOS.md` ("Audit log retention cron") gets more pressing. Suggested addition to `TODOS.md` for /mlabs-code to make once the migration lands: bump the trigger from "before public-facing prod release" to "before Phase 4 of the REST API migration ships." **Deferred** to keep this slice focused.

- **S2 — Vitest case for stale-admin RSC bounce via `apiServerFetch`** (taken — Task 2).
  Phase 0's `apiServerFetch` helper must be proven to fire the freshness gate identically to the HTTP path. Added to Task 2 acceptance.

- **S3 — Mobile contract test for `/api/v1/businesses`** (deferred).
  Phase 1's new businesses endpoints don't have a mobile consumer yet. Worth wiring `apps/mobile/features/businesses/api.ts` as a stub so the contract is exercised, but that's pre-emptive work for a future mobile screen. **Deferred** to the eventual S3 mobile slice.

- **S4 — `getProfileOp` permission level** (taken — Task 8).
  `permission: "user"` (matches `(app)` layout); RSC reads its own profile. Documented in Task 8.

## Decisions locked

Net new decisions beyond the plan doc:

- **Phase 2 reframed:** delete duplicate Server Actions, migrate UI callers, add only the missing `requestEmailChangeOp` + `POST /api/v1/profile/email` route + `getProfileOp` + `GET /api/v1/profile`. (C1)
- **`apiServerFetch` cookie/header contract:** copy cookies + `If-Modified-Since` + `X-Request-Id` from the outer `headers()` into the synthetic `Request`; auto-redirect to `/login?reason=idle` when `op.runFromRequest` throws `ApiError.unauthorized` with `code === "auth.idle_timeout"` for a cookie-authed admin op. (C5 + plan Q2)
- **Service-layer purity preserved:** new `packages/services/admin/queries.ts` does NOT call `requireAdmin()`; that's the op layer's job. Same purity applies to `packages/services/businesses` + `packages/services/categories`. (C2)
- **New endpoints permission:** `permission: "user"` for `/api/v1/businesses`, `/api/v1/businesses/[id]`, `/api/v1/categories`. (C3)
- **Mobile ApiError consolidation:** mobile collapses onto the package-root `ApiError` named-args constructor; mobile shim re-exports for source-compat. (C4)
- **Dev pages:** delete `apps/web/src/app/dev/messages/` + `apps/web/src/app/dev/notifications/` directories whole. (C7)
- **Stripe ADR:** new `docs/decisions/0009-stripe-webhook-carve-out.md`; cross-ref from `CLAUDE.md`. (C8)
- **Branch strategy:** single branch `feat/rest-api-migration`, phase-tagged commits. (Plan Q1)
- **Businesses endpoint shape:** one `GET /api/v1/businesses` with `?featured=`, `?category=`, `?limit=`; one `GET /api/v1/businesses/[id]` for detail. (Plan Q6)
- **Mobile import paths:** shim-only rewire — mobile features keep importing from `apps/mobile/lib/api/client.ts`, which re-exports from `@aira/api/client`. Zero churn across `apps/mobile/features/*`. (Plan Q7)
- **`runFromAction` tests:** delete outright (block at `operation.test.ts:261`). (C9 + plan Q9)
- **Lint enforcement:** lefthook grep for `"use server"` under `apps/web/src/{features,server,app}` (no allowlist needed — dev pages are deleted). (Plan Q5)

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is atomic (reviewable as a single commit). One feature branch: `feat/rest-api-migration`.

### Task 1: Promote mobile fetch wrapper into `@aira/api/client` as `createApiClient` factory

- **Files:** `packages/api/src/client.ts` (rewrite from stub) · `packages/api/package.json` (verify `./client` export) · `packages/api/src/__tests__/client.test.ts` (new)
- **What:** Move `apiRequest`/`apiGet`/`apiPost`/`apiPatch`/`apiDelete` logic from `apps/mobile/lib/api/client.ts` into a `createApiClient({ baseUrl, clientId, getAccessToken?, onRefresh?, refreshOnce?, fetchImpl? })` factory in `@aira/api/client`. Mobile-specific deps (SecureStore, token I/O, `/api/auth/refresh` loop) are injected via the factory args; the package itself stays runtime-agnostic. Vitest covers: bearer attach, `X-Client` header, conditional GET (304 short-circuit + `If-Modified-Since` passthrough), single-retry on 401, body encoding (JSON vs FormData vs string).
- **Acceptance:** `pnpm --filter @aira/api typecheck && pnpm --filter @aira/api test` green; the new file does not import `expo-secure-store`, `react-native`, or anything mobile-only; existing 10/10 auth tests still pass; 164/164 web tests still pass.

### Task 2: Add `apiServerFetch` helper in `@aira/api/server`

- **Files:** `packages/api/src/server-fetch.ts` (new) · `packages/api/src/server.ts` (re-export) · `packages/api/src/__tests__/server-fetch.test.ts` (new)
- **What:** Export `apiServerFetch<I, O>(op: Operation<I, O>, init?: { input?: I; ifModifiedSince?: string; pathParams?: Record<string, string> }): Promise<{ data: O | null; status: number; lastModified: string | null; notModified: boolean }>`. Internally builds a synthetic `Request` against `http://internal/api/v1/...` (URL only used for path-param construction), copies cookies + `If-Modified-Since` + `X-Request-Id` from `next/headers` `headers()` into the synthetic `Headers`, invokes `op.runFromRequest(req, { params })`, parses the JSON body, and either returns the typed shape or throws the parsed `ApiError`. **Special case:** if the thrown error is `unauthorized` AND `code === "auth.idle_timeout"` AND `ctx.source === "web"`, call `redirect("/login?reason=idle")` from `next/navigation` (helper imports `next/navigation` dynamically, mirroring the `next/headers` pattern in `operation.ts`).
- **Acceptance:** Vitest specs cover: happy path round-trips through `runFromRequest`; cookie forwarding (assert the synthetic Headers carry `Cookie` from `headers()`); `If-Modified-Since` passthrough yields `{ data: null, status: 304, lastModified, notModified: true }`; `ApiError.unauthorized()` thrown by a `permission: "user"` op surfaces as a thrown `ApiError`; admin stale-bounce case invokes the redirect (mock `next/navigation.redirect` and assert). `pnpm typecheck && pnpm lint && pnpm test` all green.
- **Pause if:** the redirect mock-assertion proves difficult to write because of the `next/navigation` ESM/async-storage shape — surface to user before bending the helper's contract.

### Task 3: Collapse mobile `ApiError` onto `@aira/api`'s class

- **Files:** `apps/mobile/lib/api/client.ts` (edit) · `apps/mobile/app/(auth)/login.tsx` (edit) · `apps/mobile/app/(auth)/reset-password.tsx` (edit)
- **What:** Delete the local `ApiError` class in mobile's `client.ts`. Import + re-export `ApiError` from `@aira/api`. Update the two construction sites in `client.ts` (`parseError` factories + the empty-response throw) to use the named-args constructor `new ApiError({ status, code, message, field })`. Update the two mobile importers (login + reset-password) — only the import path changes; their `instanceof ApiError` checks work unchanged because the re-export preserves identity.
- **Acceptance:** `pnpm --filter @aira/mobile typecheck` green. `grep -rn "class ApiError" apps/mobile` returns nothing. Manual sanity: a thrown server-side `ApiError` arrives at `login.tsx`'s catch with the field + code populated.
- **Pause if:** `grep -rn "from .*lib/api/client.*ApiError" apps/mobile` surfaces a callsite not enumerated above — could mean a new screen was added; ask before touching.

### Task 4: Wire web composition root `apps/web/src/lib/api-client.ts`

- **Files:** `apps/web/src/lib/api-client.ts` (new) · `apps/web/package.json` (verify `@aira/api` workspace dep present)
- **What:** Export a singleton `apiClient = createApiClient({ baseUrl: "", clientId: "web", fetchImpl: fetch })`. No token deps — web rides on cookies + `credentials: "include"` (default for same-origin). Used by Client Components for mutations; not used in RSCs (those go through `apiServerFetch`).
- **Acceptance:** `pnpm --filter @aira/web typecheck` green; a smoke import from a Client Component compiles.

### Task 5: Promote listings queries to `packages/services/{businesses,categories}` + add validators

- **Files:** `packages/services/src/businesses/{index.ts,queries.ts}` (new) · `packages/services/src/categories/{index.ts,queries.ts}` (new) · `packages/services/package.json` (extend `exports`) · `packages/validators/src/businesses.ts` (new) · `packages/validators/src/categories.ts` (new) · `packages/validators/src/index.ts` (re-export) · `apps/web/src/features/listings/server/queries.ts` (delete) · `apps/web/src/features/listings/types.ts` (move `VALID_TIERS`/`VALID_CATEGORIES` constants into validators or leave as re-exports — verify in code)
- **What:** Move `getFeaturedBusinesses`, `getBusinessesByCategory`, `getBusinessById`, `getBusinessCountsByCategory` into `packages/services/businesses/queries.ts` (the count helper is split between the two services — keep with businesses). The `(db, ...)` signature replaces the captured `db` import — services are pure. Zod schemas for `Business`, `BusinessCategory`, `BusinessTier`, `BusinessListQuery` move to `packages/validators/businesses.ts`; categories similarly.
- **Acceptance:** `pnpm --filter @aira/services typecheck && pnpm --filter @aira/services test` green; no `apps/web` import of the deleted `features/listings/server/queries.ts` remains (`grep` for it returns empty); 42 services tests still pass (count may grow if new ones land for the moved functions).
- **Pause if:** `features/listings/types.ts` exports interact in non-trivial ways with `BusinessCard` / `BusinessDetail` UI components — moving the type definitions might cascade. Confirm before touching the UI component imports.

### Task 6: Add `/api/v1/businesses` + `/api/v1/businesses/[id]` + `/api/v1/categories` routes + ops

- **Files:** `apps/web/src/server/operations/businesses.ts` (new) · `apps/web/src/server/operations/categories.ts` (new) · `apps/web/src/server/operations/index.ts` (re-export) · `apps/web/src/app/api/v1/businesses/route.ts` (new) · `apps/web/src/app/api/v1/businesses/[id]/route.ts` (new) · `apps/web/src/app/api/v1/categories/route.ts` (new) · `docs/api-versioning.md` (extend route table)
- **What:** Ops: `listBusinessesOp` (input: `{ featured?: boolean; category?: BusinessCategory; limit?: number }`, dispatches to `getFeaturedBusinesses` or `getBusinessesByCategory`), `getBusinessByIdOp`, `listCategoriesWithCountsOp`. All `permission: "user"`. Routes wire `runFromRequest`.
- **Acceptance:** `curl http://localhost:5000/api/v1/businesses?featured=true` (after sign-in cookie) returns valid `Business[]` JSON; `curl http://localhost:5000/api/v1/businesses?category=shopping` returns the category rows; `curl http://localhost:5000/api/v1/businesses/<id>` returns one row or 404; `curl http://localhost:5000/api/v1/categories?withCounts=true` returns the counts map. `pnpm typecheck && pnpm lint && pnpm test` all green.

### Task 7: Switch listings RSC pages to `apiServerFetch`

- **Files:** `apps/web/src/app/(app)/home/page.tsx` (edit) · `apps/web/src/app/(app)/categories/page.tsx` (edit) · `apps/web/src/app/(app)/listings/[category]/page.tsx` (edit) · `apps/web/src/app/(app)/listings/[category]/[id]/page.tsx` (edit)
- **What:** Replace `getFeaturedBusinesses` / `getBusinessesByCategory` / `getBusinessById` / `getBusinessCountsByCategory` imports with `apiServerFetch(listBusinessesOp, { input: { featured: true, limit: 6 } })` etc. Pages stay RSC; the call returns parsed data with the same shape.
- **Acceptance:** `pnpm dev` and load `/home`, `/categories`, `/listings/shopping`, `/listings/shopping/<id>` — identical render. `grep` confirms no `apps/web/src/features/listings/server/queries` import remains; `grep` confirms no `@aira/services/businesses` import inside `apps/web/src/app/`.

### Task 8: Delete profile Server Actions; migrate callers + add missing `requestEmailChange` + `getProfile` routes

- **Files:** `packages/services/src/users/{index.ts,service.ts}` (extend — add `requestEmailChange`, `getProfile`) · `apps/web/src/server/operations/users.ts` (extend — add `requestEmailChangeOp`, `getProfileOp`) · `apps/web/src/app/api/v1/profile/route.ts` (add `GET`; update top docstring) · `apps/web/src/app/api/v1/profile/email/route.ts` (new) · `apps/web/src/app/(app)/profile/page.tsx` (switch to `apiServerFetch(getProfileOp)`) · `apps/web/src/features/profile/components/**` (switch action callers to `apiClient.patch/post/delete`) · `apps/web/src/features/profile/server/actions.ts` (delete)
- **What:** `requestEmailChangeOp` mirrors the existing action: emits `user.email_changed` audit (with hashed `from_email_hash`) BEFORE calling `auth.api.changeEmail({ body: { newEmail }, headers: await headers() })`. `getProfileOp` returns `{ user: { id, email, name, image, emailVerified } }`. UI forms migrate from `<form action={updateName}>` patterns to `onSubmit={async (e) => { e.preventDefault(); await apiClient.patch(...) }}` with the existing toast/result UX preserved.
- **Acceptance:** `pnpm typecheck && pnpm lint && pnpm test` all green; `grep -rln '"use server"' apps/web/src/features/profile` returns empty; `/profile` page renders the same data; updating name persists + revalidates; password change still revokes other sessions; account delete still redirects home (the route returns 200 with `previousImage` field, the form handler then calls `router.push("/")`).
- **Pause if:** the UI components use Server-Action-specific patterns that don't trivially map to a `fetch`-based form handler (e.g. `useActionState` from React 19 — would need an `onSubmit` rewrite that the user should sign off on).

### Task 9: Promote admin queries to `packages/services/admin/queries.ts`

- **Files:** `packages/services/src/admin/queries.ts` (new) · `packages/services/src/admin/index.ts` (re-export new queries) · `packages/validators/src/admin.ts` (new — Zod for `AdminUserRow`, `AdminAuditRow`, `AdminUsersFilters`, `ListUsersResult`) · `apps/web/src/features/admin/server/queries.ts` (delete) · `apps/web/src/features/admin/types.ts` (re-export from `@aira/validators/admin` or move constants if they're not already shared)
- **What:** Move `listUsers`, `getUserDetail`, `listAudit` into the services package. **Strip the `await requireAdmin()` calls** — the op layer enforces it (C2 decision). Functions take `(db, filters)` instead of capturing `db` and consulting Better Auth.
- **Acceptance:** `pnpm --filter @aira/services typecheck && test` green; `grep` confirms no `requireAdmin` import in `packages/services/admin/`; 42+ services tests pass.

### Task 10: Add admin GET routes + ops (`listUsersOp`, `getUserDetailOp`, `listAuditOp`)

- **Files:** `apps/web/src/server/operations/admin.ts` (extend) · `apps/web/src/app/api/v1/admin/users/route.ts` (new) · `apps/web/src/app/api/v1/admin/users/[id]/route.ts` (new — GET only; mutation routes follow in Task 11) · `apps/web/src/app/api/v1/admin/audit/route.ts` (new) · `docs/api-versioning.md` (extend)
- **What:** Three ops with `permission: "admin"`. Handlers delegate to the services from Task 9. Routes `export const GET = op.runFromRequest`.
- **Acceptance:** Smoke `curl` with an admin cookie returns the expected JSON; non-admin cookie returns 403; missing cookie returns 401; idle admin (>30 min) returns 401 with `code: "auth.idle_timeout"` (verifies freshness gate fires).

### Task 11: Add admin mutation POST routes (ban / unban / role / reset-password / notify)

- **Files:** `apps/web/src/app/api/v1/admin/users/[id]/ban/route.ts` (new) · `unban/route.ts` (new) · `role/route.ts` (new) · `reset-password/route.ts` (new) · `notify/route.ts` (new) · `docs/api-versioning.md` (extend)
- **What:** The five ops (`banUserOp`, `unbanUserOp`, `changeRoleOp`, `sendPasswordResetToOp`, `sendAdminNotificationOp`) already exist; this task only wires the route handlers. `export const POST = op.runFromRequest`.
- **Acceptance:** `curl` round-trip for one mutation (ban → unban) writes the expected audit row + flips the DB column; freshness gate fires when admin session is stale.

### Task 12: Switch admin RSC pages + UI mutation callers; delete `features/admin/server/actions.ts`

- **Files:** `apps/web/src/app/admin/users/page.tsx` (edit) · `apps/web/src/app/admin/users/[id]/page.tsx` (edit) · `apps/web/src/app/admin/audit/page.tsx` (edit) · `apps/web/src/features/admin/components/**` (edit — swap Server Action imports for `apiClient.post`) · `apps/web/src/features/admin/server/actions.ts` (delete)
- **What:** RSC pages call `apiServerFetch(listUsersOp, { input: filters })` etc. Mutation UIs call `apiClient.post("/api/v1/admin/users/" + id + "/ban", { reason })` etc. Preserve the `revalidatePath` behavior in UI (call `router.refresh()` on success).
- **Acceptance:** `pnpm typecheck && pnpm lint && pnpm test` all green; `/admin/users` paginates + filters identical to before; banning a user still writes the audit row + reflects in the UI on next refresh; `grep -rln '"use server"' apps/web/src/features/admin` returns empty.

### Task 13: Add `GET /api/v1/notifications` + `POST /api/v1/notifications/[id]/read` + migrate notifications surface

- **Files:** `packages/services/src/notifications/index.ts` (extend if needed — verify `listNotifications` exists; if not, add) · `apps/web/src/server/operations/notifications.ts` (extend — add `listNotificationsOp`, `markReadByIdOp`) · `apps/web/src/app/api/v1/notifications/route.ts` (new — GET list) · `apps/web/src/app/api/v1/notifications/[id]/read/route.ts` (new — POST single mark-read) · `apps/web/src/app/(app)/notifications/page.tsx` (switch to `apiServerFetch`) · `apps/web/src/features/notifications/components/notification-item.tsx` (switch to `apiClient.post`) · `apps/web/src/features/notifications/components/notification-list.tsx` (switch to `apiClient.post`) · `apps/web/src/features/notifications/server-actions.ts` (delete) · `docs/api-versioning.md` (extend)
- **What:** **Fixes a live mobile bug** — `apps/mobile/features/notifications/api.ts:20` already calls `GET /api/v1/notifications`, currently 404s. Wire the route with the response shape mobile expects (verify the schema by reading mobile's `api.ts` types). Also wire the single-id `markReadByIdOp` for the per-item UX.
- **Acceptance:** `curl http://localhost:5000/api/v1/notifications` with a user cookie returns the list (no longer 404); single mark-read updates the row; bell unread-count drops; `grep -rln '"use server"' apps/web/src/features/notifications` returns empty.
- **Pause if:** mobile's `apps/mobile/features/notifications/api.ts` types don't cleanly match an existing service function's return shape — surfacing means we either underspecified the mobile contract or the service needs an adapter, both worth user input.

### Task 14: Switch messages RSC page to `apiServerFetch`

- **Files:** `apps/web/src/app/(app)/messages/page.tsx` (edit) · `apps/web/src/app/(app)/messages/[id]/page.tsx` (edit if it also imports services directly)
- **What:** `apiServerFetch(listConversationsOp)` for the inbox; thread page already calls `/api/v1/messages/conversations/[id]/messages` via mixed paths — audit and unify on `apiServerFetch` for RSC reads. Existing Client Component fetches at `features/messages/components/{new-conversation-form,thread}.tsx` stay (they already hit `/api/v1/*` directly; optional polish-pass to switch them to `apiClient.post` for consistency — record as part of this task only if trivially in-scope).
- **Acceptance:** Inbox page + thread page render identically; existing 304 short-circuit on conditional GETs still works (timestamp survives the `apiServerFetch` boundary); thread send still works.

### Task 15: Delete `app/dev/messages/` + `app/dev/notifications/` directories

- **Files:** `apps/web/src/app/dev/messages/page.tsx` (delete) · `apps/web/src/app/dev/messages/_seed-action.ts` (delete) · `apps/web/src/app/dev/notifications/page.tsx` (delete) · `apps/web/src/app/dev/notifications/_seed-action.ts` (delete)
- **What:** Wholesale removal per C7 decision. `app/dev/emails/` + `app/dev/states/` stay — verify they don't use `"use server"` (Task 17's lint gate would catch it otherwise).
- **Acceptance:** `pnpm typecheck && pnpm lint && pnpm test` green; nothing in `apps/web/src/app/` imports from the deleted paths.
- **Pause if:** a `Link` in some other dev page or sidebar references the deleted routes — clean those up too.

### Task 16: Delete `runFromAction` + `setActionHeadersResolver` + dynamic `next/headers` import from `packages/api`

- **Files:** `packages/api/src/operation.ts` (edit — remove `runFromAction`, `loadActionHeaders`, `setActionHeadersResolver`, `actionHeadersResolver`, dynamic `next/headers` import; drop `runFromAction` field from `Operation<I, O>` interface) · `packages/api/src/server.ts` (drop `setActionHeadersResolver` re-export) · `packages/api/src/__tests__/operation.test.ts` (delete the `describe("defineOperation.runFromAction", ...)` block at line 261)
- **What:** Structural enforcement — future Server Actions can't reach back into the op machinery because the surface is gone. Type system catches any remaining caller.
- **Acceptance:** `pnpm typecheck` green across all workspaces; `grep -rn "runFromAction\|setActionHeadersResolver" packages apps` returns empty; 164/164 web tests + reduced (down by 3) api tests still pass; the dynamic `next/headers` import is gone from `packages/api`.
- **Pause if:** `pnpm typecheck` flags a `runFromAction` reference outside the enumerated files — likely a missed callsite from earlier tasks; investigate root cause rather than silencing.

### Task 17: Lefthook check rejecting `"use server"` in `apps/web/src/{features,server,app}`

- **Files:** `lefthook.yml` (edit) · `tooling/scripts/check-no-server-actions.sh` (new — optional, if a shell script is cleaner than inline lefthook config)
- **What:** Pre-commit hook greps staged files for `"use server"` directive lines under the three guarded paths and fails the commit with an explanatory message pointing at `CLAUDE.md`'s API-surface rule + the `apiServerFetch` pattern. Negative test: introduce a single throwaway `apps/web/src/features/_lint-test.tsx` with `"use server"`, run the hook, watch it fail, then revert.
- **Acceptance:** A throwaway file with `"use server"` is rejected pre-commit; deleting it allows the commit. `app/dev/emails/` and `app/dev/states/` don't trigger the hook (verify; if they do, the task scope grows to include their cleanup).
- **Pause if:** existing `app/dev/emails/page.tsx` or `app/dev/states/page.tsx` itself contains `"use server"` (would trip the lint and require either deletion or allowlist — escalate the decision).

### Task 18: Docs — Stripe ADR, CLAUDE.md cross-ref, API-versioning table, service-layer ADR addendum

- **Files:** `docs/decisions/0009-stripe-webhook-carve-out.md` (new) · `CLAUDE.md` (edit — link the ADR + the `apiServerFetch` pattern from the "API surface" bullet) · `docs/api-versioning.md` (extend route table + add Stripe carve-out paragraph) · `docs/decisions/0007-service-layer.md` (append `apiServerFetch` section noting the in-process RSC adapter as the supported alternative) · `TODOS.md` (optional — restate audit-log retention urgency per S1)
- **What:** Documentation pass closing the loop. The ADR is short: "Stripe webhook lives at `/api/stripe/webhook` (not `/api/v1/*`) because Stripe owns the URL contract; the route handler still complies with the service-layer rule by being the sole importer of `@aira/services` in that path."
- **Acceptance:** All doc files render in markdown; cross-links resolve; the new route table in `api-versioning.md` lists every `/api/v1/*` route shipped by this migration; `CLAUDE.md` "Don't" list still references the rule but no longer feels incomplete.

## Open questions

For `/mlabs-code` to escalate, not guess.

- **OQ1 — Mobile notifications endpoint shape:** the route file doesn't exist today but mobile already targets it. Implementer should read `apps/mobile/features/notifications/api.ts` carefully and design the response schema to match. If mobile expects a shape that the existing `notifications` service doesn't natively produce, **pause** and propose a thin adapter layer in the op handler rather than reshaping the service.
- **OQ2 — Profile UI Server-Action-specific patterns:** if the existing forms use React 19's `useActionState` or `useFormStatus`, the `fetch`-based migration needs to preserve loading / error UX. Implementer's pause-if on Task 8 covers this.
- **OQ3 — Cookie forwarding under Next 16 RSC scope:** the `apiServerFetch` design relies on `next/headers` `cookies()` returning the live request's cookies. If Next 16 changed the contract here (the AGENTS.md `nextjs-agent-rules` block warns about this), implementer must read `node_modules/next/dist/docs/` before finalizing the helper — pause-if on Task 2 catches the relevant case.

---

**Total tasks:** 18 across 5 phases.
**UI-Significant:** yes (mechanical — 10 page.tsx files touched), but no visual changes; `/mlabs-mockup` can be skipped.
**Recommended next:** `/mlabs-code` — implementation will pause at the four task-level Pause-If triggers if reality diverges from the plan.
