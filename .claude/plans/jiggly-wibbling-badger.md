# Plan: complete T13–T18 of the REST API migration

## Context

A `/mlabs-code` run is in progress on branch `feat/rest-api-migration`,
executing the 18-task implementation review at
`.mstack/reviews/2026-06-07-rest-api-migration.md`. **T1–T12 are
committed** (15 commits total: 1 preamble + 1 partial-run report + 12
task commits + 1 ledger top-up). The first 7 tasks landed in a prior
session; this session resumed and added T8–T12 (profile Server Actions
deletion + admin services promotion + admin GET routes + admin mutation
POST routes + admin RSC/UI swap).

Plan mode activated while I was mid-T13, **between writing the validators
schema file and committing**. The file `packages/validators/src/notifications.ts`
is currently uncommitted on disk — it's a new file containing Zod schemas
for the notifications inbox / mark-read contracts. It is **harmless if
left in place** (no other code imports it yet), but should either be
committed as part of T13 or `git restore`'d before the next session
resumes.

## Current branch state

```
b016a3d  feat(web): switch admin RSC pages + mutation UI to REST            (T12 ✓)
03f538c  feat(api): /api/v1/admin mutation POST routes (ban, unban, ...)    (T11 ✓)
869d709  feat(api): /api/v1/admin GET routes + ops (users, users/[id], audit)(T10 ✓)
0f3c4d0  feat(services): promote admin queries to @aira/services + ...     (T9 ✓)
8d78142  feat(web): profile Server Actions → REST                          (T8 ✓)
6ea24ac  chore(mstack): append partial-run learning                         (housekeeping)
5c7ba3a  chore(mstack): partial run report — Phase 0 + Phase 1               (mid-run report)
8152d1e  feat(web): switch listings RSC pages to apiServerFetch             (T7 ✓)
f12e5e7  feat(api): /api/v1/businesses + /api/v1/categories routes + ops    (T6 ✓)
2f528c7  feat(services): promote listings reads to @aira/services + ...     (T5 ✓)
e4222d7  feat(web): apiClient composition root                              (T4 ✓)
ad2b42a  refactor(mobile): collapse local ApiError onto @aira/api           (T3 ✓)
c1f0d90  feat(api): apiServerFetch helper for in-process RSC op invocation  (T2 ✓)
b287dfe  feat(api): createApiClient factory in @aira/api/client             (T1 ✓)
3e02b88  chore(mstack): plan + review + docs for REST API migration         (preamble)
```

Working tree carries one uncommitted new file:
`packages/validators/src/notifications.ts` (Zod schemas; ~50 lines).

## Remaining tasks (T13–T18)

Six tasks left. The first two (T13–T14) are Phase 4. The last four are
Phase 5 cleanup + structural enforcement + docs.

### T13 — Notifications routes + migrate surface (live mobile 404 fix)

**Files:**
- `packages/validators/src/notifications.ts` — **already drafted** (uncommitted on disk; defines `NotificationRowSchema`, `NotificationBodySchema` discriminated union, `ListInboxOutputSchema`, `MarkReadInputSchema`, `MarkResultSchema`).
- `packages/validators/package.json` — add `"./notifications": "./src/notifications.ts"` export.
- `packages/validators/src/index.ts` — `export * from "./notifications"`.
- `apps/web/src/server/operations/notifications.ts` — add `listInboxOp` (permission: "user", projects service Date fields to ISO strings at the op boundary).
- `apps/web/src/app/api/v1/notifications/route.ts` (NEW) — `export const GET = listInboxOp.runFromRequest`.
- `apps/web/src/app/api/v1/notifications/[id]/read/route.ts` (NEW) — wires the existing `markReadOp` (already accepts `{ id }`).
- `apps/web/src/app/(app)/notifications/page.tsx` — replace direct `notifications.listInbox(db, ctx)` import with `apiServerFetch(listInboxOp, { input: {} })`.
- `apps/web/src/features/notifications/components/notification-list.tsx` — switch `import type { NotificationRow } from "@aira/services/notifications"` to `@aira/validators/notifications` (string-dated public shape). Switch `markAllRead` action call to `apiClient.post("/api/v1/notifications/mark-all-read", {})`.
- `apps/web/src/features/notifications/components/notification-item.tsx` — same import switch + replace `markRead(id)` action with `apiClient.post(`/api/v1/notifications/${row.id}/read`, {})`. `formatRelative` already accepts string dates via `new Date(d)`.
- `apps/web/src/features/notifications/server-actions.ts` — **delete**.
- `apps/mobile/features/notifications/api.ts` — update `Notification` interface + `listNotifications` return shape to match the new contract (`{ id, type, body, read_at, created_at }` — public type from `@aira/validators/notifications`). The current mobile fields `kind`, flat string body, `read: boolean`, `createdAt` were speculative since the endpoint never existed; align with the real shape.
- `docs/api-versioning.md` — extend route table.

