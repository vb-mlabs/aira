# Expo Go on Replit — setup runbook

This is the working setup for iterating on `apps/mobile` via Expo Go (scan
the QR, app loads on a real phone) when the dev environment is a Replit
workspace. Three independent fixes have to land for the chain to work
end-to-end. Each one solves a different failure mode; missing any one
breaks the chain.

Audience: future-you (or the agent the next time you boot a fresh AIRA-shaped
project on Replit).

---

## TL;DR

1. **`apps/mobile/.env.local`** sets `EXPO_PUBLIC_API_BASE_URL` to a publicly
   reachable HTTPS URL (your `$REPLIT_DEV_DOMAIN`). Without it, the phone
   throws "Network error" on every API call.
2. **`.replit` workflow** prefixes `expo start` with
   `EXPO_FORCE_WEBCONTAINER_ENV=1`. Without it, Expo CLI falls back to the
   deprecated ngrok tunnel backend and crashes.
3. **`apps/mobile/eas.json`** + **`apps/mobile/.env.production.local`**
   carry the prod API URL for native binaries and OTA bundles respectively.
   Without `.env.production.local`, `eas update` silently leaks your dev
   URL into the production OTA bundle.

Healthy startup signal: console line
`Waiting on http://<id>.boltexpo.dev` followed by the QR code.

---

## Fix 1 — `EXPO_PUBLIC_API_BASE_URL` across 3 bundle producers

### Problem

The mobile fetch wrapper at `apps/mobile/lib/api/client.ts` reads
`process.env.EXPO_PUBLIC_API_BASE_URL` at module load and falls back to
`http://localhost:3000`. On the phone, `localhost` resolves to the phone
itself — so every API call throws "Network error" until the env var is
set to a host the phone can actually reach.

### Why three places

Expo resolves env vars from the JS bundle, not the OS. The bundle is built
by whoever runs Metro:

| Bundle producer | Reads env from | Used for |
|---|---|---|
| Metro (local) | `apps/mobile/.env*` files | Expo Go QR-scan dev loop |
| EAS Build cloud | `apps/mobile/eas.json` `env` block | TestFlight / Play / store binaries |
| Metro (local, again) | `apps/mobile/.env*` files | `eas update` OTA bundles |

Three producers, three places to keep in sync.

### The foot-gun

`eas update` runs Metro **locally**, so it inherits whatever
`.env.production.local` says (Next-style precedence:
`.env.production.local` > `.env.local` > `.env`). If `.env.production.local`
is missing, Metro falls through to `.env.local`'s dev URL and bakes it
into the production OTA bundle — silently breaking every TestFlight user
until you push another update.

The `env` block in `eas.json` does **NOT** apply to `eas update`.
`.easignore` does **NOT** protect either. Mirror the value yourself in
`.env.production.local`.

### Setup

```bash
# apps/mobile/.env.local  (gitignored — per-developer)
EXPO_PUBLIC_API_BASE_URL=https://<your-replit-dev-domain>

# apps/mobile/.env.production.local  (gitignored — mirrors eas.json prod)
EXPO_PUBLIC_API_BASE_URL=https://<your-prod-domain>
```

```json
// apps/mobile/eas.json — add env block to preview + production profiles
"preview": {
  ...,
  "env": { "EXPO_PUBLIC_API_BASE_URL": "https://<your-prod-domain>" }
},
"production": {
  ...,
  "env": { "EXPO_PUBLIC_API_BASE_URL": "https://<your-prod-domain>" }
}
```

```gitignore
# .gitignore — covered by:
.env*
!.env.example
```

Commit `apps/mobile/.env.example` as the runbook for whoever forks. See
this repo's copy for the full version with inline docs.

### Sanity check before any `eas update --branch production`

1. `cat apps/mobile/.env.production.local` shows prod URL, not localhost
   or a `*.replit.dev` domain.
2. `apps/mobile/eas.json` production `env.EXPO_PUBLIC_API_BASE_URL`
   matches.
3. After OTA, install via TestFlight and confirm network requests hit
   prod (Charles Proxy or a logged request).

---

## Fix 2 — Expo Go tunnel via ws-tunnel, not ngrok

