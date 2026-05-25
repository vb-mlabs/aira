# CLAUDE.md

Project memory for Claude Code. Auto-loaded every session in this repo.

## What this repo is

The **MLabs MVP template** — a pnpm + Turborepo monorepo that every new Million
Labs project forks from. Ships a working Next.js web app, an Expo mobile app,
and shared packages (db, auth, email, validators, services, ui-web, config).

Forkers rename the scope with `pnpm rename`, then iterate. See
[FORK_CHECKLIST.md.template](./FORK_CHECKLIST.md.template) and
[docs/forking-guide.md](./docs/forking-guide.md).

## Workspace layout

```
apps/web        Next.js 16 (App Router) + Server Actions + /api/v1/*
apps/mobile     Expo 55 + expo-router + NativeWind
packages/
  validators   Pure-Zod schemas (shared web + mobile)
  db           Drizzle + advisory-lock migrate script
  email        Postmark templates + URL builders
  auth         Better Auth + bearer + oAuthProxy
  config       Design tokens, brand, tailwind preset, env factory
  api          defineOperation + ApiError + typed fetch client
  services     Business logic (pure functions)
  ui-web       shadcn primitives (web only)
tooling/        Shared tsconfig / eslint / prettier / tailwind config
```

## Commands you'll actually use

| Command | Purpose |
|---|---|
| `pnpm dev` | Web dev server (Next.js, port 3000) |
| `pnpm --filter @mlabs/mobile start` | Mobile dev (Expo) |
| `pnpm typecheck` | `tsc --noEmit` across all packages |
| `pnpm lint` | ESLint across all packages |
| `pnpm test` | Vitest across all packages |
| `pnpm build` | Production build (all apps via turbo) |
| `pnpm db:generate` | Generate SQL migrations from schema changes |
| `pnpm db:migrate` | Apply pending migrations (advisory-locked) |
| `pnpm db:studio` | Drizzle Studio (DB browser) |
| `pnpm gen:mobile-tw` | Regenerate `apps/mobile/tailwind.config.js` from `packages/config` |

Always prefer `pnpm <script>` over invoking tools directly so turbo
caching + workspace filters apply.

## Conventions

- **Brand string literal rule.** The literal name "MLabs" / brand display name
  may only appear in `packages/config/src/brand.ts` (plus templates, legal,
  docs, tests). Enforced by the `no-brand-string-literal` ESLint rule. When
  you need the brand in code, import from `@mlabs/config`.
- **Design tokens.** Light + dark colors live in OKLCH in
  `packages/config/src/design.ts` and are mirrored in
  `apps/web/src/app/globals.css`. After editing tokens, run `pnpm gen:mobile-tw`.
- **Env validation.** Boot-time validation lives in `apps/web/src/config/env.ts`.
  The app refuses to start if a required variable is missing. Document every new
  env var in `.env.example`.
- **API surface.** All HTTP endpoints live under `/api/v1/*` and are versioned.
  See [docs/api-versioning.md](./docs/api-versioning.md) before adding a route.
- **Service layer.** Business logic goes in `packages/services` as pure
  functions; routes/Server Actions are thin adapters. See
  [docs/decisions/0007-service-layer.md](./docs/decisions/0007-service-layer.md).
- **Migrations.** Generated via `pnpm db:generate`; applied with
  `pnpm db:migrate` (uses a Postgres advisory lock so parallel instances are
  safe). Never hand-edit a migration after it ships.
- **Lefthook.** Pre-commit hooks (lint-staged, typecheck) run via lefthook —
  installed automatically on `pnpm install`. Don't bypass with `--no-verify`
  unless explicitly asked.

## mstack workflow (skills under `.claude/skills/`)

This template ships an opinionated agent workflow. Prefer these over freelancing:

| Skill | When to use |
|---|---|
| `/mlabs-plan` | New feature — interactive consultation, writes `.mstack/plans/<slug>.md` |
| `/mlabs-review` | Critique a plan, lock decisions, produces approved review doc |
| `/mlabs-code` | Execute an approved review, atomic commit per task |
| `/mlabs-qa` | Scenario-driven Playwright QA + structured bug report |
| `/mlabs-debug` | Root-cause investigation for a specific failure |
| `/mlabs-mockup` | Generate static HTML design variants under `.mstack/mockups/` |
| `/mlabs-design-system` | Design system inspection / tweaks |
| `/mlabs-ux-audit` | UX review against the design system |
| `/mlabs-research` | Background research for planning |
| `/mlabs-auto` | End-to-end auto pipeline (plan → review → code) |

`.mstack/` is the workflow's working directory (plans, reviews, code ledgers,
QA reports). Treat its files as durable artifacts — don't delete without reason.

## When in doubt

- New feature → `/mlabs-plan`, not direct edits to `apps/` or `packages/`.
- Bug report → `/mlabs-debug` to root-cause, then plan/review/code if non-trivial.
- Design change → `/mlabs-mockup` first to explore visually before touching `src/`.
- Anything touching brand colors or copy → check `packages/config` is the source.

## Don't

- Don't add deps to the root `package.json` for app-specific use — they belong
  in `apps/web` or the relevant `packages/<x>`.
- Don't introduce a new ORM / auth lib / styling system. Drizzle, Better Auth,
  Tailwind are the picks. Bring proposals to a plan doc, not a PR.
- Don't commit `.env.local` or any file matching `.env*` except `.env.example`.
- Don't rename a workspace package — use `pnpm rename` so every reference moves
  together.