**Live bug being fixed:** `apps/mobile/features/notifications/api.ts:20` already calls `GET /api/v1/notifications`. A direct `curl` against the deployed server returns **404** today. T13 lands the route + corrects mobile's expected response shape simultaneously.

**Schema reconciliation note:** the service's internal `NotificationRow` uses `read_at: Date | null` + `created_at: Date`. The public wire shape uses ISO strings. The op handler projects at the boundary; web components migrate from importing the Date-based service type to the string-based validator type.

### T14 — Switch messages RSC page to apiServerFetch

**Files:**
- `apps/web/src/app/(app)/messages/page.tsx` — replace direct `@aira/services/messages` import with `apiServerFetch(listConversationsOp, { ifModifiedSince })`. The route `GET /api/v1/messages/conversations` already exists (service-direct today; lives outside the op surface). Decide: keep route as service-direct + read it through plain `fetch` from the RSC (lighter touch), OR wrap it in a new `listConversationsOp` and use apiServerFetch (consistent with the rest of the migration). **Recommend** the op route, because the migration's goal is uniformity.
- `apps/web/src/app/(app)/messages/[id]/page.tsx` — same pattern for the thread view; the route `GET /api/v1/messages/conversations/[id]/messages` also exists as service-direct.
- Client Components at `apps/web/src/features/messages/components/{new-conversation-form,thread}.tsx` already call `/api/v1/*` directly via raw `fetch` — switch them to `apiClient.post` for consistency.

**Conditional-GET caveat:** the existing service-direct routes implement `If-Modified-Since` short-circuit (304). The op adapter doesn't emit 304 today — switching to op-backed routes would lose that optimization. Decision: **keep the existing service-direct routes for the conditional reads**, and use plain same-origin `fetch` from the RSC with cookie forwarding (matches what `apiServerFetch` does internally). This preserves the 304 path and still honors "web and mobile both hit the same routes."

### T15 — Delete `app/dev/messages` + `app/dev/notifications` directories

**Files:**
- `apps/web/src/app/dev/messages/page.tsx` + `_seed-action.ts` — **delete both**.
- `apps/web/src/app/dev/notifications/page.tsx` + `_seed-action.ts` — **delete both**.
- After deletion: run `rm -rf apps/web/.next` (per ADR 0008) before the next typecheck.

Verify `apps/web/src/app/dev/{emails,states}/` don't reference the deleted paths.

### T16 — Delete `runFromAction` from `packages/api`

**Files:**
- `packages/api/src/operation.ts` — remove `runFromAction`, `setActionHeadersResolver`, `loadActionHeaders`, `actionHeadersResolver`, the dynamic `next/headers` import. Drop the `runFromAction` field from the `Operation<I, O>` interface.
- `packages/api/src/server.ts` — drop the `setActionHeadersResolver` re-export.
- `packages/api/src/__tests__/operation.test.ts` — delete the `describe("defineOperation.runFromAction", …)` block (~3-4 cases starting around line 261).
- `packages/api/src/__tests__/server-fetch.test.ts` — remove the `runFromAction: vi.fn(...)` stub from `makeOp()` once the interface field is gone.

This is the structural enforcement of the CLAUDE.md "one REST API" rule. Once `runFromAction` is deleted, future contributors can't reintroduce the Server Action bypass through the operation adapter — the type system catches it. `pnpm typecheck` is the post-edit verification: any forgotten caller becomes a build failure.

