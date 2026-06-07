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
| `pnpm --filter @aira/mobile start` | Mobile dev (Expo) |
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
  you need the brand in code, import from `@aira/config`.
- **Design tokens.** Light + dark colors live in OKLCH in
  `packages/config/src/design.ts` and are mirrored in
  `apps/web/src/app/globals.css`. After editing tokens, run `pnpm gen:mobile-tw`.
- **Env validation.** Boot-time validation lives in `apps/web/src/config/env.ts`.
  The app refuses to start if a required variable is missing. Document every new
  env var in `.env.example`.
- **API surface.** All HTTP endpoints live under `/api/v1/*` and are versioned.
  See [docs/api-versioning.md](./docs/api-versioning.md) before adding a route.
  One exception: the Stripe webhook lives at `/api/stripe/webhook` because
  Stripe pins the URL inside the vendor dashboard — see
  [ADR 0009](./docs/decisions/0009-stripe-webhook-carve-out.md).
- **One REST API for both clients.** This is a monorepo with `apps/web` AND
  `apps/mobile`. Every feature must be reachable over `/api/v1/*` so the Expo
  app can use the same contract as the Next.js app. Build the REST endpoint
  first; the web UI consumes it via the typed fetch client in `@aira/api` just
  like mobile does. **Do not fetch data directly in Server Components, and do
  not write Server Actions that import `packages/services` to bypass the HTTP
  boundary** — that would split web and mobile onto two parallel code paths and
  defeat the point of the shared validators / `defineOperation` plumbing.
  Server Components stay RSC; they consume the same ops via
  `apiServerFetch(op, init?)` from `@aira/api/server` — an in-process invoker
  that runs through the same auth, freshness, and Zod pipeline as the HTTP
  path, without paying for a same-origin round-trip. Client Components mutate
  via the `apiClient` singleton at `apps/web/src/lib/api-client.ts`. See
  [ADR 0007](./docs/decisions/0007-service-layer.md) for the full pattern.
- **Service layer.** Business logic goes in `packages/services` as pure
  functions. Only `/api/v1/*` route handlers import them — they're the thin
  adapters that turn HTTP requests into service calls. The lefthook
  `check-no-server-actions` gate rejects new `"use server"` directives under
  `apps/web/src/{features,server,app}`; the type system rejects any code
  reaching for the deleted `defineOperation.runFromAction`. See
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

## Replit session bootstrap

This workspace runs on Replit, where `~/.claude/` may be wiped between
sessions. The persistent memory directory is symlinked into the repo at
`.claude/memory/` so memories survive restarts. At the start of every Replit
session, before writing any memory, verify the symlink and recreate it if
missing:

```bash
[ -L /home/runner/.claude/projects/-home-runner-workspace/memory ] \
  || bash .claude/scripts/setup-memory.sh
```

The script is idempotent and migrates any pre-existing memories at the
default location into the repo before linking.

## Pushing to GitHub from Replit

Two known gotchas — deeper notes in `.claude/memory/`:

- **Credential precedence.** `gh auth login` alone isn't enough.
  `replit-git-askpass` (wired via `GIT_ASKPASS`) silently overrides the gh
  token and authenticates as the workspace-level GitHub integration account,
  so pushes to private repos return `Repository not found` even when
  `gh auth status` looks right. Run `gh auth setup-git`. If pushes start
  failing again mid-session (Replit periodically rewrites its managed
  `/run/replit/user/<uid>/.config/git/config`), pin the helper in **repo-local**
  `.git/config` instead — Replit can't reach it there. See
  [.claude/memory/replit-gh-push-auth.md](./.claude/memory/replit-gh-push-auth.md).
- **Truncated history without `.git/shallow`.** A Replit workspace's `.git` can
  end up with commits referencing parent objects that don't exist locally and
  without a `.git/shallow` marker. The first push to a fresh GitHub repo then
  fails with `remote: fatal: did not receive expected object <sha>`. Shallow
  markers aren't honored by GitHub's receive-pack; fix is rewriting with
  `git replace --graft <earliest-commit>` + `git filter-branch -- --all`. See
  [.claude/memory/replit-truncated-history.md](./.claude/memory/replit-truncated-history.md).

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
- Don't import `packages/services` (or any business-logic module) directly into
  `apps/web` Server Components, client components, or Server Actions. Go
  through `/api/v1/*` via the `@aira/api` fetch client (Client Components) or
  `apiServerFetch` (RSCs) so web and mobile share one contract. The only
  consumers of `packages/services` are the route handlers under
  `apps/web/src/app/api/v1/` and the documented Stripe webhook at
  `apps/web/src/app/api/stripe/webhook/route.ts`.
- Don't commit `.env.local` or any file matching `.env*` except `.env.example`.
- Don't rename a workspace package — use `pnpm rename` so every reference moves
  together.
