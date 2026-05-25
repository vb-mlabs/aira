# Forking the MLabs template

How to take this template and ship a real client project. Three tiers of
change, scoped to risk. Read this BEFORE you start cloning files around.

## Before you start

1. Clone the repo into a new directory.
2. `pnpm install` (pnpm 10+, not npm or yarn — see `.npmrc` and `package.json#packageManager`).
3. When Phase 10 lands: `pnpm rename` swaps `@mlabs/*` package names → `@<client>/*`,
   updates imports, and writes a `.fork-config.json` record for idempotency.
   For now (pre-Phase-10), use the manual rename map at the bottom of this guide.
4. Work through `FORK_CHECKLIST.md.template` for the manual setup steps
   (bundle IDs, Postmark sender, OAuth apps, EAS project).
5. Use `HANDOVER.md.template` as the client-handover document.

For "why is the codebase laid out like this," see:
- [docs/decisions/0006-monorepo.md](decisions/0006-monorepo.md) — monorepo + pnpm + Turborepo
- [docs/decisions/0007-service-layer.md](decisions/0007-service-layer.md) — service + defineOperation pattern

---

## Tier 1 — Safe to override

Per-fork concerns. Edit freely; no review needed.

- **`apps/web/src/app/*`** — pages, layouts, copy, marketing surfaces, the
  whole product surface
- **`packages/ui-web/src/components/*`** — component styling (variant classes,
  spacing). Don't change the component's exported props/contract without
  considering downstream call sites in `apps/web`
- **`packages/config/src/design.ts`** — token values (colors, typography,
  spacing). After editing, run `pnpm gen:mobile-tw` to regenerate
  `apps/mobile/tailwind.config.js`. The pre-commit `check-contrast` hook
  enforces WCAG AA — fix any failures before committing
- **`apps/mobile/components/ui/*`** — mobile primitive styling (NativeWind
  classNames). Same caveat as ui-web: don't change exported contracts
- **`packages/email/src/templates/*`** — Postmark template wording, layout,
  CTA copy. The URL-builder helpers are Tier 2 (extend)
- **`README.md`, `LICENSE`, brand strings** — anything referring to MLabs
  becomes the client's name. The `no-brand-string-literal` ESLint rule
  enforces that all brand-name references go through `@mlabs/config`'s
  brand singleton instead of being hardcoded
- **`.env`, `.env.local`** — never committed (gitignored). Per-environment
- **`public/.well-known/apple-app-site-association`,
  `public/.well-known/assetlinks.json`** — replace the `{{...}}`
  placeholders with the client's real Apple Team ID, iOS bundle ID,
  Android package, and SHA-256 fingerprint. See HANDOVER.md.template §2.

## Tier 2 — Extend, don't replace

Add to these; don't rewrite existing logic.

- **`packages/services/*`** — add new service domains alongside the
  existing notifications/messages/audit/users. Each service is a pure
  function taking `(db | tx, ctx, args)`. Don't reach for a different
  pattern; the consistency is what makes the codebase scannable
- **`apps/web/src/app/api/v1/*`** — add new endpoints; existing endpoints
  evolve **additively only** per
  [docs/api-versioning.md](api-versioning.md). No field removals, no
  field renames within v1. Breaking changes mean a v2 with a deprecation
  window
- **`packages/db/src/schema/*`** — add tables and columns. Never drop a
  column without a versioning bump — mobile clients in the app store
  can't redeploy on your schedule. The Phase 8 advisory-lock policy is
  documented in `packages/db/scripts/migrate.ts`
- **`@mlabs/validators`** — add new schemas. Existing exports
  (`SignUpSchema`, `LoginSchema`, `ApiErrorResponse`, etc.) are PUBLIC
  API for both web and mobile. Renaming them breaks mobile builds in
  the field
- **`.syncpackrc.json` version groups** — add new carve-outs as
  packages diverge for legitimate reasons (Tailwind major version splits,
  React patch drift, etc.). Keep existing carve-outs unless their reason
  no longer applies
- **`turbo.json` pipeline** — add new tasks as needed. Changing
  `dependsOn` graphs or flipping `cache: false`/`true` on existing tasks
  is risky (CI can become slow or incorrect); review carefully

## Tier 3 — Do not touch without review

Load-bearing. Breaking these breaks every fork.

- **`packages/auth/*` core flow** — Better Auth config, bearer plugin,
  oAuthProxy setup, admin-bootstrap hook. The mobile JWT refresh flow,
  email verification, and admin enforcement are wired through here.
  Per-fork OAuth provider config goes in `apps/web` env, not the auth
  package
- **`packages/api/src/operation.ts`** — the `defineOperation` adapter.
  This is what makes routes 3 lines and Server Actions consistent. See
  [docs/decisions/0007-service-layer.md](decisions/0007-service-layer.md)
