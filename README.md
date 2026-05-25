# MLabs Template

The Million Labs MVP template. Fork this for every new project.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 ·
shadcn/ui · Drizzle · Neon · Better Auth · Postmark · Replit Object Storage
· Expo 55 · NativeWind · pnpm workspaces + Turborepo.

**New here?** Read [docs/forking-guide.md](./docs/forking-guide.md) first.

---

## Quick start

```bash
# 1. Install (pnpm 10+ required — see package.json#packageManager)
pnpm install

# 2. Copy env and fill in the blanks
cp .env.example .env.local
$EDITOR .env.local

# 3. Run web dev
pnpm dev
#    OR mobile dev:
pnpm --filter @mlabs/mobile start
```

Web: <http://localhost:3000>
Mobile: scan the Expo QR code (Expo Go) or press `i` / `a` for simulator.

## Layout

```text
apps/
  web/         Next.js 16 — /api/v1/* + Server Actions + UI
  mobile/      Expo 55 — React Native, NativeWind, expo-router

packages/
  validators/  Pure-Zod schemas (shared web + mobile)
  db/          Drizzle + migrations + advisory-lock migrate script
  email/       Postmark templates + URL builders
  auth/        Better Auth + bearer + oAuthProxy + admin bootstrap
  config/      Design tokens (+ tailwind preset, env factory)
  api/         defineOperation adapter + ApiError + typed fetch client + CallerContext
  services/    Business logic (pure functions)
  ui-web/      shadcn primitives — web only

tooling/
  tsconfig/, eslint-config/, prettier-config/, tailwind-config/
```

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Web dev (Next.js, port 3000) |
| `pnpm --filter @mlabs/mobile start` | Mobile dev (Expo) |
| `pnpm build` | Production build (all apps via turbo) |
| `pnpm typecheck` | `tsc --noEmit` across all packages (turbo) |
| `pnpm lint` | ESLint across all packages (turbo) |
| `pnpm test` | Vitest across all packages (turbo) |
| `pnpm db:generate` | Generate SQL migrations from schema changes |
| `pnpm db:migrate` | Apply pending migrations (advisory-locked) |
| `pnpm db:studio` | Drizzle Studio (DB browser) |
| `pnpm gen:mobile-tw` | Regenerate `apps/mobile/tailwind.config.js` from `packages/config` |
| `pnpm gen:mobile-tw:check` | Verify mobile Tailwind is in sync (CI gate) |
| `pnpm check-contrast` | WCAG AA check against design tokens |
| `pnpm verify:deeplinks` | Validate `.well-known` manifests against `$PROD_HOST` |

## Rebrand in 10 minutes

1. Edit `packages/config/src/brand.ts` — name, tagline, support email,
   legal entity, URL. (The `no-brand-string-literal` ESLint rule
   enforces that this file is the only place the literal brand name
   appears outside config/templates/legal/docs/tests dirs.) Both web
   and mobile import from `@mlabs/config`.
2. Edit `packages/config/src/design.ts` colors (OKLCH — light + dark),
   AND mirror them in `apps/web/src/app/globals.css`. Then run
   `pnpm gen:mobile-tw` to regenerate mobile's Tailwind config.
3. Swap `apps/web/public/favicon.ico`.
4. Swap `apps/web/public/og-default.png` (or rely on the `@vercel/og`
   route shipped in v1).

That's the whole rebrand. For deeper per-fork changes, read
[docs/forking-guide.md](./docs/forking-guide.md).

## Forking a new project

```bash
pnpm rename \
  --namespace @acme \
  --slug acme \
  --display-name "ACME App" \
  --deeplink-host app.acme.com
```

Rewrites every `@mlabs/<pkg>` package name, workspace dependency,
import statement, and path alias to your scope; replaces the
`"MLabs Template"` display-name phrase, `"mlabs"` slug + scheme,
deep-link host, and `"mlabs-mobile"` JWT issuer; writes
`.fork-config.json` for idempotent re-runs. Bare references to
"MLabs" in agency-attribution prose (HANDOVER, DESIGN, AGENTS,
`.replit`) stay intact by design. `.well-known/` placeholders
and bundle IDs stay manual on purpose — they need real Apple
Team IDs and Google Play SHA-256 fingerprints, which the script
can't guess.

