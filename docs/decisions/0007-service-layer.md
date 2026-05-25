# 0007 — Service layer + defineOperation (Phase 4)

**Status:** accepted
**Date:** 2026-05-12
**Replaces:** N/A
**Supersedes:** the implicit "API route owns business logic" pattern from W1–Phase 5.5
**Related:** docs/decisions/0006-monorepo.md, docs/api-versioning.md

## Context

The template has **two server-side surfaces** that consume business logic:

1. `/api/v1/*` route handlers — consumed by mobile (via the typed
   `@mlabs/api` fetch client) and by future admin/web/partner clients.
2. Server Actions — consumed by `apps/web` UI for in-page mutations.

Both surfaces share the same cross-cutting concerns: session auth checks,
input Zod parsing, output Zod validation (the wire contract), audit log
emission, error → `ApiErrorResponse` mapping, and transaction lifecycle
when an operation spans multiple writes.

Codex's outside-voice plan review (during `/plan-eng-review` on
2026-05-12) flagged that **"shared services" alone don't solve this** —
services hold the *business logic*, but the *boundary logic* (auth,
validation, audit, errors) is duplicated between every route handler
and every Server Action that wraps the service. Without an adapter, the
two surfaces drift: a service grows a new error path; the route handles
it but the matching Server Action doesn't; a user sees a generic error
on one surface and a precise one on the other.

The decision: introduce a service layer **and** a boundary adapter.

## Decision

### `packages/services`

Pure-function business logic, one domain per directory:

```
packages/services/src/
  notifications/
  messages/
  audit/
  users/
```

Service function signature:

```ts
(db: Database | Transaction, ctx: CallerContext, args: TArgs) => Promise<TOutput>
```

- `db` accepts a Drizzle `Database` OR a `Transaction` — composing
  services pass `tx` down so a nested call participates in the same
  transaction.
- `ctx: CallerContext` carries `{ session, userId, permissions,
  requestId, source: 'web' | 'mobile' | 'job' }`. Authorization checks
  live inside services, not in routes.
- `args: TArgs` — Zod-parsed input. The service trusts it.

No framework imports inside services: no `next/server`, no `next/headers`,
no `fetch`. Services are TypeScript with Drizzle and Zod, nothing else.

### `packages/api/src/operation.ts` — `defineOperation` adapter

```ts
const op = defineOperation({
  name: "notifications.markAllRead",
  input: MarkAllReadInput,         // Zod schema
  output: MarkAllReadOutput,        // Zod schema
  permission: "user",
  handler: (db, ctx, input) => markAllRead(db, ctx, input),
});

// Route handler — 3 lines:
export const POST = op.runFromRequest;

// Server Action — 3 lines:
export async function markAllReadAction() {
  return op.runFromAction({});
}
```

`defineOperation` does in one place what was previously duplicated:

- Build `CallerContext` from the request (cookies → session via Better
  Auth) OR from the Server Action context (existing session lookup).
- Parse input via Zod; return `ApiError` on failure.
- Run the handler; catch thrown `ApiError`s and known service errors;
  map unknown errors to `ApiError.internal`.
- Validate output via Zod (cheap insurance — catches schema/handler
  drift in CI before it ships).
- Emit an audit log row tagged with `name`, `requestId`, `source`,
  `userId`, and outcome.

`runFromRequest(req: Request): Response` — for Next.js route handlers.
`runFromAction(input: TArgs): Promise<TOutput>` — for Server Actions
(throws `ApiError` instead of returning a Response).

### Transactions

Services accept `db | tx`. Composing services pass their `tx`:

```ts
async function deleteAccount(db: Database | Transaction, ctx: CallerContext) {
  await db.transaction(async (tx) => {
    await deleteUserNotifications(tx, ctx);  // same tx
    await deleteUserMessages(tx, ctx);       // same tx
    await deleteUser(tx, ctx);               // same tx
  });
}
```

Rule: a service that calls another service **must** pass its `db | tx`
parameter down. Don't capture `db` from module scope.

## Alternatives considered (and rejected)

