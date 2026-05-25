# TEMPLATE.md — Importing the MLabs Template into Replit

This document captures every step taken (and every friction point hit) when
importing this template into a fresh Replit workspace, so future imports go
faster — and so the base template can be hardened to make most of these
steps unnecessary on the next fork.

---

## TL;DR — what had to change

| # | Change | Where | Reason |
|---|---|---|---|
| 1 | Pin `packageManager` to a pnpm version that exists in the Replit Nix env | `package.json` | The template pinned `pnpm@10.32.1`; the Replit Nix channel `stable-24_05` ships `pnpm@10.26.1`. pnpm tried to self-update and failed in a sandbox loop. |
| 2 | Add Replit dev hosts to `allowedDevOrigins` | `apps/web/next.config.ts` | Next.js 16 blocks cross-origin dev requests by default; the Replit preview is served through a `*.replit.dev` proxy iframe. |
| 3 | Run dev on port **5000**, bound to `0.0.0.0` | Workflow command | Replit's webview previewer requires port `5000`. Default Next.js port is `3000`. |
| 4 | Remove the stale `localPort = 3000 → externalPort = 80` mapping | `.replit` (Networking UI) | The template shipped with port `3000` mapped to external `:80`. After the workflow added `5000 → :80`, both mappings claimed the same external port and Replit flagged port `5000` as "not configured properly". |
| 5 | Switch deployment `build` / `run` from `npm` to `pnpm` | `.replit` `[deployment]` (via `deployConfig`) | Template shipped with `npm install && npm run build` / `npm start`. This is a pnpm workspace — every internal package uses the `workspace:*` protocol, which npm cannot resolve. Deploy build fails before Next.js ever runs. |
| 6 | (Optional) `.env.local` from `.env.example` | repo root | Most env vars are `.optional()` in `apps/web/src/config/env.ts`, so the app boots without them. They're required for actual feature use (DB, auth, email, uploads). |
| 7 | Run DB migrations against production Neon | `pnpm db:migrate` w/ prod `DATABASE_URL` | Production runtime hits `relation "error_log" does not exist`. Migrations are not auto-applied on first deploy. |
| 8 | Replace `@mlabs/web` with `@<new-scope>/web` in `.replit` `[workflows]` | `.replit` | Surfaced on the BetFrnd fork. `pnpm rename` correctly updates the `[deployment]` block but **leaves `[[workflows.workflow.tasks]] args` untouched**, because `scripts/rename.ts` walks the repo via a `TEXT_EXTENSIONS` allowlist and short-circuits on extensionless files. Result: Replit preview URL returns 500 because `pnpm --filter @mlabs/web` matches no workspace. |
| 9 | Add Chromium runtime libs to `replit.nix` | `replit.nix` | Surfaced on the BetFrnd fork. mstack's `/mlabs-qa` skill drives Playwright, but `chrome-headless-shell` fails on launch (`error while loading shared libraries: libglib-2.0.so.0`) because the Replit Nix env ships only `pkgs.unzip`. `ldd` confirms ~14 system libs are missing. `/mlabs-qa` cannot run on Replit until these are added. |
| 10 | Switch **both** migration script and app runtime DB client from Neon HTTP driver to WebSocket (`Pool`) driver | `packages/db/scripts/migrate.ts`, `packages/db/src/client.ts` | Surfaced on the BetFrnd fork. The template originally used `neon-http` everywhere. Drizzle's migrator needs multi-statement transactions — HTTP returns `null` rows and crashes mid-migration. **Also**, the HTTP driver returns `rows: null` (instead of `rows: []`) for zero-row queries against real tables, which crashes drizzle's adapter (`Cannot read properties of null (reading 'map')`) — surfaced when BetterAuth's signup did its "does this email exist?" lookup. `neon-http` is only correct for true edge runtimes (Cloudflare Workers, Vercel Edge); on Replit / VPS / any long-lived Node server, use `neon-serverless` + `Pool` for everything. Always call `pool.end()` in `finally` (migrate script only — long-lived app should keep the Pool). |
| 11 | Switch deploy to **Next.js standalone output** + prune the workspace before image upload | `apps/web/next.config.ts`, `.replit` `[deployment]`, new `scripts/deploy-prune.cjs` | Surfaced on the BetFrnd fork. First production deploy failed with `error: image size is over the limit of 8 GiB`. Default `next start` needs the full `node_modules` graph (~2 GB once all workspace devDeps land — Playwright, vitest, drizzle-kit, eslint, the Claude Code CLI in root devDeps, etc.), and the Replit Reserved VM image bundles **the entire workspace tree** — including a stale 582 MB `apps/web/.next/dev` Turbopack cache, `apps/mobile`, `attached_assets/`, `.mstack/`, and `zipFile.zip`. `.replit hidden = [...]` is an IDE-only file-tree setting, **not** a deploy exclusion, and the Replit deploy bundler ignores `.gitignore`. Fix: emit a self-contained `.next/standalone/` runtime, copy `public/` + `.next/static/` back into it, delete everything else not on the runtime path, and run the standalone server instead of `next start`. Target image size after these changes is 150–300 MB. |
| 12 | **Bundle a portable Node.js binary into the standalone artifact and exec it via relative path at runtime** | `.replit` `[deployment].build` + `run` (via `deployConfig`) | Surfaced on the BetFrnd fork right after #11 worked. Standalone-output Reserved-VM deploys crash-loop on startup with `sh: line 1: node: command not found` — and the same for `pnpm` and `pnpm exec node`. Replit's Reserved VM **run** image is a slim container that does NOT inherit the Nix toolchain from the build container: `modules = ["nodejs-20"]` puts `node` on PATH during build, but the run image has no `node`, no `pnpm`, not even under `bash -lc` (login shell). Copying the Nix node binary into the artifact also fails (`cannot execute: required file not found` — the ELF interpreter `/nix/store/.../ld-linux-x86-64.so.2` isn't mounted at runtime either). **Fix:** during build, `curl` the official portable `linux-x64` Node tarball from nodejs.org, copy `bin/node` into `apps/web/.next/standalone/node-runtime`, and exec that relative path at run. The nodejs.org binary links only against standard glibc (universally available), so it has no Nix/PATH dependency. Adds ~85 MB to the image — still well under the 8 GiB cap. |

After changes 1–4, `pnpm install` + the configured workflow boot the
Next.js 16 web app cleanly and the home page renders in the Replit
preview. Changes 5–12 are required before / after the first **Publish**
or before running `/mlabs-qa`.

---

## Step-by-step: what was done in this import

### 1. Inspected the template

- Confirmed the monorepo structure: `apps/{web,mobile}`, `packages/*`,
  `tooling/*`, pnpm workspaces + Turborepo.
- Read `README.md`, `AGENTS.md`, `package.json`, `.replit`,
  `apps/web/next.config.ts`, `apps/web/src/config/env.ts`.
- Verified env vars in `apps/web/src/config/env.ts` are all `.optional()`
  → the app can boot with an empty `.env.local`.

### 2. Hit the pnpm version mismatch

- Ran `pnpm install`. pnpm refused, looping on:
  ```
  ERROR  Command failed with exit code 1: pnpm add pnpm@10.32.1 …
  ```
- Replit Nix `stable-24_05` ships `pnpm@10.26.1`. The template pinned
  `"packageManager": "pnpm@10.32.1"`, which forces pnpm to self-update,
  which fails inside the sandbox.
- **Fix**: Lowered `packageManager` to `pnpm@10.26.1` in root
  `package.json`. `pnpm install` then completed in ~60s.

### 3. Allowed Replit dev hosts in Next.js 16

- Next.js 16 enforces `allowedDevOrigins`. Without the Replit host in that
  list, the preview iframe sees CORS / cross-origin warnings.
- **Fix** in `apps/web/next.config.ts`:
  ```ts
  allowedDevOrigins: [
    "127.0.0.1",
    "*.replit.dev",
    "*.repl.co",
    "*.worf.replit.dev",
  ],
  ```

### 4. Configured the Replit workflow on port 5000

- Replit's webview previewer **requires** port `5000`. Default Next dev
  port is `3000`.
- Created the workflow:
  ```
  pnpm --filter @mlabs/web dev -p 5000 -H 0.0.0.0
  ```
  with `waitForPort: 5000`, `outputType: "webview"`. This auto-added a
  `[[ports]] localPort = 5000, externalPort = 80` block to `.replit`.

### 5. Removed the duplicate port mapping