After the rename:

```bash
rm pnpm-lock.yaml && pnpm install   # regenerate the lockfile under the new scope
pnpm gen:mobile-tw                  # regenerate apps/mobile/tailwind.config.js
# Open FORK_CHECKLIST.md for the rest of the manual steps.
```

The generated `FORK_CHECKLIST.md` walks bundle IDs, OAuth apps,
Postmark + Neon + EAS project setup, GitHub repo secrets, and the
first-boot smoke test.

Per-client handover (secret rotation, accounts, pre-launch gates) lives
in [HANDOVER.md.template](./HANDOVER.md.template).

## Working with Claude Code

Claude Code is installed as a workspace devDependency, so `pnpm install`
gives every fork a repo-local CLI — no global install needed (important on
Replit, where workspaces are self-contained VMs).

```bash
pnpm install          # installs Claude Code into node_modules/.bin
pnpm claude           # launches Claude Code at the repo root
```

### Authentication (pick one)

Order is: `CLAUDE_CODE_OAUTH_TOKEN` → `ANTHROPIC_API_KEY` → interactive login.

1. **Long-lived OAuth token (recommended for Replit + subscriptions).**
   On any machine where you're already logged in, run `claude setup-token`,
   then paste the result into Replit Secrets as `CLAUDE_CODE_OAUTH_TOKEN`.
   Valid ~1 year, bills against your Claude Pro/Max plan, zero login friction
   on every fork.
2. **API key.** Set `ANTHROPIC_API_KEY` in Replit Secrets. Pay-per-token.
3. **Interactive login.** Set nothing — `pnpm claude` opens a browser the
   first time and caches credentials in `~/.claude/.credentials.json` on the
   workspace VM.

See the Claude Code section of [.env.example](./.env.example) for the same
guidance inline.

### What ships with the template

- **[CLAUDE.md](./CLAUDE.md)** — project memory Claude auto-loads every session
  (layout, conventions, scripts, brand rule, mstack workflow).
- **[.claude/settings.json](./.claude/settings.json)** — permission allowlist
  for routine pnpm/turbo/git/gh-read commands so forkers aren't prompted for
  every benign action.
- **[.claude/skills/](./.claude/skills/)** — the mstack skill suite (committed).

### mstack slash commands

| Command | When to reach for it |
|---|---|
| `/mlabs-plan` | Plan a new feature (interactive, writes a plan doc) |
| `/mlabs-review` | Critique a plan and lock decisions before code |
| `/mlabs-code` | Execute an approved review, atomic commit per task |
| `/mlabs-qa` | Playwright-driven QA against a scenario + bug report |
| `/mlabs-debug` | Root-cause a specific failure |
| `/mlabs-mockup` | Generate static HTML design variants |
| `/mlabs-design-system` · `/mlabs-ux-audit` · `/mlabs-research` · `/mlabs-auto` | (see `.claude/skills/`) |

Full skill descriptions live in `.claude/skills/<name>/SKILL.md`.

## Learn more

- [docs/forking-guide.md](./docs/forking-guide.md) — three tiers of change (safe / extend / don't touch)
- [docs/template/TEMPLATE.md](./docs/template/TEMPLATE.md) — Replit import runbook + 29 lessons from the first fork (BetFrnd, 2026-05). Read before your first Replit `Publish`.
- [docs/api-versioning.md](./docs/api-versioning.md) — `/api/v1/*` evolution policy
- [docs/decisions/](./docs/decisions/) — architecture decisions (start at [0006](./docs/decisions/0006-monorepo.md), [0007](./docs/decisions/0007-service-layer.md), [0008](./docs/decisions/0008-codebase-conventions.md))
- [docs/generated-artifacts.md](./docs/generated-artifacts.md) — what's generated and when to regenerate
- [HANDOVER.md.template](./HANDOVER.md.template) — per-client handover