### Problem

`expo start --tunnel` on Replit crashes with:

```
CommandError: TypeError: Cannot read properties of undefined (reading 'body')
Check the Ngrok status page for outages: https://status.ngrok.com/
```

The error message points at the ngrok status page. **Red herring.** Ngrok
isn't down; the agent is unauthenticated.

### Root cause

Expo CLI picks between two tunnel backends at runtime:

- **`AsyncWsTunnel`** — uses `@expo/ws-tunnel`, hosted by Expo at
  `*.boltexpo.dev`. Free, anonymous, zero config. Fires only when
  `envIsWebcontainer()` returns true.
- **`AsyncNgrok`** — uses `@expo/ngrok`. Anonymous ngrok tunnels were
  deprecated upstream, so the agent now requires an authtoken or it
  crashes with the exact `Cannot read properties of undefined` error
  above (Expo CLI mis-handles ngrok's `ERR_NGROK_4018` "auth required"
  response).

Replit isn't a webcontainer by default
(`process.versions.webcontainer` is unset). Without intervention, Expo
CLI silently falls back to ngrok → crash.

### Fix

Set `EXPO_FORCE_WEBCONTAINER_ENV=1` before `expo start`. Forces
`envIsWebcontainer()` to return true, routes through ws-tunnel.

```toml
# .replit
[[workflows.workflow]]
name = "Expo Go (Tunnel)"
mode = "sequential"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "EXPO_FORCE_WEBCONTAINER_ENV=1 pnpm --filter <mobile-package> exec expo start --tunnel --clear"
```

### Hard rules

1. **Always** `EXPO_FORCE_WEBCONTAINER_ENV=1` in front of `expo start --tunnel`.
   Not `expo start` alone. Not `--tunnel` alone. Not
   `REACT_NATIVE_PACKAGER_HOSTNAME` / `EXPO_PACKAGER_PROXY_URL` env vars
   pointing at `$REPLIT_DEV_DOMAIN` — none of those make Metro reachable
   from a phone outside the LAN.
2. **Do NOT pass `--port`.** `@expo/ws-tunnel` only supports Metro's
   default 8081; `--port 8080` throws `WS_TUNNEL_PORT`. The
   `[[ports]] externalPort = 8080` mapping in `.replit` is misleading —
   it does NOT publish 8080 to the public internet, only to the
   workspace's internal sandbox. Metro must go through the tunnel for a
   real phone to reach it.

### Healthy startup signal

```
Waiting on http://<id>.boltexpo.dev
› Metro waiting on exp://<id>.boltexpo.dev
[QR code]
```

If you see `boltexpo.dev`, ws-tunnel is connected.

### Symptom of regression

If `EXPO_FORCE_WEBCONTAINER_ENV=1` ever gets removed from `.replit`,
you'll see either:

- The ngrok-body crash above, OR
- Phones getting `java.io.IOException: Failed to download remote update`
  when scanning the QR (Expo falls back to advertising an unreachable
  Replit URL).

Don't waste time on ngrok auth or port mappings — put the env var back.

### Anti-patterns the error message tempts you toward

- **"Check the Ngrok status page for outages"** — red herring; ngrok
  isn't down, the agent is unauthenticated.