- After step 4, `.replit` contained **both**:
  ```toml
  [[ports]]
  localPort = 3000
  externalPort = 80

  [[ports]]
  localPort = 5000
  externalPort = 80
  ```
  Two ports claiming the same `externalPort`. Replit warned:
  > Port :5000 opened, but is not configured properly.
- Direct edits to `.replit` are blocked for the agent, and there is no
  programmatic tool exposed to remove a single port mapping.
- **Fix** (manual): in the Replit **Networking** panel, click the `×`
  next to the `0.0.0.0:3000 → :80` row.
- Note: the third port shown (`0.0.0.0:35539 → :3000`, pid 14) is the
  Replit workspace iframe service itself — not from the app, not
  removable, can be ignored.

### 6. Verified

- `pnpm` workflow running, `next-server (v16.2.6)` listening on `:5000`.
- Home page screenshot renders the marketing landing page (hero,
  features, etc.) cleanly. HMR connected. No console errors.

### 7. Hit (and fixed) the deploy build failure

- First **Publish** attempt failed at the build step. No runtime logs
  were produced because the build never reached the runtime stage.
- Reproduced locally with `pnpm --filter @mlabs/web build` — local
  build succeeded, so the issue was the **deploy command itself**, not
  the code.
- Root cause: `.replit` `[deployment]` shipped with
  ```toml
  build = ["sh", "-c", "npm install && npm run build"]
  run   = ["sh", "-c", "npm start"]
  ```
  This is a **pnpm workspace** (`packages/*` use `workspace:*`). npm
  cannot resolve the `workspace:*` protocol, so `npm install` fails
  before Next.js ever builds.
- **Fix** (via `deployConfig` skill — direct `.replit` edits are
  blocked):
  ```toml
  [deployment]
  deploymentTarget = "vm"
  build = ["sh", "-c", "pnpm install --frozen-lockfile=false && pnpm --filter @mlabs/web build"]
  run   = ["sh", "-c", "pnpm --filter @mlabs/web start -p 5000 -H 0.0.0.0"]
  ```
- Secondary runtime warnings observed during static-page generation
  (not blocking the build):
  - `relation "error_log" does not exist` — production Neon DB has no
    schema yet. Run `DATABASE_URL=<prod-url> pnpm db:migrate` before
    relying on the deploy.
  - `INITIAL_ADMIN_EMAIL is not set` — first signup will be a regular
    user; promote manually or set the secret.

### 8. Hit the rename-script gaps in `.replit`

(Added by the BetFrnd fork, 2026-05-13.)

- After `pnpm rename --namespace @betfrnd --slug betfrnd …` reported
  "Renamed across 168 file(s)" and `[deployment]` in `.replit` correctly
  read `@mlabs/web`, the **Replit preview URL still returned 500**.
- `curl -s https://<preview>.replit.dev/` → `HTTP/2 500`.
- Root cause: `.replit` `[[workflows.workflow.tasks]] args` still said
  ```
  pnpm --filter @mlabs/web dev -p 5000 -H 0.0.0.0
  ```
  `pnpm --filter` matched no workspace (because the rename moved
  everything to `@mlabs/*`), so port 5000 had no server.
- Why the rename missed it: `scripts/rename.ts` decides whether to
  rewrite a file via `shouldRewrite()`, which walks extensions through
  a `TEXT_EXTENSIONS` allowlist (`.ts, .tsx, .json, .yaml, …`) and
  bails on extensionless files via `if (ext === "") return false`.
  `.replit` has no extension, so it's silently skipped.
