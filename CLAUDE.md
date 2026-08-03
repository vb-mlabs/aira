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
- **Apex-only outbound URLs.** Every outbound URL — email templates,
  marketing copy, OAuth callbacks, share links — uses the apex
  `brand.url` (`https://airabynisarga.com`). Never `www.`. iOS Universal
  Links + Android App Links only verify against the apex (see
  `apps/mobile/app.config.ts` `associatedDomains` + the `.well-known`
  files under `apps/web/public/`), so a `www.` link silently misses the
  app-open intent and lands users in the browser. `apps/web/next.config.mjs`
  ships a 301 redirect from `www.airabynisarga.com/*` → apex that activates
  the moment DNS catches up; the apex-only rule is the belt that prevents
  drift in the meantime. Import `brand.url` from `@aira/config` — never
  hand-type the host.
- **Post on AIRA active-post cap.** Each user may hold up to
  `MAX_ACTIVE_POSTS_PER_USER` (currently **3**) active community posts
  at a time — active = `status IN ('pending','approved')`. Constant + the
  canonical reached-cap caption `POST_CAP_REACHED_CAPTION` live in
  `packages/validators/src/community.ts`. Enforced server-side only, in
  `packages/services/src/community/service.ts`'s `createPost`; the two
  clients call `getMyCommunityPostLimitsOp`
  (`GET /api/v1/community/posts/limits`) to render the proactive
  cap-reached state on the composer CTA. Bump the number in the
  constant when policy changes; grep will already be pointing here.

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

## Expo Go on Replit

Iterating on `apps/mobile` against a real phone runs through Expo Go (scan
the QR, app loads). Two non-obvious traps on Replit you need to know about:

**1. Always `EXPO_FORCE_WEBCONTAINER_ENV=1 expo start --tunnel`.** Not `expo
start` alone, not `--tunnel` alone, not `REACT_NATIVE_PACKAGER_HOSTNAME` /
`EXPO_PACKAGER_PROXY_URL` env vars pointing at `$REPLIT_DEV_DOMAIN` —
none of those make Metro reachable from a phone outside the LAN. Expo CLI
picks between two tunnel backends at runtime:

- **AsyncWsTunnel** — uses `@expo/ws-tunnel`, hosted by Expo at
  `*.boltexpo.dev`. Free, anonymous, zero config. Fires only when
  `envIsWebcontainer()` returns true.
- **AsyncNgrok** — uses ngrok. Anonymous tunnels were deprecated upstream,
  so it now requires an authtoken or it crashes with this exact error:
  `TypeError: Cannot read properties of undefined (reading 'body')` (Expo
  CLI mis-handles ngrok's `ERR_NGROK_4018` "auth required" response).

Replit isn't a webcontainer by default (`process.versions.webcontainer` is
unset). Without the env var, Expo CLI silently falls back to ngrok →
crash. The error message pointing at the ngrok status page is a red
herring — ngrok isn't down, the agent just isn't authenticated. Don't
set up an ngrok account; flip the env var.

**2. Do NOT pass `--port`.** `@expo/ws-tunnel` only supports Metro's
default 8081; `--port 8080` throws `WS_TUNNEL_PORT`. The
`[[ports]] externalPort = 8080` mapping in `.replit` is misleading — it
does NOT publish 8080 to the public internet, only to the workspace's
internal sandbox. Metro must go through the tunnel for a real phone to
reach it.

**Healthy startup signal.** Console line
`Waiting on http://<id>.boltexpo.dev` followed by the QR code. If you see
`boltexpo.dev`, ws-tunnel is connected. If you see
`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL` plus the ngrok-body error, the env
var got dropped — restore it in `.replit`'s `Expo Go (Tunnel)` workflow
and restart.

**Symptom of regression.** If `EXPO_FORCE_WEBCONTAINER_ENV=1` ever gets
removed from `.replit`, you'll see either this crash OR phones getting
`java.io.IOException: Failed to download remote update` when scanning the
QR (Expo falls back to advertising an unreachable Replit URL). Don't
waste time on ngrok auth or port mappings — put the env var back.

**API base URL is a separate concern.** Even with the tunnel working, the
app's fetch wrapper needs `EXPO_PUBLIC_API_BASE_URL` pointing at a
publicly reachable HTTPS host (the phone can't hit `localhost:3000`). See
`apps/mobile/.env.example` for the three-layer setup
(`.env.local` for Expo Go, `eas.json` env for native builds,
`.env.production.local` for OTA updates).

## OTA updates via EAS

The full runway lives in `/mstack-expo`; the notes below are the
project-specific state + the two Replit-ish gotchas that trip you up
if you invoke `eas-cli` directly.

**Current runtime in the field (as of 2026-08-03).** Build **10** on
runtime **`0.1.2`** (iOS + Android, submitted 2026-07-30). Latest
production OTA on this runtime: group
`b39cef84-29b9-4a6a-9787-2db489d8faae` (published 2026-08-03, message:
"fix(mobile/nav): tab bar clears system chrome"). The repo's
`apps/mobile/app.config.ts` has `version: "0.1.2"` and
`runtimeVersion.policy: "appVersion"`, so a plain OTA targets `0.1.2`
by default — no `--runtime-version` override needed. **Update the
"current runtime in the field" line above whenever a new store build
ships or a production OTA lands** — it's the source of truth for
whether a new OTA reaches users. Prior lineage in the field: build 8
on `0.1.1` (submitted 2026-07-14) and builds 5–7 on `0.1.0`.

**Preflight — always check BOTH lists together.** `eas update:list`
alone can mislead: if the last OTAs used a `--runtime-version 0.1.0`
override to catch stragglers on older native builds, the newest rows
show `0.1.0` even though the current store build is on `0.1.1`.
Cross-check against `eas build:list`:

```bash
pnpm dlx eas-cli build:list --status finished --limit 5 --json | \
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>JSON.parse(d).forEach(b=>console.log(b.appBuildVersion,b.platform,b.runtimeVersion,b.appVersion,b.createdAt.slice(0,10))))"

pnpm dlx eas-cli update:list --branch production --limit 5
```

**The command that actually publishes.** Two gotchas: you must be in
`apps/mobile/` (that's where `app.config.ts` + `eas.json` live), and
`EAS_PROJECT_ID` must be set as an env var when running through
`pnpm dlx` — the CLI in non-interactive mode doesn't auto-detect the
project link the way interactive mode does. Without the env var:
`EAS project not configured. Must configure EAS project by running
'eas init' before this command can be run in non-interactive mode.`

```bash
cd apps/mobile
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update --branch production --message "<short summary>"
```

**Reaching legacy runtime users.** Users still on native build 6/7
(runtime `0.1.0`) do NOT receive OTAs published on `0.1.1`. To cover
them, publish a second OTA with `--runtime-version 0.1.0` in addition
to the default push. Do this only if store-adoption data shows a
meaningful `0.1.0` population still active.

**Rollback.** Prior update group IDs are on the dashboard
(https://expo.dev/accounts/million-labs/projects/aira-mobile/updates).
Republish the last known-good group to roll back:

```bash
cd apps/mobile
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update:republish --branch production --group <prior-group-id>
```

Verify the exact CLI flag against live docs — the rollback subcommand
has changed between CLI versions.

**When OTA is NOT enough (native rebuild required).** Bumping
`version` in `app.config.ts` (e.g. `0.1.1` → `0.1.2`), any change to
plugins / permissions / icon / splash, adding/removing/updating a
native-code dependency, or an Expo SDK upgrade. Those need
`eas build --profile production --platform all` → `eas submit`. Bump
the "current runtime in the field" line above once the new build
lands on users' phones.

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