**Handlers inside `packages/api`.** First instinct from t3-turbo's tRPC
shape. Rejected because Server Actions become awkward — they'd have to
construct a fake `Request` to invoke a handler, or duplicate the
handler logic. The split (services hold logic, api adapter handles
boundary) is cleaner.

**Types-only `packages/api`** (just the `ApiError`, the fetch client,
and the typed exports — no adapter). Rejected because it would force
every route and every Server Action to hand-roll the same boundary
sequence. Five routes in, the duplication would start to drift; ten in,
the drift would be observable in production behavior.

**tRPC.** Covered by [0006-monorepo.md](0006-monorepo.md). Short
version: mobile in the app store can't redeploy on the web's schedule;
REST + Zod gives wire-format portability.

**A class-based service pattern** (services as classes, `ctx` on a
constructor). Rejected because it gives nothing pure functions don't,
and makes transaction threading awkward (`this.tx` vs `this.db` mode
flag etc.). Functions are simpler.

## What's wired through it today (post-Phase 5)

- 10 routes via `runFromRequest`:
  - `POST /api/v1/notifications/mark-all-read`
  - `GET  /api/v1/messages/conversations` (service-direct read; 304
    short-circuit kept simple)
  - `POST /api/v1/messages/conversations` (`openOrCreate1to1Op`)
  - `GET  /api/v1/messages/conversations/[id]/messages`
  - `POST /api/v1/messages/conversations/[id]/messages` (`sendMessageOp`)
  - `POST /api/v1/messages/conversations/[id]/read`
  - `PATCH  /api/v1/profile` (`updateNameOp`)
  - `DELETE /api/v1/profile` (`deleteAccountOp` + storage cleanup)
  - `POST /api/v1/profile/password` (`changePasswordOp`)
  - `GET  /api/v1/notifications/unread-count` (service-direct; 304
    short-circuit takes precedence over op overhead)

- 2 Server Actions via `runFromAction`:
  - `markRead(id)` — `markReadOp.runFromAction({ id })`
  - `markAllRead()` — `markAllReadOp.runFromAction({})`

- Phase 8 added admin Server Actions through `runFromAction`.

- Unversioned by design (see [api-versioning.md](../api-versioning.md)):
  `/api/auth/[...all]`, `/api/auth/refresh`, `/api/storage/[...key]`.

## Consequences

### Positive

- **Routes are 3 lines.** Every `/api/v1/*/route.ts` is
  `export const POST = someOp.runFromRequest`. No business logic at the
  route layer.
- **Server Actions are 3 lines.** Same shape; same boundary code.
- **New surfaces reuse services + operations.** Adding an admin panel,
  a partner API, or a CLI: build a thin invocation layer and call
  `op.runFromX(...)`. No duplication.
- **Audit logging happens once, in the adapter.** Every operation
  invocation gets a row; the service code stays clean.
- **Output validation catches drift in CI.** If a handler returns a
  shape the output schema doesn't match, the contract test fails
  before merge.
- **Transaction threading is honest.** The `db | tx` signature forces
  every service author to think about whether their function is
  composable. No accidental "outside the transaction" writes.

### Negative

- **Services must stay framework-agnostic.** No `NextResponse`, no
  `cookies()`, no `headers()`. A new contributor instinctively reaches
  for these; reviewers must catch it.
- **`defineOperation`'s TypeScript inference is non-trivial.** It
  threads `TArgs` → `TOutput` through the Zod schemas. Refactors here
  are higher-risk — change the adapter signature and every operation
  call site lights up.
- **CallerContext must be built per-request.** Small overhead per call
  (one session lookup), but it's the same lookup the route would have
  done anyway.

### Load-bearing

- **`packages/api/src/operation.ts`** — Tier 3 in the
  [forking-guide](../forking-guide.md). Don't touch without review.
- **`CallerContext` type shape** — mobile and web both build it; field
  removals or renames break the contract.
- **Service function signature** `(db | tx, ctx, args)` — every
  service is consistent; every operation expects this shape. Drift
  here propagates through dozens of call sites.