- **`packages/api/src/context.ts`** — the `CallerContext` type shape.
  Both web (Server Actions + /api/v1) and mobile (via bearer JWT)
  construct this. Adding fields is OK if all builders update; removing
  or renaming breaks the contract
- **`.github/workflows/ci.yml` bundle-scan step** — this is the last line
  of defense against shipping `DATABASE_URL`, `BETTER_AUTH_SECRET`, or
  Postmark tokens to the mobile bundle. Don't disable; don't narrow the
  grep without understanding what's catching what
- **`packages/db/scripts/migrate.ts` advisory lock** — prevents
  concurrent deploys from racing migrations. The lock key is a constant;
  changing it makes pre-deploy and post-deploy instances treat each
  other as separate locks
- **`server-only` imports** in any server package — these are the
  build-time barrier that stops mobile from accidentally importing
  server code. Don't comment them out to "make the build work"
- **`.npmrc` hoist exclusions** — required for Metro + pnpm. Removing
  these breaks `expo start` with "Unable to resolve module" errors.
  See [docs/decisions/0006-monorepo.md](decisions/0006-monorepo.md)
- **Service function signatures** — `(db | tx, ctx, args)`. Don't
  change the position or shape; every operation and every service is
  consistent and tooling (audit logging, transaction threading) relies
  on it

## Anti-patterns to avoid

- **Reading `process.env` directly** — use `@mlabs/config`'s validated
  env singleton. The `no-restricted-syntax` ESLint rule catches raw
  reads outside the env file itself
- **Importing `@mlabs/db`, `@mlabs/services`, `@mlabs/auth/server`,
  `@mlabs/email` from mobile** — three layers of defense catch this:
  package.json deps, ESLint `no-restricted-imports`, and the CI
  bundle-scan. Don't try to work around any of them
- **Adding `'use server'` to a `packages/*` file** — Next.js's compiler
  only picks the directive up in `apps/web`. Doing it in a package
  produces a silent no-op that's hard to debug
- **Manually editing `apps/mobile/tailwind.config.js`** — it's generated
  by `pnpm gen:mobile-tw` from `packages/config/src/design.ts`. The
  `check-mobile-tailwind` lefthook hook detects drift; manual edits
  get overwritten on the next regenerate
- **Skipping lefthook pre-commit hooks (`--no-verify`)** — they're the
  only guard against migration-drift, contrast regressions, and
  mobile-Tailwind staleness. If a hook is wrong, fix the hook; don't
  bypass it

## What `pnpm rename` actually rewrites

Reference for understanding (and debugging) what the rename script
substitutes. The script anchors every match in a unique context so
collisions with unrelated prose are impossible.

| Find | Replace with | Where |
|------|--------------|-------|
| `@mlabs/<pkg>` (+ subpaths) | `@<namespace>/<pkg>` | All `package.json`, all source imports, path aliases |
| `"mlabs-template"` | `"<slug>-template"` | Root `package.json`'s `name` field |
| `MLabs Template` (phrase) | display name | `app.config.ts` `name`, README heading, DESIGN.md, photo permission strings — replaced as a single phrase so no "Template" word lingers |
| `mlabs-mobile` | `<slug>-mobile` | `apps/mobile/app.config.ts` `slug`, `packages/auth/src/jwt.ts` `ISSUER`, Maestro IDs, CHANGELOG mentions |
| `scheme: "mlabs"`, `mlabs://`, `mlabs.example.com` | client scheme + deep-link host | Mobile deep-link config + Maestro YAMLs |
| Bare `MLabs` (capital, word-bounded) | **stays** | Agency attribution preserved in HANDOVER.md.template, DESIGN.md, AGENTS.md, `.replit`, `tooling/eslint-config/**` |
| Bare lowercase `mlabs` outside anchored contexts | **stays** | Same reason — preserved as code-level identifier in comments + docs |
| Bundle IDs (`com.example.mlabs`) | **stays** | Manual per `FORK_CHECKLIST.md` — they need real Apple/Google reverse-domains |
| `.well-known/*` files | **stays** | Manual — need real Apple Team ID + Android SHA-256 |

The rest (bundle IDs, AASA appID, assetlinks SHA, OAuth callbacks,
Postmark sender signatures, EAS project ID, Neon DB branch) lives in
`HANDOVER.md.template` because it cannot be automated safely.

## Where to learn more

- [docs/decisions/0006-monorepo.md](decisions/0006-monorepo.md) — monorepo + pnpm + Turborepo decision
- [docs/decisions/0007-service-layer.md](decisions/0007-service-layer.md) — service layer + defineOperation
- [docs/api-versioning.md](api-versioning.md) — `/api/v1/*` evolution policy
- [docs/generated-artifacts.md](generated-artifacts.md) — what's generated and when to regenerate
- [HANDOVER.md.template](../HANDOVER.md.template) — per-client handover checklist
- [docs/decisions/](decisions/) — the full ADR list (start at 0006 for migration context)