- The literal word **"MLabs"** in `.replit`'s header comment ("Replit
  configuration for the MLabs template.") is intentionally preserved
  post-rename — it reads as agency attribution ("the template that
  MLabs delivered"). The rename script's substitution list covers
  `@mlabs/*`, `mlabs-template`, `mlabs/mlabs template`, `MLabs Template`
  (phrase), `mlabs-mobile`, `scheme: "mlabs"`, `mlabs://`,
  `mlabs.example.com` — but deliberately not standalone bare `MLabs`
  or bare lowercase `mlabs` (preserved as attribution).
- **Fix** (manual, this fork): edit `.replit`. Replace `@mlabs/web` with
  `@mlabs/web` in the workflows task; update the header comment; also
  fix the stale top-level `run = "npm run dev"` → `pnpm dev`, and
  `entrypoint = "src/app/page.tsx"` → `apps/web/src/app/(marketing)/page.tsx`.

### 10. Hit the migration driver mismatch

(Added by the BetFrnd fork, 2026-05-14.)

> **Note (2026-05-18):** The `--force` flag and advisory-lock approach
> described in this section were both removed on 2026-05-18. The lock
> itself was reverted (see item 19 below and
> `.mstack/plans/2026-05-18-remove-migration-advisory-lock.md` for the
> rationale). The driver-mismatch lesson (use `neon-serverless` +
> `Pool`, not `neon-http`) still applies.

- After running `pnpm --filter @mlabs/db migrate` with `DATABASE_URL` set,
  the script consistently exited with:
  ```
  Migration lock not acquired — another deploy is running. Exiting.
  ```
- Root cause A — **stale advisory lock**: The script calls
  `pg_try_advisory_lock` (session-level). A previous crashed run acquired the
  lock but died before the `finally` block ran `pg_advisory_unlock`. Neon's
  PgBouncer kept the underlying Postgres connection alive, holding the lock
  with no process on the other end. Session-level locks can only be released
  by the same session — no new connection can unlock them.
- Added a `--force` flag (`process.argv.includes("--force")`) that skips the
  lock check for manual recovery. Running `pnpm --filter @mlabs/db migrate -- --force`
  cleared the immediate blocker.
- Root cause B — **wrong driver for migrations**: With `--force`, the script
  reached `migrate()` and crashed:
  ```
  TypeError: Cannot read properties of null (reading 'map')
      at processQueryResult (…@neondatabase/serverless/index.mjs…)
      at migrate (…drizzle-orm/neon-http/migrator…)
  ```
  The template uses `drizzle-orm/neon-http` + `neon()` for the migrate script.
  The Neon HTTP driver is **stateless** — each SQL call is a separate HTTP
  request with no persistent session. Drizzle's migrator wraps migrations in
  multi-statement transactions; the HTTP driver returns `null` rows on those
  calls, causing the crash.
- **Fix**: Rewrote `packages/db/scripts/migrate.ts` to use
  `drizzle-orm/neon-serverless` + `Pool` from `@neondatabase/serverless`.
  The WebSocket-based `Pool` maintains a real Postgres session for the
  process lifetime, supports transactions, and holds advisory locks reliably.
  Also added `await pool.end()` in the `finally` block — without this the
  Node.js process hangs after migrations complete because the pool's open
  sockets keep the event loop alive.
- **Update (BetFrnd fork, 2026-05-14)**: the app's runtime DB client was
  also switched to `neon-serverless` + `Pool` after a second failure mode
  surfaced. Symptom: every BetterAuth signup 500'd with the same
  `Cannot read properties of null (reading 'map')` error, this time on a
  plain `SELECT ... FROM "user" WHERE email = $1` lookup. Intercepting the
  raw HTTP response showed Neon's HTTP gateway returns `{"rows": null}`
  (not `[]`) for zero-row queries on real tables, and the `drizzle-orm/neon-http`
  adapter calls `rows.map(...)` without a null guard. `neon-http` is only
  correct for true edge runtimes (Cloudflare Workers, Vercel Edge) where
  TCP/WS isn't available; in a long-lived Node process it provides no
  benefit (no pooling, no real transactions, no prepared statements) and
  inherits HTTP-gateway response-shape quirks. The corrected rule of thumb:
  **`neon-serverless` + `Pool` for both migrations and runtime on any
  non-edge deployment.** Add a `globalThis` HMR guard in the runtime client
  to avoid leaking a Pool per hot-reload in `next dev`.

### 9. Hit the `/mlabs-qa` env blocker

(Added by the BetFrnd fork, 2026-05-13.)

- After `/mlabs-code` finished the v3 landing rewrite, the next step in
  the mstack workflow is `/mlabs-qa`, which drives Playwright.
- `npx playwright install chromium` downloaded `chrome-headless-shell`
  successfully (~113 MiB).
- First test launch failed:
  ```
  chrome-headless-shell: error while loading shared libraries:
    libglib-2.0.so.0: cannot open shared object file
  ```
- `ldd` against the downloaded binary lists 14+ missing libs:
  `libglib-2.0.so.0`, `libgobject-2.0.so.0`, `libnspr4.so`,
  `libnss3.so`, `libnssutil3.so`, `libgio-2.0.so.0`,
  `libatk-1.0.so.0`, `libatk-bridge-2.0.so.0`, `libdbus-1.so.3`,
  `libX11.so.6`, `libXcomposite.so.1`, `libXdamage.so.1`,
  `libXext.so.6`, `libXfixes.so.3`, `libXrandr.so.2`,
  `libgbm.so.1`.
- `replit.nix` ships only `pkgs.unzip` — none of those libs are in the
  Nix profile.
- **Fix** (manual, this fork): extended `replit.nix` with the 22
  packages Chromium needs (`pkgs.glib`, `pkgs.nss`, `pkgs.nspr`,
  `pkgs.atk`, `pkgs.at-spi2-atk`, `pkgs.cups`, `pkgs.dbus`,
  `pkgs.expat`, `pkgs.libxkbcommon`, `pkgs.libdrm`, `pkgs.mesa`,
  `pkgs.cairo`, `pkgs.pango`, `pkgs.alsa-lib`, `pkgs.gtk3`,
  `pkgs.xorg.libX11/.libXcomposite/.libXdamage/.libXext/.libXfixes/.libXrandr/.libxcb`).
  Replit rebuilds the Nix profile on next workspace start; `/mlabs-qa`
  should succeed after that.

### 11. Hit the deploy image size cap

(Added by the BetFrnd fork, 2026-05-16.)

- First production deploy failed at the image-push step:
  ```
  2026-05-14T10:50:36Z info: Pushing pid1 binary layer...
  2026-05-14T10:50:40Z info: Pushing Repl layer...
  2026-05-14T11:02:20Z error: image size is over the limit of 8 GiB
  ```
  The build itself succeeded — TypeScript ✓ in 9.2s, Turbopack compile
  in 8.6s, all 24 static pages generated, the route manifest printed.
  The failure was entirely about what got packed into the deploy image.
- Disk audit of the workspace right after a successful `pnpm --filter
  @mlabs/web build`:
  ```
  2.0G  node_modules/
  591M  apps/web/
   582M  ↳ apps/web/.next/dev    (Turbopack dev cache from prior pnpm dev runs)
   7.3M  apps/mobile/
   8.3M  packages/
   788K  zipFile.zip
   316K  attached_assets/
  ```
  Plus a bunch of repo-root crumbs (`.mstack/`, dated `.txt` logs,
  template markdown files) that nobody intends to ship.
- Root causes (compounding):
  1. **Full `node_modules` shipped.** `[deployment].build` runs
     `pnpm install --frozen-lockfile=false` across all 15 workspaces,
     pulling devDependencies (Playwright + Chromium, vitest, jsdom,
     eslint, drizzle-kit, @types/*, the Tailwind toolchain, the
     `@anthropic-ai/claude-code` CLI in root devDeps) and never prunes.
     ~2.0 GB of the image is dev tooling that no runtime code touches.
  2. **No Next.js standalone output.** `apps/web/next.config.ts` does
     not set `output: "standalone"`, so `next start` needs the full
     workspace `node_modules` graph at runtime. With standalone, Next
     traces only the files runtime actually loads and emits a
     self-contained runtime (~150–300 MB for this app).
  3. **`apps/web/.next/dev` ends up in the image.** Local `pnpm dev`
     runs produce a 582 MB Turbopack cache there. `.next/` is in
     `.gitignore`, but Replit's deploy bundler does **not** read
     `.gitignore` to decide what to include — it packs whatever exists
     on disk when `build` finishes.
  4. **Sibling apps bundled.** `apps/mobile` (Expo) is irrelevant to
     the web deploy but gets included because the image bundles the
     whole workspace tree. Same for `attached_assets/`, `.mstack/`,
     `zipFile.zip`, `2026-05-14-*.txt`, `tooling/`, and template
     markdown files.
  5. **`hidden = [...]` ≠ deploy exclusion.** The template's `.replit`
     declares `hidden = [".next", "node_modules", ".cache",
     ".lefthook"]`, which **only hides files in the Replit IDE file
     tree**. The deploy bundler ignores this list entirely.
- Compounded together, the image (workspace + nix layer + base image)
  exceeded 8 GiB and the deploy was rejected before the runtime
  container ever started. There is no "shrink the limit just for me"
  option — the only path is to ship less.
- **Fix** (this fork):
  1. Enable Next.js standalone output in `apps/web/next.config.ts`:
     ```ts
     import path from "node:path"
     import { fileURLToPath } from "node:url"
     const __dirname = path.dirname(fileURLToPath(import.meta.url))

     const nextConfig: NextConfig = {
       output: "standalone",
       outputFileTracingRoot: path.join(__dirname, "../.."),
       // …rest
     }
     ```
     `outputFileTracingRoot` is essential in a pnpm workspace. Omit it
     and Next's tracer scopes to `apps/web/` only, missing every
     symlinked `packages/*` dep and shipping a broken bundle — every
     route that imports `@mlabs/db` etc. 500s on first request with
     `Cannot find module`. Pointing it at the monorepo root lets the
     tracer follow pnpm symlinks correctly.
  2. Add `scripts/deploy-prune.cjs` — runs after `next build` and
     deletes everything not on the runtime path:
     ```
     node_modules/                  ← standalone has its own under .next/standalone/
     apps/web/node_modules/
     packages/*/node_modules/
     apps/web/.next/cache/
     apps/web/.next/dev/
     apps/mobile/                   ← deployed separately via EAS, not via web image
     apps/web/tests/
     apps/web/e2e/
     attached_assets/
     .mstack/
     .turbo/
     tooling/                       ← dev-only
     zipFile.zip
     2026-05-14-*.txt
     ```
     The script **must preserve** `apps/web/.next/standalone/`,
     `apps/web/.next/static/`, and `apps/web/public/` — the three
     things `node server.js` needs at runtime.
  3. Rewrite `.replit [deployment]` via the `deployConfig` skill
     (direct `.replit` edits are still blocked for the agent):
     ```toml
     [deployment]
     deploymentTarget = "vm"
     build = ["sh", "-c", """
       rm -rf apps/web/.next \
         && pnpm install --frozen-lockfile=false \
         && pnpm --filter @mlabs/db migrate \
         && pnpm --filter @mlabs/web build \
         && cp -r apps/web/public apps/web/.next/standalone/apps/web/public-runtime \
         && rm -rf apps/web/.next/standalone/apps/web/public \
         && mv apps/web/.next/standalone/apps/web/public-runtime apps/web/.next/standalone/apps/web/public \
         && cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static \
         && NODE_VER=20.18.1 \
         && NODE_TARBALL="node-v${NODE_VER}-linux-x64.tar.xz" \
         && curl -fsSL "https://nodejs.org/dist/v${NODE_VER}/${NODE_TARBALL}" -o "/tmp/${NODE_TARBALL}" \
         && curl -fsSL "https://nodejs.org/dist/v${NODE_VER}/SHASUMS256.txt" -o "/tmp/SHASUMS256.txt" \
         && (cd /tmp && grep " ${NODE_TARBALL}$" SHASUMS256.txt | sha256sum -c -) \
         && tar -xJf "/tmp/${NODE_TARBALL}" -C /tmp \
         && cp "/tmp/node-v${NODE_VER}-linux-x64/bin/node" apps/web/.next/standalone/node-runtime \
         && chmod +x apps/web/.next/standalone/node-runtime \
         && rm -rf "/tmp/node-v${NODE_VER}-linux-x64" "/tmp/${NODE_TARBALL}" /tmp/SHASUMS256.txt \
         && node scripts/deploy-prune.cjs
     """]
     run = ["sh", "-c", "PORT=5000 HOSTNAME=0.0.0.0 exec ./apps/web/.next/standalone/node-runtime apps/web/.next/standalone/apps/web/server.js"]

     [env]
     NEXT_TELEMETRY_DISABLED = "1"
     PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
     ```
     - `rm -rf apps/web/.next` at the top guarantees no local dev
       Turbopack cache contaminates the image.
     - `pnpm db:migrate` runs **before** `pnpm build` — `next build`
       executes app code during static page generation, which queries the
       DB. If migrations haven't run yet, `next build` crashes on missing
       tables (e.g. `relation "error_log" does not exist`). Confirmed
       fix on the BetFrnd fork (2026-05-16).
     - The two `cp -r` lines are mandatory — Next intentionally omits
       `public/` and `.next/static/` from the standalone output (so
       platforms can swap CDNs). If you forget them, every static
       asset 404s.
     - The `curl … nodejs.org … tar.xz` block bundles a portable node
       binary into the artifact. **Without this, the Reserved-VM run
       container crash-loops on `node: command not found`** — the slim
       run image doesn't ship Nix tools and copying Nix's own node fails
       because the run image doesn't mount `/nix/store` either. See
       TL;DR row #12 and recommendation #27 for the full debugging
       trail. Don't drop this step.
     - At runtime, `exec` replaces the wrapping bash so signals
       (SIGTERM on cancel/restart) reach the node process directly
       instead of being trapped by the shell.
     - `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` is a safety net — if any
       transitive dep ever postinstalls Playwright, it skips the
       ~1 GB Chromium download.
- Expected outcome: the post-prune image is in the **150–300 MB**
  range for this app (standalone server + traced deps + static +
  public + nix layer). Replit's 8 GiB cap stops being a constraint by
  an order of magnitude.

---

## Recommended changes to the base template

These are upstream fixes so the next fork of this template just works
out of the box on Replit.

### High value (do these)

1. **Loosen `packageManager` or align with Replit Nix.** Either:
   - Set it to a version known to be in `nixpkgs stable-24_05`
     (currently `pnpm@10.26.1`), **or**
   - Drop the `packageManager` pin and rely on Corepack / a `.tool-versions`
     file, **or**
   - Bump Replit's Nix channel in `.replit` to one that ships the
     intended pnpm version.
2. **Pre-populate `allowedDevOrigins` with Replit hosts.**
   The template targets Replit (per its `.replit` file), so
   `apps/web/next.config.ts` should ship with `*.replit.dev`,
   `*.repl.co`, and `*.worf.replit.dev` already listed.
3. **Make the dev port configurable, default to 5000 on Replit.** Either:
   - Change `apps/web/package.json` `"dev"` script to
     `next dev -p ${PORT:-3000} -H 0.0.0.0`, **and**
   - In `.replit`, set `[env] PORT = "5000"` so the same script binds
     correctly on Replit without changing the workflow command.
4. **Ship a single, correct `[[ports]]` block in `.replit`.** Drop the
   `localPort = 3000` mapping; ship only `localPort = 5000,
   externalPort = 80`. This avoids the "Port not configured properly"
   conflict on first boot.
5. **Pre-create the workflow definition in `.replit`.** The template
   should ship with:
   ```toml
   run = "pnpm --filter @mlabs/web dev"
   ```
   and a `[[workflows.workflow]]` block matching it, so the workspace
   boots immediately on import without an agent step.

### Medium value (nice to have)

6. **Update `.replit` `entrypoint`.** Currently
   `entrypoint = "src/app/page.tsx"` but the actual file lives at
   `apps/web/src/app/page.tsx`. The path is wrong post-monorepo move.
7. **Sync `[deployment]` to use the same port and package manager as
   dev.** The template ships `build = "npm install && npm run build"`,
   `run = "npm start"` — this **breaks every deploy** because the repo
   uses pnpm `workspace:*` packages that npm cannot resolve.
   **Superseded by recommendations #22–#24 below**: the deploy should
   build to Next.js standalone output, copy `public/` + `.next/static/`
   into the standalone tree, run migrations, prune everything else, and
   launch the standalone server (`node server.js`) — not `next start`.
   See #22–#24 for the correct `[deployment]` block. (Replace `@<scope>`
   with whatever `pnpm rename` produced — e.g. `@betfrnd`, `@mlabs`,
   etc. The rename script should also rewrite this block.)
8. **Run DB migrations in the deploy build, BEFORE `next build`, and document it.**
   First deploy hits `relation "error_log" does not exist` because no
   migrations ever ran against the production Neon DB. Either:
   - Prepend `&& pnpm --filter @<scope>/db migrate` to the deploy `build`
     command **before** `pnpm build` (so it runs once per deploy), **or**
   - Document a one-time `DATABASE_URL=<prod> pnpm db:migrate` step in
     `FORK_CHECKLIST.md.template`.

   **Critical ordering detail**: `next build` executes app code during
   static page generation (RSC, logger init, etc.) — code that talks to the
   database. If migrations run after the build step, `next build` crashes on
   missing tables. Always place `pnpm db:migrate` **before**
   `pnpm <scope>/web build` in the build command.
9. **Document the SKIP_ENV_VALIDATION trick at first boot.** `.env.example`
   mentions it, but a one-liner in `README.md` ("import on Replit → app
   boots with empty env because validators are `.optional()`") would
   save the next person a lookup.
10. **Add an `INTEGRATIONS_NEEDED.md`-style checklist** mapping each
   `.env.example` block to the Replit integration that supplies it
   (Neon → Replit Postgres, Postmark, Replit Object Storage, etc.).
   Today this lives implicitly in `.env.example` comments.

### Low value (optional)

11. **Drop `zipFile.zip`** from the repo root — it's the original
    template archive committed by accident, ~800 KB of dead weight.
12. **Hide the `.lefthook` git-hook postinstall warning** when there's no
    git repo (Replit imports start without git history). The current
    `lefthook postinstall` errors with `fatal: not a git repository`,
    which is noise on a fresh import.

### Discovered during the BetFrnd fork (2026-05-13)

These extend recommendation #7 ("rename script should also rewrite the
deployment block") with more specific gaps observed mid-fork.

13. **Make `scripts/rename.ts` cover `.replit` and other extensionless
    config files.** Today `shouldRewrite()` short-circuits on
    `ext === ""`, so `.replit` is never scanned. Recommended fix: add
    an explicit `KNOWN_FILES` set alongside `TEXT_EXTENSIONS`:
    ```ts
    const KNOWN_FILES = new Set([
      ".replit",       // workflow + entrypoint + deployment refs
      ".gitignore",    // sometimes references project paths
      ".tool-versions",
      "Dockerfile",    // if a fork ever adds one
    ])

    function shouldRewrite(absPath: string, repoRoot: string): boolean {
      …
      const base = path.basename(absPath)
      if (KNOWN_FILES.has(base)) return true   // allow before ext check
      const ext = path.extname(absPath)
      if (ext === "") return false
      return TEXT_EXTENSIONS.has(ext)
    }
    ```
    This unblocks the `.replit` rewrite without opening every dotfile
    to rewrites.

14. **~~Add `\bMLabs\b` to the rename substitutions.~~**
    *Superseded by the 2026-05-24 brand-consolidation review.* The
    `\bMLabs\b` matcher was added (per this original recommendation),
    then dropped again — it over-rewrote agency-attribution prose in
    `HANDOVER.md.template`, `DESIGN.md`, `AGENTS.md`,
    `tooling/eslint-config/**`, and `.replit`. Current approach: only
    the `"MLabs Template"` phrase matcher rewrites the capital-M form
    (catches README heading, `app.config.ts` name, DESIGN.md
    attribution). Bare `MLabs` stays as agency credit — no
    `SKIP_PATH_SUFFIXES` opt-out needed. See
    `.mstack/reviews/2026-05-24-brand-consolidation.md` for the
    rationale.

15. **Pre-include Chromium runtime deps in the shipped `replit.nix`.**
    mstack's `/mlabs-qa` is a first-class part of the template
    (`AGENTS.md` documents it as part of the plan → review → code → qa
    pipeline). It cannot run on Replit out of the box because
    `replit.nix` ships only `pkgs.unzip`. Two options:
    - **Bake them in:** ship `replit.nix` with the ~22 Chromium runtime
      packages already declared. Cost: bigger Nix profile + slower
      first-boot rebuild on every fork that doesn't run QA. Benefit:
      `/mlabs-qa` "just works" on first try.
    - **Document them:** add a "Before first `/mlabs-qa`, extend
      `replit.nix` with Playwright deps" step in
      `FORK_CHECKLIST.md.template`. Cost: every fork hits the same
      abort-and-fix loop the BetFrnd fork did. Benefit: smaller
      default profile.

    Recommend baking them in. The package list is stable and the
    rebuild penalty is one-time.

16. **Also cache the Chromium binary in a Replit workflow.** Even with
    the Nix libs in place, `npx playwright install chromium` is a
    ~113 MiB download on first `/mlabs-qa` run. Adding a one-time
    `pnpm exec playwright install chromium` step (gated by a
    `.cache/ms-playwright` check) to either the first-boot workflow or
    a dedicated "QA setup" workflow would shave a chunk off the first
    QA run.

17. **Document the `.replit` workflow + entrypoint as rename targets
    in `FORK_CHECKLIST.md.template`.** #13 lands the `.replit`
    rewrite for `@mlabs/<pkg>` filters and `mlabs-template` references.
    Per #14 (superseded), `MLabs` in the header comment now stays
    intentionally as agency attribution. The remaining manual edit
    is the entrypoint:
    > After `pnpm rename`, also check `.replit`:
    > - `@mlabs/<pkg>` filters are auto-rewritten by the rename
    >   script (since `.replit` is in `KNOWN_FILES`).
    > - `# Replit configuration for the MLabs template` header stays
    >   intentionally — preserves agency attribution.
    > - Update `entrypoint` if you moved the marketing page (the
    >   default `src/app/page.tsx` becomes wrong after route groups).

18. **Ship `migrate.ts` using the WebSocket driver (`neon-serverless` +
    `Pool`), not the HTTP driver (`neon-http` + `neon()`).** The HTTP
    driver is stateless — one HTTP request per SQL call, no persistent
    session. Drizzle's migrator wraps schema changes in multi-statement
    transactions that the HTTP driver cannot handle, causing a
    `TypeError: Cannot read properties of null (reading 'map')` crash
    mid-migration. The fix:
    ```ts
    // ✗ Wrong for migrations (crashes on multi-statement transactions)
    import { drizzle } from "drizzle-orm/neon-http"
    import { migrate } from "drizzle-orm/neon-http/migrator"
    import { neon } from "@neondatabase/serverless"
    const db = drizzle({ client: neon(url) })

    // ✓ Right for migrations (real session, full transaction support)
    import { drizzle } from "drizzle-orm/neon-serverless"
    import { migrate } from "drizzle-orm/neon-serverless/migrator"
    import { Pool, neonConfig } from "@neondatabase/serverless"
    import ws from "ws"
    neonConfig.webSocketConstructor = ws
    const pool = new Pool({ connectionString: url })
    const db = drizzle({ client: pool })
    // … migrations …
    await pool.end() // ← required; without this Node hangs (open sockets)
    ```
    **The app's runtime client (`packages/db/src/client.ts`) also belongs
    on `neon-serverless` + `Pool`**, not `neon-http`. The original advice
    here ("HTTP for app queries, WebSocket for migrations") was wrong and
    caused a separate fork-time bug: BetterAuth's signup did a zero-row
    lookup on the `user` table, Neon's HTTP gateway returned `{"rows": null}`
    instead of `{"rows": []}`, and the drizzle neon-http adapter crashed
    on `rows.map(...)`. `neon-http` is only correct for true edge runtimes
    (Cloudflare Workers, Vercel Edge) where TCP/WS isn't available. On
    Replit / any long-lived Node host, the WebSocket Pool gives you real
    pooling, real transactions, real prepared statements, and bypasses the
    HTTP gateway's response-shape quirks entirely. Corrected rule of thumb:
    **`neon-serverless` + `Pool` everywhere unless you're deploying to a
    true edge runtime.** In the runtime client, stash the Pool on
    `globalThis` to survive Next.js HMR without leaking connections:
    ```ts
    const g = globalThis as unknown as { __pool?: Pool }
    const pool = g.__pool ?? new Pool({ connectionString: url, max: 10 })
    if (process.env.NODE_ENV !== "production") g.__pool = pool
    ```
    Do **not** call `pool.end()` from the long-lived app — only from the
    migrate script.

    **One non-obvious corollary**: `db.batch([...])` is a `neon-http`-only
    API; the WebSocket Pool driver does not expose it. Any `.batch()`
    callers must be converted to `db.transaction(async (tx) => { … })`
    when you switch drivers. Typecheck catches this immediately (the
    property is missing from the new `Database` type); runtime would
    crash with `db.batch is not a function` on the first code path that
    uses it. The transaction form is also semantically stronger — real
    Postgres `BEGIN`/`COMMIT` instead of `neon-http`'s pseudo-atomic
    batched HTTP request.

19. **Don't add a session-level advisory lock to `migrate.ts` on a
    pooler endpoint.**

    *Note: rewritten 2026-05-18 (reversed prior advice to "add a
    `--force` flag" — that advice was itself working around this
    problem rather than removing it). See
    `.mstack/plans/2026-05-18-remove-migration-advisory-lock.md`
    for history.*

    Session-level advisory locks (`pg_try_advisory_lock` /
    `pg_advisory_unlock`) + PgBouncer is an anti-pattern. When the
    migrate process is killed before its `finally`-unlock runs (OOM,
    SIGKILL, deploy cancellation), the pooler returns the underlying
    Postgres session to its idle pool with the lock still held. A new
    connection cannot release a different session's lock. The deploy
    is bricked until someone manually clears the lock.

    The original instinct ("add a `--force` flag to bypass the lock")
    treats the symptom and leaves the lock in place. The better
    answer is usually to not need a lock at all:

    - **Replit Reserved VM serialises deploys per app.** A single
      workspace cannot fire two deploys against the same target
      simultaneously, so the lock has no race to defend against
      within one workspace's deploys.
    - **Drizzle's `__drizzle_migrations` table already prevents
      duplicate application.** Even if two processes raced, they
      converge to "first one wins; second no-ops on already-applied
      files or fails loudly on a conflicting DDL statement" — no
      silent corruption.

    If your fork genuinely needs cross-deploy migration coordination
    (multi-owner DB, parallel deploys from different workspaces,
    routine manual migrations from laptops), do **not** reach for a
    session-level lock through PgBouncer. Use one of:

    - **`pg_advisory_xact_lock`** — transaction-scoped. Released by
      `COMMIT` / `ROLLBACK` regardless of process death. Caveat:
      Drizzle's migrator runs each migration in its own transaction,
      so this can only protect "one migration at a time", not the
      whole migration set.
    - **A dedicated mutex table** — `INSERT … ON CONFLICT DO NOTHING`
      against a row with a `started_at` timestamp; treat rows older
      than a threshold as stale and override. More code; observable;
      survives crashes.
    - **A direct (non-pooler) Neon endpoint** combined with a
      session-level lock — only works because connection death on
      the direct endpoint propagates immediately to Postgres,
      releasing the lock. Requires a separate `MIGRATION_DATABASE_URL`
      pointed at the non-`-pooler` host.

    The template ships without a lock by default. The header comment
    in `packages/db/scripts/migrate.ts` records the assumption being
    relied on so future operators know what to revisit if the
    topology changes.

20. **Drizzle property keys for Better Auth `additionalFields` MUST be
    camelCase, even if the rest of your schema uses snake_case keys.**
    Better Auth's drizzle adapter looks up additionalFields by **JS
    property name**, not column name. If `auth.user.additionalFields`
    declares `isOver18` but the Drizzle table declares the property as
    `is_over_18`, every signup fails with a misleading error:
    ```
    BetterAuthError: The field "isOver18" does not exist in the "user"
    Drizzle schema. Please update your drizzle schema or re-generate
    using "npx auth@latest generate".
    ```
    The column is right there in Postgres — the issue is purely the JS
    key. The DB column name can stay snake_case via Drizzle's column
    alias:
    ```ts
    // ✗ Wrong — BetterAuth can't find the property
    is_over_18: boolean("is_over_18").default(false).notNull(),

    // ✓ Right — JS key matches the auth additionalFields declaration
    isOver18: boolean("is_over_18").default(false).notNull(),
    ```
    Plain (non-auth) columns can use either casing freely — this rule only
    applies to fields registered via Better Auth's `additionalFields`
    config. Tip: when adding a new additionalField, grep the auth config
    and the schema for the same key to verify they match before booting
    the app.

21. **Run `pnpm email:smoke` after adding Postmark secrets — the email
    driver fails silently otherwise.** `apps/web/src/lib/email/driver.ts`
    selects Postmark only when *both* `POSTMARK_SERVER_TOKEN` and
    `POSTMARK_FROM_EMAIL` are set; if either is missing the app falls back
    to a console driver that just logs `[email/console]` to stdout. Signup
    appears to succeed but no verification email reaches the inbox. The
    smoke script (`scripts/email-smoke.ts`) sends a real test email
    through the same path the app uses and translates common Postmark
    error codes (10 = bad token, 400 = unverified sender signature,
    1101 = template alias missing, 405 = recipient suppressed) into
    actionable hints (including the **412 "pending approval"** state
    every brand-new Postmark account starts in — sandbox mode where you
    can only send to addresses on the same domain as the verified sender
    signature). Use it at fork time to confirm the credential, sender
    signature, account-approval status, and the `verify-email` template
    are all wired before running real signups:
    ```bash
    pnpm email:smoke                          # to POSTMARK_FROM_EMAIL
    pnpm email:smoke -- --to you@example.com  # to a specific address
    ```
    If env vars are still showing MISSING after you've added them in
    Replit Secrets, restart the workspace — secrets aren't injected into
    already-running shells.

### Discovered during the BetFrnd fork (2026-05-16, deploy image size)

These extend recommendation #7 — the original "switch deploy `build`/`run`
to pnpm" advice was correct but insufficient. The fix below is the full
deploy-time story for a pnpm monorepo on Replit Reserved VM.

22. **Ship `output: "standalone"` in `apps/web/next.config.ts` by
    default, with `outputFileTracingRoot` pointing at the monorepo
    root.** Without standalone output, `next start` needs the full
    workspace `node_modules` graph at runtime (~2 GB once Playwright,
    vitest, drizzle-kit, eslint, @types/*, the Claude Code CLI in root
    devDeps, etc. are installed). Replit Reserved VM caps the deploy
    image at 8 GiB; default Next + workspace devDeps + dev `.next/dev`
    cache + sibling `apps/mobile/` exceed that. Standalone tracing
    emits a self-contained runtime (~150–300 MB for this app):
    ```ts
    import path from "node:path"
    import { fileURLToPath } from "node:url"
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const nextConfig: NextConfig = {
      output: "standalone",
      outputFileTracingRoot: path.join(__dirname, "../.."),
      // …rest
    }
    ```
    `outputFileTracingRoot` is the critical detail in a pnpm workspace:
    omit it and the tracer scopes to `apps/web/` only, misses every
    symlinked `packages/*` dep, and ships a runtime that 500s on the
    first request that imports `@mlabs/db` with `Cannot find module`.

23. **Ship `scripts/deploy-prune.ts`** (or `.cjs` if you want to avoid
    the tsx hop in the deploy build) alongside the template, and call
    it from `[deployment].build` after `pnpm build`. Removes everything
    not on the runtime path:
    - All `node_modules/` (standalone has its own under
      `.next/standalone/node_modules/`)
    - `apps/web/.next/cache/` and `apps/web/.next/dev/` (the latter is
      a Turbopack dev cache that local `pnpm dev` runs leave behind —
      582 MB on the BetFrnd fork)
    - Sibling apps not part of this deploy target (e.g. `apps/mobile/`
      for a web deploy — Expo deploys via EAS, never via the web image)
    - Dev-only directories: `tests/`, `e2e/`, `.turbo/`, `.mstack/`,
      `tooling/`
    - Repo-root crumbs: `attached_assets/`, `zipFile.zip`, dated
      `*.txt`/`*.md` logs, template markdown files
    
    The script **must preserve** `apps/web/.next/standalone/`,
    `apps/web/.next/static/`, and `apps/web/public/` — the three things
    `node server.js` needs at runtime. Next's standalone output
    intentionally omits `public/` and `.next/static/` (so platforms can
    swap CDNs); the deploy build is responsible for copying them back
    into the standalone tree before pruning, or the runtime 404s every
    static asset.

24. **Update the template's `.replit [deployment]` block to launch the
    standalone server, not `next start`.** Supersedes recommendation
    #7:
    ```toml
    [deployment]
    deploymentTarget = "vm"
    build = ["sh", "-c", "rm -rf apps/web/.next && pnpm install --frozen-lockfile=false && pnpm --filter @<scope>/db migrate && pnpm --filter @<scope>/web build && cp -r apps/web/public apps/web/.next/standalone/apps/web/public-runtime && rm -rf apps/web/.next/standalone/apps/web/public && mv apps/web/.next/standalone/apps/web/public-runtime apps/web/.next/standalone/apps/web/public && cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static && NODE_VER=20.18.1 && NODE_TARBALL=\"node-v${NODE_VER}-linux-x64.tar.xz\" && curl -fsSL \"https://nodejs.org/dist/v${NODE_VER}/${NODE_TARBALL}\" -o \"/tmp/${NODE_TARBALL}\" && curl -fsSL \"https://nodejs.org/dist/v${NODE_VER}/SHASUMS256.txt\" -o /tmp/SHASUMS256.txt && (cd /tmp && grep \" ${NODE_TARBALL}$\" SHASUMS256.txt | sha256sum -c -) && tar -xJf \"/tmp/${NODE_TARBALL}\" -C /tmp && cp \"/tmp/node-v${NODE_VER}-linux-x64/bin/node\" apps/web/.next/standalone/node-runtime && chmod +x apps/web/.next/standalone/node-runtime && rm -rf \"/tmp/node-v${NODE_VER}-linux-x64\" \"/tmp/${NODE_TARBALL}\" /tmp/SHASUMS256.txt && node scripts/deploy-prune.cjs"]
    run   = ["sh", "-c", "PORT=5000 HOSTNAME=0.0.0.0 exec ./apps/web/.next/standalone/node-runtime apps/web/.next/standalone/apps/web/server.js"]

    [env]
    NEXT_TELEMETRY_DISABLED = "1"
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
    ```
    The leading `rm -rf apps/web/.next` is essential — local `pnpm dev`
    writes a Turbopack cache there that gets baked into the image
    otherwise, since Replit's deploy bundler **does not read
    `.gitignore`** to decide what to include. Replit's `hidden = [...]`
    in `.replit` is an IDE file-tree control, not a deploy exclusion.
    `pnpm db:migrate` runs **before** `pnpm build` — `next build`
    generates static pages by executing real app code, which queries the
    DB. If the schema doesn't exist yet (first deploy), the build crashes
    on `relation "error_log" does not exist`. Confirmed fix on the
    BetFrnd fork (2026-05-16). See also recommendation #8.
    The `curl … nodejs.org … tar.xz` block bundles a portable Node 20
    binary into the standalone artifact — see recommendation #27 for
    why this is mandatory on Replit Reserved VM. The `exec` in the run
    command forwards SIGTERM directly to node so deploy
    restarts/cancellations don't get trapped by the wrapping `sh`.
    `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` is a safety net so no
    transitive dep ever postinstalls the ~1 GB Chromium bundle into the
    image.

25. **Move `@anthropic-ai/claude-code` out of root `devDependencies`.**
    It's a CLI for humans (invoked via `pnpm dlx claude` or
    `pnpm claude`). Listing it in `devDependencies` makes `pnpm
    install` pull it into every deploy image even though no runtime
    code imports it. Either drop it entirely and rely on `pnpm dlx`,
    or carve it into a `tooling/claude` workspace package that the
    deploy install step filters out. The `[agent] expertMode = true`
    Replit setting already implies the CLI is available out-of-band.

26. **Treat `apps/mobile` and `apps/web` as fully independent deploy
    leaves.** The web deploy must never bundle `apps/mobile/` (Expo
    deploys via EAS); the deploy-prune script (#23) handles that today.
    Generalize the rule in the template: one deploy target = one app.
    When a third app is added, the prune script should pick up the
    pattern by reading `pnpm-workspace.yaml` and excluding every
    `apps/*` directory that isn't the deploy target. Also worth doing
    upstream: `apps/mobile/package-lock.json` exists alongside the
    pnpm root, which is mildly inconsistent — either fold mobile fully
    into the pnpm workspace or remove `apps/mobile` from
    `pnpm-workspace.yaml` so the two installers don't fight.

### Discovered during the BetFrnd fork (2026-05-18, runtime node binary)

27. **Bundle a portable Node.js binary into the standalone artifact.**
    On Replit **Reserved VM**, the build container and the run
    container are different images. The build container loads the
    Nix profile from `modules = ["nodejs-20"]` (which is why
    `pnpm install`, `pnpm build`, and `node scripts/deploy-prune.cjs`
    all work during build). The **run container is a slim image**
    that doesn't have any of that on `$PATH`, doesn't ship pnpm,
    doesn't ship node, and doesn't honour `bash -lc` either — there is
    nothing on the run image's PATH to find.

    What does NOT work (all observed crash loops on the BetFrnd fork):

    | Run command | Failure |
    |---|---|
    | `node apps/web/.next/standalone/apps/web/server.js` | `sh: line 1: node: command not found` |
    | `pnpm exec node …` | `sh: line 1: pnpm: command not found` |
    | `bash -lc 'exec node …'` | `bash: line 1: exec: node: not found` |
    | Copy Nix's `$(command -v node)` into the artifact and exec it | `cannot execute: required file not found` — the ELF interpreter is `/nix/store/…/ld-linux-x86-64.so.2`, and `/nix/store` isn't mounted in the run image either |

    What DOES work — download the official portable Node Linux x64
    tarball from nodejs.org during build, **verify its SHA256 against
    the official `SHASUMS256.txt`**, extract just `bin/node` into the
    artifact, and exec it via relative path at runtime. The nodejs.org
    binary links only against standard glibc, which Replit's Reserved
    VM run image provides (and which is standard on virtually every
    Linux distro, though if you're porting this trick to another host
    don't take that for granted — `ldd node` to confirm):
    ```sh
    # Build step (appended to the standalone build pipeline).
    # Pinned version + SHA256 verification prevents a supply-chain
    # attack on nodejs.org from silently swapping the binary into your
    # deploy image.
    NODE_VER=20.18.1 \
      && NODE_TARBALL="node-v${NODE_VER}-linux-x64.tar.xz" \
      && curl -fsSL "https://nodejs.org/dist/v${NODE_VER}/${NODE_TARBALL}" -o "/tmp/${NODE_TARBALL}" \
      && curl -fsSL "https://nodejs.org/dist/v${NODE_VER}/SHASUMS256.txt" -o "/tmp/SHASUMS256.txt" \
      && (cd /tmp && grep " ${NODE_TARBALL}$" SHASUMS256.txt | sha256sum -c -) \
      && tar -xJf "/tmp/${NODE_TARBALL}" -C /tmp \
      && cp "/tmp/node-v${NODE_VER}-linux-x64/bin/node" apps/web/.next/standalone/node-runtime \
      && chmod +x apps/web/.next/standalone/node-runtime \
      && rm -rf "/tmp/node-v${NODE_VER}-linux-x64" "/tmp/${NODE_TARBALL}" /tmp/SHASUMS256.txt
    ```
    ```sh
    # Run command:
    PORT=5000 HOSTNAME=0.0.0.0 exec ./apps/web/.next/standalone/node-runtime apps/web/.next/standalone/apps/web/server.js
    ```
    Adds ~85 MB to the image (well under the 8 GiB cap). The binary
    sits inside the standalone tree so `scripts/deploy-prune.cjs`
    (which only deletes paths outside `apps/web/.next/standalone/`)
    preserves it automatically.

    Pinning to a specific Node version (`v20.18.1` here) keeps deploys
    reproducible and avoids surprise behaviour changes on Node minor
    bumps. Re-pin when bumping the workspace's Node module in
    `replit.nix` to keep build-time and run-time Node aligned.

    The `exec` prefix in the run command replaces the wrapping `sh`
    process with the node process directly, so signals (SIGTERM on
    deploy cancel/restart) reach node without being trapped by the
    shell. Without `exec`, node runs as a child of `sh`, which traps
    the signal and can leave node lingering through restarts.

    **Upstream fix in the template:** ship the standalone build
    pipeline in `.replit [deployment]` (per recommendation #24) with
    the node-bundling steps already included. Forks shouldn't have to
    rediscover this on their first Reserved VM deploy.

    **Fork caveat (until recommendation #13 lands):** `scripts/rename.ts`
    currently skips `.replit` (extensionless file, fails the
    `TEXT_EXTENSIONS` allowlist), so `pnpm rename` does not rewrite
    `@<scope>` in the `[deployment]` block. Until #13 is implemented,
    forks must manually update the scope in `.replit [deployment].build`
    after running rename, otherwise the `pnpm --filter @<old-scope>/…`
    invocations in the build step will silently match zero packages and
    the deploy will fail.

### Discovered during the BetFrnd fork (2026-05-19, Replit-aware Playwright auth)

28. **Run the Playwright e2e fixture with `BETTER_AUTH_URL=https://$REPLIT_DEV_DOMAIN`
    to authenticate against the running Replit dev server at `:5000`.**
    Without this, the fixture's storageState cookie is silently rejected
    and every authed scenario lands on `/login`.

    What's going wrong: BetterAuth derives its session-cookie *name* from
    the configured `baseUrl`. When `baseUrl` is HTTPS (which it is on a
    running Replit dev server because the URL falls through to
    `https://$REPLIT_DEV_DOMAIN`), the cookie is prefixed with `__Secure-`:
    `__Secure-better-auth.session_token`. When `baseUrl` is HTTP (which
    happens when the fixture is invoked with `BETTER_AUTH_URL=http://...`),
    the cookie is unprefixed: `better-auth.session_token`. If the running
    server expects `__Secure-` but the fixture writes the unprefixed name,
    the browser sends nothing the server recognises → 401 → redirect to
    `/login`.

    The fix is to call the fixture with the **same** `BETTER_AUTH_URL` the
    running dev server uses. Read it out of the live process and forward
    it into Playwright's environment:

    ```sh
    # 1. Find the dev server's PID + its BETTER_AUTH_URL / REPLIT_DEV_DOMAIN
    DEV_PID=$(pgrep -f "next-server" | head -1)
    REPLIT_DEV_DOMAIN=$(tr '\0' '\n' < /proc/$DEV_PID/environ | grep REPLIT_DEV_DOMAIN | cut -d= -f2)

    # 2. Run Playwright with the matching baseUrl so the cookie name matches
    BETTER_AUTH_URL="https://$REPLIT_DEV_DOMAIN" \
      BETTER_AUTH_SECRET="<from dev server env or .env.local>" \
      DATABASE_URL="<dev DB>" \
      NODE_OPTIONS='--conditions=react-server' \
      npx playwright test --config=<qa-dir>/playwright.config.ts
    ```

    Why this lets the browser actually send the cookie over plain HTTP to
    `:5000`: `apps/web/e2e/global-setup.ts` hardcodes
    `domain: "127.0.0.1"` in storageState and captures the actual `secure`
    flag from the `Set-Cookie` header. Because the fixture's call to
    `auth.handler` happens in-process (no real HTTP request), the
    cookie's `Secure` attribute reflects the URL scheme of the
    `Request` constructed inside the fixture — which the fixture builds as
    `http://127.0.0.1/api/auth/sign-in/email` regardless of
    `BETTER_AUTH_URL`. Result: cookie name is `__Secure-*` (set by
    BetterAuth from the HTTPS baseUrl), but the storageState entry
    has `secure: false` (captured from the in-process Set-Cookie line),
    so the browser is willing to send it over HTTP to `:5000`. The dev
    server reads it under the `__Secure-` name (matches its HTTPS
    baseUrl), verifies the signature against `BETTER_AUTH_SECRET` (shared
    between fixture and server), and accepts the session.

    Replit's webview refresh is **not** the same as a workflow restart.
    A new `BETTER_AUTH_URL` in Replit Secrets won't reach the running
    `next-server` until you actually stop + start the workflow (or kill
    the PID and let the supervisor respawn). Workflow-restart-vs-webview-
    refresh has bitten this codebase twice — see lessons #26
    (`STRIPE_WEBHOOK_SECRET` provisioning) and the wallet 2c.1 QA log.

    **What this resolves:** the previously-open TODO entry "E2E auth
    fixture — Replit-aware mode" in `TODOS.md` (closed 2026-05-19). The
    two paths the TODO described were either (a) auto-detect Replit in
    `globalSetup` and write a same-origin cookie or (b) document a
    `BETTER_AUTH_URL=http://127.0.0.1:5000` restart of `pnpm dev`. This
    recipe achieves path (a)'s outcome (authed Playwright against the
    Replit dev URL) without code changes to the fixture and without
    interrupting the user's running dev workflow. Path (b) is still a
    valid fallback if you control the dev server's launch env.

    **Upstream fix in the template (recommendation #29 — new):** wrap the
    `apps/web/e2e` invocation in a small `pnpm e2e:replit` script that
    auto-discovers the running dev server's `REPLIT_DEV_DOMAIN` from
    `/proc/<pid>/environ` and forwards it as `BETTER_AUTH_URL`. Forks
    shouldn't have to rediscover the cookie-name mismatch the first
    time they try authed Playwright on Replit.

### Discovered during the BetFrnd fork (2026-05-19, mobile WebView intercept)

29. **Open Stripe Checkout (or any auth-gated callback URL) in
    `react-native-webview` by intercepting navigation to a sentinel URL
    rather than letting the WebView load it.** This avoids ever passing
    an auth cookie or session token into the WebView — the WebView only
    ever sees Stripe's hosted page.

    The pattern (see `apps/mobile/app/(app)/wallet/checkout.tsx` for the
    full implementation):

    ```tsx
    <WebView
      source={{ uri: checkoutUrl }}        // public Stripe Checkout URL
      onShouldStartLoadWithRequest={(event) => {
        if (event.url.includes("/wallet/top-up/success")) {
          router.replace({
            pathname: "/(app)/wallet",
            params: { status: "success" },
          });
          return false;  // cancel the navigation — the URL never loads in-WebView
        }
        if (event.url.includes("/wallet/top-up?canceled=1")) {
          router.replace({
            pathname: "/(app)/wallet",
            params: { status: "canceled" },
          });
          return false;
        }
        return true;  // allow Stripe's own in-page navigation
      }}
    />
    ```

    Why this is the right shape:

    - **No auth cookie in the WebView.** The browser context inside
      `react-native-webview` is its own cookie jar. Sharing the mobile
      app's better-auth cookie into it (`sharedCookiesEnabled`,
      cookie-injection via `injectedJavaScript`, etc.) is doable but
      fragile across iOS/Android and a leak risk if the WebView ever
      navigates to a third-party host. With the intercept pattern, the
      success/cancel URLs are pure sentinels — they signal "what
      happened" but never render.
    - **Single source of webhook truth.** The Stripe webhook to our
      backend (`/api/stripe/webhook`) credits the wallet
      independently — it identifies the user via
      `payment_transaction.id` stored in Stripe session metadata, not
      via a session cookie. The WebView intercept's only job is UX:
      pop back to /wallet and trigger a refetch.
    - **Same backend reconciliation as web.** The
      `payment_transaction` row, the `webhook_event` idempotency table,
      and the existing `checkout.session.completed` handler all work
      unchanged.

    What goes wrong if you forget the intercept (i.e. let the WebView
    load `/wallet/top-up/success`): the WebView's request has no auth
    cookie → middleware redirects to `/login` → the user sees a login
    screen inside what's supposed to be a Stripe success page. The
    webhook still credits the wallet correctly; only the user-facing UX
    breaks.

    Race-window note: the user redirects from Stripe → our success URL
    before the webhook has necessarily landed on our backend. The mobile
    side mitigates by polling the wallet query on `?status=success`
    (1s → 3s → 6s, stop once the new `vc_topup` row appears in the
    ledger response). Race window is the same one the web success page
    solves via Stripe session retrieve.

    **Upstream fix in the template (recommendation #30 — new):** ship a
    `<WebViewWithReturnIntercept>` primitive in
    `apps/mobile/components/ui/` that takes a return-URL map and a
    fallback router action, so forks integrating their first mobile
    payment flow don't have to rediscover the intercept idiom.

---

## Stripe webhook endpoints — one URL, many event types

When a downstream feature needs Stripe to deliver new event types
(`account.updated`, `payment_intent.*`, etc.), DO NOT add a new
webhook endpoint to the Stripe Dashboard. Stripe lets a single
endpoint URL subscribe to any combination of event types: just open
the endpoint in the Dashboard and toggle on the new types.

The MLabs template's `/api/stripe/webhook` route dispatches by
`event.type` and dedupes by `webhook_event.id` UNIQUE. Adding a new
event type to the existing endpoint means:

- **One Stripe signing secret** (`STRIPE_WEBHOOK_SECRET`) instead of N.
- **One Replit Secret** to manage.
- **One Stripe Dashboard config row** instead of N.
- **One idempotency table** (`webhook_event`) covering everything.

Sprint 6a's Connect onboarding (Stripe `account.updated`) ships
through the existing endpoint — review explicitly rejected a second
`/api/stripe/connect-webhook` route. The "one endpoint per concern"
shape is appealing on paper but doubles the config surface for no
behavioural benefit.

**The exception:** Stripe Connect "Connect webhooks" mode (events
about *connected accounts*, distinct from "Account" events about your
platform itself) — those need their own endpoint in some Stripe
Dashboard configurations. As of 2026 most modern Connect integrations
deliver Connect events to the same URL with the same signing secret;
verify in the Dashboard's webhook settings before adding a second
endpoint.

---

## Monorepo deploy hygiene

The recurring lesson from recommendations #7, #22, #23, #24, #25, #26:
the MLabs template is a multi-app pnpm monorepo (web + mobile + shared
packages), but the default deploy story treats it like a single-app
project. Apply these rules to keep deploys lean, predictable, and well
under the 8 GiB cap.

### Rules

1. **One deploy target = one app.** Web deploys to Replit VM. Mobile
   deploys to EAS. Neither image should contain the other. The
   `deploy-prune` script enforces this for the web image; EAS handles
   the same for mobile by reading only `apps/mobile/`.

2. **Next.js apps MUST use `output: "standalone"` + `outputFileTracingRoot`.**
   In a pnpm workspace, Next's default tracer is scoped too narrowly
   and misses symlinked workspace packages. Pointing
   `outputFileTracingRoot` at the monorepo root makes the tracer
   follow pnpm symlinks correctly. Standalone output is the difference
   between a ~200 MB and a >8 GiB deploy image.

3. **Dev tools live in `devDependencies` of leaf packages, never on
   the runtime path.** Playwright, vitest, jsdom, eslint, drizzle-kit,
   the Tailwind CLI, the Claude Code CLI — none of these should be
   resolvable from production code. If a runtime file imports a dev
   tool, that's a bug to fix before deploy. The deploy-prune script
   then removes their installed copies entirely.

4. **Mobile (Expo) deploys via EAS only.** Never via the web's VM
   image. Conversely, the web's VM image must never include
   `apps/mobile/` or any Expo/RN tooling.

5. **`hidden ≠ excluded`.** Replit's `.replit hidden = [...]` is an
   IDE file-tree control. Deploy inclusion is determined by what
   exists on disk when `build` finishes. To exclude something from
   the image, delete it as part of the build step.

6. **`.gitignore` ≠ deploy-ignore.** The Replit deploy bundler does
   not read `.gitignore`. Anything in the working tree at build-end
   ships, including local Turbopack caches, attached assets, mstack
   artifacts, and extracted archives. Run `rm -rf apps/*/.next` at
   the top of every deploy build as a defense.

7. **Static and public assets need explicit copy into standalone.**
   `next build` with `output: "standalone"` deliberately omits
   `public/` and `.next/static/` from the standalone tree so platforms
   can swap CDNs. The deploy build is responsible for copying them
   into `.next/standalone/apps/<app>/` before pruning, or the runtime
   serves 404s on every static asset.

8. **Run migrations in the deploy build, not the runtime.** Migrations
   are a one-time, transactional operation — running them per-request
   or per-cold-start is dangerous. Append `pnpm --filter @<scope>/db
   migrate` to the deploy build command so each Publish runs them
   exactly once before the new runtime starts.

9. **Target production image size for this template's web deploy:
   150–300 MB.** Anything over ~500 MB means a workspace dep leaked
   through tracing or the prune script missed something. Audit with
   `du -sh apps/web/.next/standalone/` after a local build.

### Expected production image contents

After `pnpm build` + `deploy-prune`:

```
apps/web/.next/standalone/
├── apps/web/
│   ├── server.js              ← node runs this
│   ├── public/                ← copied in from apps/web/public
│   ├── .next/
│   │   ├── server/            ← traced server bundle
│   │   └── static/            ← copied in from apps/web/.next/static
│   └── package.json
└── node_modules/              ← only the traced deps
    ├── react/
    ├── next/
    ├── @neondatabase/serverless/
    └── …
```

Everything else in the workspace tree (`packages/*/src`, `tests/`,
`apps/mobile/`, dev tools, etc.) has been pruned. The runtime command
is `node apps/web/.next/standalone/apps/web/server.js` with `PORT` and
`HOSTNAME` injected via env.

---

## Quick start (post-template-hardening)

Once the recommended template changes above are applied, importing this
template into a new Replit workspace should be:

```bash
# 1. Install
pnpm install

# 2. (Optional) Fill secrets — the app boots without them
cp .env.example .env.local

# 3. Run — the pre-configured workflow handles port + host
# (no manual workflow setup, no port edits, no host config)
```

Until then, follow the **Step-by-step** section above.

---

## Environment expectations

- Replit Nix channel: `stable-24_05`
- Node: 20 (per `modules = ["nodejs-20"]` in `.replit`)
- pnpm: `10.26.1` (what the Nix channel ships)
- Next.js: `16.2.6` (Turbopack dev server)
- React: `19.2.4`
- App preview port (Replit): `5000` → external `:80`
- App production port (Replit deploy VM): `5000` (parity with dev),
  launched via `node apps/web/.next/standalone/apps/web/server.js`
  with `PORT=5000 HOSTNAME=0.0.0.0` — **not** `next start`. See
  recommendations #22–#24.
- Production runtime: Next.js standalone output. The deploy image
  contains `apps/web/.next/standalone/` + copied `public/` and
  `.next/static/` only; the rest of the workspace is pruned by
  `scripts/deploy-prune.cjs`.
- Replit Reserved VM image size cap: **8 GiB**. Target for this
  template's web deploy: 150–300 MB.