### T17 — Lefthook check rejecting `"use server"`

**Files:**
- `lefthook.yml` — add a pre-commit hook that greps staged files for `"use server"` under `apps/web/src/{features,server,app}` and fails the commit with an explanatory message linking CLAUDE.md.
- Optional: `tooling/scripts/check-no-server-actions.sh` if the inline yml gets long.

Belt-and-braces second line behind the type-system enforcement (T16). Catches a contributor who writes a direct-DB Server Action without going through `runFromAction` (the type-system gate misses that case).

Verify: create a throwaway `apps/web/src/features/_lint-test.tsx` with `"use server"`, attempt commit, watch reject, revert.

### T18 — Docs

**Files:**
- `docs/decisions/0009-stripe-webhook-carve-out.md` (NEW) — single-paragraph ADR documenting why `/api/stripe/webhook` is exempt from the `/api/v1/*` versioning rule (Stripe owns the URL contract; the route handler still complies with the service-layer rule by being the sole importer of `@aira/services` in that path).
- `CLAUDE.md` — link the new ADR + the `apiServerFetch` pattern from the "API surface" bullet.
- `docs/api-versioning.md` — extend with notifications routes + a Stripe carve-out paragraph (the table extension may already have happened during T13).
- `docs/decisions/0007-service-layer.md` — append a section on `apiServerFetch` as the supported RSC alternative.

## Critical files already reviewed in this session

These don't need re-exploration; their shapes are already in conversation context:

- `apps/mobile/features/notifications/api.ts` — speculative client of the 404'd endpoint.
- `packages/services/src/notifications/{index.ts,service.ts}` — internal `NotificationRow` with Date fields.
- `packages/db/src/types.ts` — canonical `NotificationBody` discriminated union.
- `apps/web/src/features/notifications/components/{notification-list,notification-item}.tsx` — current consumers.
- `apps/web/src/app/(app)/notifications/page.tsx` — current direct service caller.
- `apps/web/src/features/notifications/server-actions.ts` — Server Action delete target.
- `apps/web/src/server/operations/notifications.ts` — host for the new `listInboxOp`.

## Recovery / first action when execution resumes

1. **Decide on the uncommitted `packages/validators/src/notifications.ts`** — keep (it's the right T13 starter content) or `git restore --staged --worktree packages/validators/src/notifications.ts` (and rewrite from scratch during T13). **Recommendation: keep.**
2. Re-invoke `/mlabs-code` against the same review. The skill detects `.mstack/code/2026-06-07-rest-api-migration/tasks.md` and resumes at T13.
3. Continue through T13 → T14 → T15 → T16 → T17 → T18.

## Verification per task (acceptance signal)

| Task | Acceptance |
|------|------------|
| T13 | `curl http://localhost:5000/api/v1/notifications` (with cookie) returns 200 JSON; bell + inbox + per-row mark-read all still work; `grep "use server" apps/web/src/features/notifications` empty. |
| T14 | `/messages` + thread pages render identically; new-conversation form posts; 304 short-circuit still fires on second visit. |
| T15 | `pnpm dev` still boots; nothing under `apps/web/src/app/` imports the deleted paths. |
| T16 | `grep -rn "runFromAction" packages apps` returns empty; `pnpm typecheck` clean; `pnpm --filter @aira/api test` count drops by ~3 (the deleted block). |
| T17 | Throwaway `apps/web/src/features/_lint.tsx` with `"use server"` fails pre-commit; deletion allows commit. |
| T18 | Cross-links resolve; route table in api-versioning.md is current. |

## Out of scope

- Anything from the review's deferred follow-ups (audit-log retention cron, integration-test infra, S3 listings features).
- Changing Better Auth, Drizzle, Tailwind picks (CLAUDE.md hard rule).
- Touching `/api/auth/*` or `/api/storage/*` (versioning-exempt by design).
- Pre-emptive mobile screens for the new businesses/categories routes (deferred to S3 mobile work).

## Estimated effort

T13 is medium (1 new validator file, 1 op, 2 routes, 2 component edits, 1 mobile file, 1 delete, 1 docs edit). T14 is small. T15–T18 are small. Together: ~6 atomic commits, ~30–60 minutes of execution.
