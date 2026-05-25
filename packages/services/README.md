# @mlabs/services

Domain-grouped business logic. The single rule: **every entry point takes
`(db, ctx, args)`**.

## The service contract

```ts
async function name(
  db: Database | Transaction,
  ctx: CallerContext,
  args: Args,
): Promise<Output>
```

- **`db`** — Drizzle handle. Accepts the base instance OR a transaction so a
  composing service can pass its own `tx` down (`messages.send(tx, ctx, ...)`
  → `audit.log(tx, ctx, ...)`).
- **`ctx`** — `CallerContext` from `@mlabs/api`. Carries `userId`, `user`,
  `requestId`, `source`. Built once per request by `defineOperation`.
- **`args`** — Domain-typed input. The operation adapter validates against a
  Zod schema before the service ever runs, so the service can trust the
  shape.

## Authorization lives in the service

Don't gate at the route. The service knows the row-level rules — apply them
where the data lives. Read-side: scope by `ctx.userId`. Write-side: predicate
on `(id, user_id)` so a bogus or someone-else's id silently no-ops instead of
leaking existence via 403 vs 404.

## Cross-domain calls

Reach for the **public** index of the other domain:

```ts
// ✅ allowed
import { audit } from "@mlabs/services/audit"

// ❌ blocked by ESLint no-restricted-imports
import { auditService } from "@mlabs/services/audit/service"
```

The `no-restricted-imports` rule in `@mlabs/eslint-config/library` enforces
this. Cross-domain imports go through `index.ts` so the public surface stays
explicit.

## Domains

| Domain | Status |
|--------|--------|
| `notifications` | landed (Phase 4 commit 2) |
| `messages` | pending (Phase 4 expansion) |
| `audit` | pending |
| `users` | pending |

## Testing

Services take `db` as a parameter — pass a small mock object that captures
the chained Drizzle calls. No `vi.mock()`, no module hacking. See
`src/notifications/__tests__/service.test.ts` for the pattern.