- **"Install `@expo/ngrok` as a workspace devDep so pnpm finds it"** —
  also a red herring (looks like the pnpm-resolver pattern below but
  isn't); ngrok is the wrong backend entirely on Replit.
- **"Get a free ngrok authtoken"** — works but is busywork; ws-tunnel
  needs no account.

---

## Fix 3 — pnpm-resolver pattern (for OTHER deps, not ngrok)

This is a separate pattern that's still real, just **not for the ngrok
case above**. Use it when Expo CLI loops on "install package X and try
again" for any package other than `@expo/ngrok`.

### Problem

pnpm's strict isolated `node_modules` layout hides global npm installs
from Expo CLI's `require.resolve()`. The CLI asks to install, accepts a
"yes," globally installs via npm, and then re-prompts with the same
error.

### Fix

Add the package as a workspace devDep instead:

```bash
pnpm add -D --filter <mobile-package> <package-name>
```

Verify the resolver sees it:

```bash
node -e "console.log(require.resolve('<package-name>', { paths: ['/home/runner/workspace/apps/mobile'] }))"
```

### Confirmed instances in this app

- `whatwg-fetch` (F21 push broadcasts, 2026-06-23) — Metro couldn't
  find it via pnpm's deep `.pnpm/...` paths.
- Expo-curated peer versions (SDK 54 downgrade, 2026-06-23) — pinned
  via `npx expo install --fix`, not by-hand.

### When to use vs not use

If `expo start --tunnel` is what prompted, the ngrok backend is your
real bug — use Fix 2, NOT this pattern. For any other package, this
pattern is correct.

---

## Order of operations for a fresh fork

1. **`.env*` setup** (Fix 1)
   - Create `apps/mobile/.env.local` with your `$REPLIT_DEV_DOMAIN`-based URL
   - Create `apps/mobile/.env.production.local` with your prod URL
   - Edit `apps/mobile/eas.json` — add `env` block to preview + production profiles
   - Commit `apps/mobile/.env.example` as a runbook
   - Confirm `.gitignore` has `.env*` + `!.env.example`

2. **`.replit` workflow** (Fix 2)
   - Add or edit the `Expo Go (Tunnel)` workflow with the
     `EXPO_FORCE_WEBCONTAINER_ENV=1` prefix
   - Keep `--tunnel --clear`; never add `--port`

3. **`CLAUDE.md`** (or your project's agent-context file)
   - Copy the "Expo Go on Replit" section (see this repo's `CLAUDE.md`)
     so the next agent doesn't have to rediscover the diagnosis

4. **Phone test loop**
   - Start the workflow → look for `Waiting on http://<id>.boltexpo.dev`
   - Open Expo Go on phone → scan QR → app loads
   - Log in → request hits your dev domain
   - If "Network error" → `.env.local` URL is wrong or Metro didn't
     pick up the env var (restart the workflow, not hot reload —
     Metro inlines env vars at start time)

---

## Files to copy verbatim to a new app

- `apps/mobile/.env.example` — the three-layer runbook with inline docs
- `CLAUDE.md` § "Expo Go on Replit" — the tunnel rules + healthy-startup
  signal + regression symptoms
- `.replit` `[[workflows.workflow]]` block for "Expo Go (Tunnel)" with
  the `EXPO_FORCE_WEBCONTAINER_ENV=1` env var prefix

## Quick-reference debugging table

| Symptom | Cause | Fix |
|---|---|---|
| `Network error` on login from Expo Go | `EXPO_PUBLIC_API_BASE_URL` unset or pointing at localhost | Fix 1 — set `.env.local`, restart Metro |
| `TypeError: Cannot read properties of undefined (reading 'body')` + ngrok status page hint | Falling back to ngrok backend | Fix 2 — `EXPO_FORCE_WEBCONTAINER_ENV=1` |
| `WS_TUNNEL_PORT` error | `--port` flag passed | Remove `--port`; ws-tunnel only supports 8081 |
| `java.io.IOException: Failed to download remote update` on QR scan | Expo advertising unreachable Replit URL | Fix 2 — `EXPO_FORCE_WEBCONTAINER_ENV=1` |
| TestFlight users hit dev API after OTA | `.env.production.local` missing or wrong | Fix 1 — create/correct `.env.production.local`, re-push OTA |
| `expo start` loops on "install X" prompt after global install | pnpm hides global install from Expo's resolver | Fix 3 — add X as workspace devDep (unless X is `@expo/ngrok`, then Fix 2) |

---

## Reference commits

All three fixes shipped to this repo on 2026-06-29:

| Commit | What |
|---|---|
| `9928186` | Fix 1 — `EXPO_PUBLIC_API_BASE_URL` three-layer setup + `.env.example` runbook |
| `a00fc3a` | Fix 2 — Expo Go tunnel via ws-tunnel (`EXPO_FORCE_WEBCONTAINER_ENV=1`), CLAUDE.md section, memory file |
| `37e6b93` | Cleanup — remove `@expo/ngrok` devDep (added on the misdiagnosis that became Fix 2) |
