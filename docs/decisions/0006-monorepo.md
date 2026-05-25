# 0006 — Monorepo migration (Phase 6 — chore/monorepo-migration)

**Status:** accepted
**Date:** 2026-05-12
**Replaces:** N/A
**Supersedes:** the implicit "single package.json with co-located src/ and mobile/" structure from W1–Phase 5.5
**Related:** docs/decisions/0007-service-layer.md, docs/api-versioning.md, docs/forking-guide.md

## Context

The pre-monorepo template was a single-package repo with `src/` (Next.js web)
and `mobile/` (Expo) sitting side-by-side at the root. Each had its own
`package.json`, but mobile imported shared types from `src/lib/schemas/` via
a hand-synced **mirror** in `mobile/lib/schemas/` because Metro couldn't
reach across the boundary.

The template gets forked per client. Each fork accrues client-specific
divergence over time. The mirror pattern made schema changes brittle: any
edit had to be applied in two places, with no compiler help catching drift.
Drift between web validation and mobile validation produced silent UX bugs
(wrong inline error messages, password lengths accepted by client but
rejected by server, etc.).

Phase 5.5 of the prior cycle accelerated this — the mobile app reached
feature parity with web on shared concerns (auth payloads, error envelopes,
notification badges, message inbox). The mirror file count was going to keep
growing. Time to fix the structure before the next round of features.

## Decision

Restructure to a `pnpm` workspace + Turborepo monorepo:

```
apps/
  web/                Next.js 16, /api/v1/*, Server Actions, UI
  mobile/             Expo 55, NativeWind, expo-router

packages/
  validators/         Pure-Zod schemas (shared web + mobile)
  db/                 Drizzle schema + migrations + advisory-lock migrate script
  email/              Postmark templates + URL builders
  auth/               Better Auth + bearer + oAuthProxy + admin bootstrap
  config/             Design tokens + tailwind preset + brand + env factory
  api/                defineOperation adapter + ApiError + typed fetch client + CallerContext
  services/           Business logic (pure functions)
  ui-web/             shadcn primitives — web-only

tooling/
  tsconfig/           Shared TS configs (base, library, next, expo)
  eslint-config/      Shared ESLint configs + the 3 custom MLabs rules
  prettier-config/    Shared Prettier config
  tailwind-config/    Shared Tailwind preset (peer accepts Tailwind 3 and 4)
```

Naming: every workspace package uses `@mlabs/*`. Phase 10's
`scripts/rename.ts` will swap to `@<client>/*` on fork.

Package manager: `pnpm@10` (specified in `package.json#packageManager`).
Lockfile: `pnpm-lock.yaml`.

Task runner: Turborepo. Local cache only — no Vercel Remote Cache.

Workspace structure split:
- Apps consume packages via `workspace:*` deps.
- Packages depend on each other through their `exports` map; the
  server/client split (e.g. `@mlabs/auth/server` vs `@mlabs/auth/client`)
  is enforced via `exports` paths and `server-only` imports.

UI split (asymmetric): `packages/ui-web` extracted (shadcn primitives,
copied via shadcn CLI). Mobile primitives **stay** in
`apps/mobile/components/ui/` — no `packages/ui-mobile`.

## Alternatives considered (and rejected)

**tRPC over REST + Zod.** Tempting — end-to-end types are nice. Rejected
because mobile clients are deployed via the App Store / Play Store and
can't redeploy on the web's schedule. REST + Zod gives portability (a v2
client in any language, a partner integration without TypeScript) at the
cost of one extra schema-import statement per endpoint. The Phase 4
`defineOperation` adapter recovers most of the tRPC ergonomics for the
web Server Actions surface (see [0007-service-layer.md](0007-service-layer.md)).

**Vercel Remote Cache.** Would speed up CI, but adds a vendor service
and a token to manage per fork. User constraint: no new services for
this migration. Local cache (Turbo's default) is fine for a single-app
template; forks can opt in to Remote Cache later if they hit CI bottlenecks.

**Symmetric `packages/ui-mobile`.** Considered for shape consistency
with `packages/ui-web`. Rejected because there's no realistic second
consumer for mobile primitives (clients ship a single Expo app per
project, not two), and the NativeWind monorepo config tax (custom
metro.config.js for shared package resolution + NativeWind's content
globs needing relative paths to a packages dir) wasn't worth paying for
a benefit nobody would use.

**Co-located mobile/ within the single-package repo.** The starting
point. Rejected because every Expo upgrade fought Metro's resolver, and
the schema-dedup problem forced the split regardless.

**Nx, Bazel, Rush.** All considered briefly. pnpm + Turborepo is the
2026 sweet spot for a JS-only mid-sized monorepo: minimal config, no
custom build language, fast cold installs, good defaults. Nx is fine
but heavier than needed.

## Consequences

### Positive

- **Single source of truth for schemas** — `@mlabs/validators` exports
  `SignUpSchema`, `LoginSchema`, `ApiErrorResponse`, etc. Web and mobile
  both consume them; drift impossible.
- **Independent typecheck/lint/test per package** — Turbo's pipeline
  runs each `pnpm test` only in changed packages on CI.
- **Path is clear for a second web app per client** — admin panel,
  partner portal, marketing site can each consume `packages/*` without
  touching `apps/web`.
- **syncpack and bundle-scan enforce boundaries** — version drift caught
  at install time; server-code-in-mobile caught at build time.
- **Tooling reuse** — every package extends `@mlabs/tsconfig`, every
  app uses `@mlabs/eslint-config` and `@mlabs/prettier-config`. Bumping
  TypeScript, ESLint, or Tailwind is a single PR.

### Negative / load-bearing constraints

- **`.npmrc` hoist exclusions** required for Metro + pnpm. Without
  `public-hoist-pattern[]=!react` etc., Metro's resolver picks the
  wrong React types and JSX components fail with TS2786. Tier 3
  do-not-touch.
- **`react-native-worklets` must be an explicit dep in `apps/mobile`** —
  it's a transitive of NativeWind that npm flat-resolved silently;
  pnpm doesn't. Without it, `expo start` fails on a Babel plugin
  lookup.
- **Metro monorepo config** (`watchFolders` + `nodeModulesPaths` +
  `disableHierarchicalLookup`) is required for Metro to find workspace
  packages. Lives in `apps/mobile/metro.config.js`.
- **Concurrent dev: `expo start` + `next build` from the same node_modules**
  is fine but `pnpm install --frozen-lockfile` in CI must run before
  either; the workspace symlinks are the contract.
- **Slower cold install on first clone** — 1100+ packages installed
  per app. Subsequent installs use pnpm's content-addressable store
  and are fast.

### Open

- **Expo SDK 51 → 55 upgrade landed in Phase 8.** React 18→19 split is
  history; both web and mobile run React 19.2.x now (small patch drift
  carved out in `.syncpackrc.json`). The `.npmrc` hoist exclusions
  remain in place to keep mobile and web each owning their own copy of
  React types — the comment in `.npmrc` referencing "mobile React 18"
  is stale and a follow-up should re-anchor it to the patch-drift
  reason.
- **Push notifications (APNs/FCM)** — per-fork concern, deferred.
  Listed in TODOS.md.
- **Phase 10 rename script** — automates the safe `@mlabs/*` →
  `@<client>/*` replacement. Until it lands, forks rename manually
  per the map in `docs/forking-guide.md`.
