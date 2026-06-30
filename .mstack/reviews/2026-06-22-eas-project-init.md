# Review: EAS project init + first builds + .well-known propagation

**Date:** 2026-06-22
**Slug:** 2026-06-22-eas-project-init
**Plan reviewed:** [2026-06-22-eas-project-init.md](../plans/2026-06-22-eas-project-init.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** framer@millionlabs.co.uk

---

## Summary

Approved with the open questions resolved and the task list
restructured into **six phases** that make the Code-task vs
Human-task split unambiguous so `/mlabs-code` knows exactly when
to pause. Two phases produce values (Human-operations on the
Expo / Apple / Google portals) and four phases write code or docs
against those values. The plan's own two-stage framing is preserved
but expanded — there are actually three dependency chains
threading through the work: (1) `eas init` must precede the
`app.config.ts` `updates.url` edit because that URL is
`https://u.expo.dev/${projectId}`; (2) the production AAB must
exist + be uploaded before the Play Console surfaces the
signing-key SHA-256; (3) the app record must exist in App Store
Connect before the Team ID can be carried to the `.well-known`
substitution. The task list orders for these. UI-Significant
**no** (no `apps/web/src/app/**/page.tsx` or `features/components`
touched; only config files, docs, and `.well-known` JSON).

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** The plan's "Files to touch" lists
  `FORK_CHECKLIST.md.template` but the repo has a derived
  `FORK_CHECKLIST.md` (the actual fork's checklist) that already
  ticked the bundle-ID + Android-package items during the
  2026-06-09 lock. Touching the template instead of the derived
  file misses the in-flight checklist.

  **Decision:** Update the **derived `FORK_CHECKLIST.md`** (the
  AIRA fork's actual checklist), not the template. The template
  stays template — future forks will need to fill in their own
  values. Specifically tick: `eas init`, `.well-known/...`
  Team ID substitution, `.well-known/...` SHA-256 substitution.
  Leave alone: the `{{IOS_BUNDLE_ID}}` / `{{ANDROID_PACKAGE}}`
  items (those are stale — the files have real values since
  2026-06-09).

- **Concern:** `app.config.ts`'s `updates.url` is
  `https://u.expo.dev/${projectId}` and the projectId only
  exists AFTER `eas init` runs. The plan lists the
  `app.config.ts` edit as one task but it actually has to split
  around the `eas init` run.

  **Decision:** The `app.config.ts` work is **two tasks**:
  - Task A (pre-init): no projectId-dependent edit. Done now is
    just adding `runtimeVersion: { policy: "appVersion" }`.
  - Task B (post-init): `eas update:configure` runs and writes
    `updates.url` + `updates.fallbackToCacheTimeout` + (if
    missing) `extra.eas.projectId`. We commit whatever
    `eas update:configure` produces rather than hand-write the
    URL.

- **Concern:** The first builds depend on credentials existing.
  Simulator iOS doesn't (it's `--profile dev` with
  `ios.simulator: true`), but preview and production do. The
  plan lists builds before credentials in scope ordering and
  doesn't enforce the dependency in the task list.

  **Decision:** Strict task ordering:
  1. simulator iOS build first (no creds; validates wiring)
  2. Apple credentials upload + Apple Push Key (.p8) upload
  3. Android keystore generation (triggered by first Android
     build, but here treated as its own pause for backup)
  4. preview build for both platforms
  5. production build for both platforms

- **Concern:** Acceptance criteria include things `/mlabs-code`
  cannot verify (e.g. "App record exists in App Store Connect").
  The runbook must distinguish self-verifiable items
  (`eas project:info` shows X) from portal items the user must
  confirm visually.

  **Decision:** Each Human-task in the implementation plan ends
  with a **user-attested checkpoint** — the user marks
  the task done after running the relevant CLI / portal step.
  `/mlabs-code` does not verify, it **pauses** with the exact
  CLI command + Acceptance criterion echoed back.

- **Concern:** `appVersionSource: "remote"` is already set in
  `eas.json` (line 4). With remote mode active before the first
  build, the very first `eas build` will prompt for an initial
  `buildNumber`/`versionCode` value or default to 1. The plan
  doesn't call this out — first-build users get a CLI prompt
  they weren't expecting.

  **Decision:** Runbook explicitly documents this: "When prompted
  for initial `buildNumber` / `versionCode`, accept the default
  (1). EAS auto-increments thereafter via the `production`
  profile's `autoIncrement: "buildNumber"` setting."

- **Concern:** `eas init` writes to `app.config.ts` (specifically
  `extra.eas.projectId`). The plan acknowledges this in Edge
  Cases but the task list still lists "edit app.config.ts" as
  if `/mlabs-code` is doing the write. It isn't —
  `eas init` is.

  **Decision:** Task 2 (`eas init`) IS the `app.config.ts` edit
  for `extra.eas.projectId`. The user runs `eas init`, the CLI
  writes the field, the user commits the result. No
  hand-editing.

- **Concern:** EAS CLI may not be installed in the Replit shell.

  **Decision:** Runbook documents the install:
  `pnpm dlx eas-cli@latest <command>` (zero-install) OR
  `npm install -g eas-cli` (global, persists across shells).
  Recommend `pnpm dlx` for first-time use; switch to global if
  the user lives in EAS frequently.

- **Concern:** EAS authentication from Replit shell uses
  `eas login` (interactive) or `EXPO_TOKEN` env var. Interactive
  login from Replit shell may not work cleanly (terminal flow).

  **Decision:** Runbook documents: try `eas login` first; if
  the terminal flow is broken, generate a personal access token
  at expo.dev → Settings → Access Tokens and set
  `EXPO_TOKEN=<token>` in the Replit shell. This token is
  scoped to the `million-labs` org per Q-A.

- **Concern:** Push key (.p8) inclusion in this plan was Q-3
  above; user picked include-now. F21 still has out-of-scope
  bullet for this plan. Should be aligned.

  **Decision:** Push key creation + upload via `eas credentials`
  is part of this plan's task list (Q-3 confirmed). F21's
  out-of-scope note is rewritten to "F21 push broadcast
  IMPLEMENTATION" — i.e. server-side fan-out via
  `expo-server-sdk`, mobile-side token registration on
  user profile, frontend permission prompt. F21's plan won't
  need a portal trip.

- **Concern:** Mobile assets (app icon, splash) — per Q-1, defer
  to S7. Plan's first builds will ship with placeholder PNGs
  from `apps/mobile/assets/`. The runbook should make this
  explicit so the user doesn't worry the builds look unfinished.

  **Decision:** Runbook + roadmap update both note: "First
  builds use placeholder assets at `apps/mobile/assets/*.png`.
  Real AIRA icon + splash swap is part of S7 (alongside store
  metadata + screenshots). TestFlight + Internal Testing
  testers see placeholder art; they're internal testers, this
  is fine."

- **Concern:** `runtimeVersion: { policy: "appVersion" }` + the
  `version: "0.1.0"` decision (Q-2 kept) means OTAs flow within
  0.1.x. Bumping to 1.0.0 at S7 will invalidate any in-flight
  OTA, and that's the right behaviour — but the runbook should
  document the ceremony so it doesn't surprise anyone.

  **Decision:** Runbook documents: "Marketing `version` bump
  invalidates OTA continuity. Sequence at S7: bump `version` to
  `1.0.0` → build new production builds → submit to stores →
  publish OTA channels under the new version."

### Suggestions (taken or deferred)

- **Suggestion (taken):** Add the `roadmap.md` S0 update as its
  own task (not folded into the value-substitution task). The
  acceptance is a content edit, easy to verify; cleaner commit.
- **Suggestion (taken):** Each Human-task in the implementation
  plan ends with a `Pause if` directive describing the exact
  output `/mlabs-code` should receive from the user before
  unblocking (the projectId, the Team ID, the SHA-256
  fingerprint). This way the user can resume `/mlabs-code` by
  saying "here's the Team ID: XXXX" and the next code-task
  picks up.
- **Suggestion (deferred):** Setting up an `EXPO_TOKEN` as a
  Replit secret (rather than a shell-session env var). Cleaner
  long-term but requires the user to also confirm GitHub
  Actions has it for any future CI builds. Out of scope here.
- **Suggestion (deferred):** Pre-add an `eas submit` workflow
  config now so S7 inherits it. The submit-config shape changed
  in recent EAS CLI versions; better to add it at S7 when
  we're actually using it.

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

1. **Org:** `million-labs` (Q-A / Q-F resolved — org exists).
2. **App name in stores:** "AIRA". App slug stays `aira-mobile`.
3. **`eas init` run location:** Replit shell (Q-C).
4. **Play Console category:** Lifestyle (Q-D).
5. **TestFlight + Internal Testing tester groups:** set up as
   part of this plan (Q-E).
6. **Apple Push Key (.p8):** included in this plan (Q-3 above).
   F21's scope shrinks accordingly.
7. **Mobile assets:** placeholder for first builds; real art at
   S7 (Q-1 above).
8. **Marketing version:** stays `0.1.0` for first prod build;
   bumps to `1.0.0` at S7 (Q-2 above).
9. **Runbook docs:** drafted speculatively now from Expo docs;
   user revises after first successful run (Q-4 above).
10. **`FORK_CHECKLIST.md` (derived) vs template:** update the
    derived fork checklist, not the template. Specifically tick
    `eas init` + the two .well-known substitution items.
11. **Apple Push Key creation OR reuse:** operational at the
    credential step (Q-B). User looks up active key count when
    running `eas credentials --platform ios`. If team has 2
    active, reuse one of them. The runbook documents this
    decision tree.
12. **EAS auth from Replit:** prefer `eas login`; fall back to
    `EXPO_TOKEN` set via expo.dev → Settings → Access Tokens,
    scoped to the `million-labs` org.
13. **EAS CLI install:** `pnpm dlx eas-cli@latest <cmd>` for
    one-shot; runbook documents `npm install -g eas-cli` as the
    persistent alternative.
14. **First `eas build` buildNumber prompt:** accept default
    (1); EAS auto-increments thereafter.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. The
plan has **six phases**. Tasks are tagged **[CODE]** or
**[HUMAN]**.

**[CODE]** tasks `/mlabs-code` writes/commits autonomously.

**[HUMAN]** tasks ALWAYS pause `/mlabs-code` immediately. The
user runs the CLI / portal step, then resumes by quoting the
value the next task needs (projectId, Team ID, SHA-256, etc.).

---

### Phase 1 — Pre-init code prep

#### Task 1: Draft EAS runbook docs

- **Files:**
  - `docs/operations/eas-build-runbook.md` (new)
  - `docs/operations/eas-keystore-backup.md` (new)
- **What:** Speculative drafts based on Expo 55 docs + EAS CLI
  current behaviour. Sections in the build runbook:
  - Prerequisites (EAS CLI install: `pnpm dlx eas-cli@latest`
    one-shot; `npm install -g eas-cli` persistent; auth via
    `eas login` or `EXPO_TOKEN` from expo.dev → Settings →
    Access Tokens, scoped to `million-labs`)
  - `eas init` walkthrough (creates project, writes
    `extra.eas.projectId` to `app.config.ts`, prompts for
    org)
  - Initial `buildNumber` prompt: accept default 1
  - Credential setup per platform (link out to
    `eas-keystore-backup.md` for the Android-backup detour)
  - Apple Push Key (.p8) creation: Apple Developer portal →
    Keys → Create with APNs. Reuse path: "if team has 2
    active push keys already, pick existing via `eas
    credentials --platform ios` flow"
  - Three build commands with expected output
  - OTA hotfix flow: `eas update --branch production
    --message <msg>` — runtime version ceremony reminder
  - Marketing version bump ceremony for S7 (0.1.0 → 1.0.0)
  - Placeholder-assets-for-first-builds note
  - Common failure modes (App Store Connect API key access
    scope, terminal interactive login from Replit, etc.)

  Sections in keystore-backup:
  - When: immediately after first Android build
  - How: `eas credentials --platform android` → Download
    keystore
  - Where to store: 1Password vault entry "AIRA Android Upload
    Keystore" + secondary at offline hardware key
  - How to restore: documented procedure for re-uploading to
    EAS if project ever vanishes
  - Why this matters (one-paragraph: keystore IS the app's
    identity, no rotation post-submission)
- **Acceptance:**
  - Both files exist with the sections listed.
  - `pnpm typecheck` and `pnpm lint` pass (Markdown docs
    don't run through these but the lefthook hooks complete).

#### Task 2: Add `production` profile to `eas.json`

- **Files:**
  - `apps/mobile/eas.json` (edit)
- **What:** Add the missing third profile to the `build`
  object:
  ```json
  "production": {
    "distribution": "store",
    "channel": "production",
    "autoIncrement": "buildNumber",
    "ios": { "simulator": false },
    "android": { "buildType": "app-bundle" }
  }
  ```
  Keep `dev` + `preview` profiles unchanged.
- **Acceptance:**
  - `eas.json` validates against the EAS schema (`eas build
    --profile production --dry-run` would parse; verifiable
    by `node -e "JSON.parse(require('fs').readFileSync('apps/mobile/eas.json'))"`).
  - All three profiles (`dev`, `preview`, `production`)
    coexist.

#### Task 3: Add `expo-updates` + `runtimeVersion` policy

- **Files:**
  - `apps/mobile/package.json` (edit)
  - `apps/mobile/app.config.ts` (edit — pre-init portion only)
  - `pnpm-lock.yaml` (edit — auto-regenerated)
- **What:**
  - Add `"expo-updates": "~55.0.x"` to `apps/mobile/package.json`
    dependencies (use `expo install expo-updates --check` to
    let Expo pick the exact compatible patch; if you don't
    want to leave Replit shell, hard-code `~55.0.0` and let
    `pnpm install` do its thing).
  - Run `pnpm install` to refresh `pnpm-lock.yaml`.
  - Add to `app.config.ts`:
    ```ts
    runtimeVersion: { policy: "appVersion" },
    ```
    Place inside the returned object near `version`.
  - **Do NOT add `updates.url` here.** That URL is
    `https://u.expo.dev/${projectId}` and the projectId
    doesn't exist yet. Task 7 handles it via
    `eas update:configure`.
- **Acceptance:**
  - `pnpm install` completes clean.
  - `pnpm --filter @aira/mobile typecheck` passes.
  - `apps/mobile/app.config.ts` has `runtimeVersion` in the
    returned object.

### Phase 2 — Human-operated EAS init

#### Task 4 [HUMAN]: Run `eas init` from Replit shell

- **Files:** (none directly — `eas init` writes to
  `app.config.ts` `extra.eas.projectId`)
- **What:**
  ```bash
  cd apps/mobile
  pnpm dlx eas-cli@latest login              # or set EXPO_TOKEN env
  pnpm dlx eas-cli@latest init                # binds to million-labs org
  ```
  Pick the `million-labs` org when prompted. EAS CLI will
  write `extra: { eas: { projectId: "<uuid>" } }` to
  `app.config.ts`.
- **Acceptance:**
  - `app.config.ts` now includes `extra.eas.projectId` with
    a real UUID.
  - `eas project:info` shows `Owner: million-labs`.
  - User commits the `app.config.ts` change.
- **Pause if:** `eas init` writes to `app.json` instead of
  `app.config.ts` (means there's a stray `app.json` in
  `apps/mobile/` confusing the CLI). User should delete the
  stray and re-run. Runbook documents this.

### Phase 3 — Post-init code wiring

#### Task 5: Wire EAS Update — `updates.url` + channel mapping

- **Files:**
  - `apps/mobile/app.config.ts` (edit)
- **What:**
  - From Replit shell, **user runs**
    `pnpm dlx eas-cli@latest update:configure` which mutates
    `app.config.ts` to add:
    ```ts
    updates: {
      url: "https://u.expo.dev/<projectId>",
      fallbackToCacheTimeout: 0,
    },
    ```
  - `/mlabs-code` does NOT write this URL itself — the user
    runs the CLI and commits whatever it produces. Treat this
    as a `[HUMAN]` step but the user can immediately come
    back and ask `/mlabs-code` to commit the diff.
- **Acceptance:**
  - `app.config.ts` has the `updates` block with the real
    project's `u.expo.dev` URL.
  - `pnpm --filter @aira/mobile typecheck` passes.
- **Pause if:** `eas update:configure` is not present in the
  CLI version installed — user upgrades to latest EAS CLI
  (`pnpm dlx eas-cli@latest update:configure`).

### Phase 4 — Build pipeline: credentials + builds

#### Task 6 [HUMAN]: First simulator iOS build

- **Files:** (none)
- **What:**
  ```bash
  pnpm dlx eas-cli@latest build --platform ios --profile dev
  ```
  Free, no credentials required. Validates the EAS-Build
  wiring end-to-end. Build artifact is a runnable iOS
  simulator app.
- **Acceptance:**
  - Build completes successfully (visible on expo.dev → AIRA
    project → Builds).
  - Artifact downloadable.
- **Pause if:** Build fails for any reason — user pastes the
  error output; `/mlabs-code` does not retry.

#### Task 7 [HUMAN]: Upload Apple credentials

- **Files:** (none)
- **What:** Three sub-steps in Apple Developer portal:
  1. Generate App Store Connect API key (Users and Access →
     Integrations → App Store Connect API). Access: Admin
     OR App Manager (Developer is insufficient). Download
     the `.p8` file.
  2. Generate Apple Push Key (.p8) with APNs capability
     (Certificates, Identifiers & Profiles → Keys → +). If
     team has 2 active push keys already, pick one to reuse
     in step 3 instead.
  3. From Replit shell:
     ```bash
     cd apps/mobile
     pnpm dlx eas-cli@latest credentials --platform ios
     ```
     Upload the App Store Connect API key. Upload (or
     pick existing) Push Key.
- **Acceptance:**
  - `eas credentials --platform ios` shows API key + Push
    Key registered.
  - Apple Developer portal shows the Push Key with APNs
    capability.
- **Pause if:** "Failed to fetch provisioning profiles"
  error — API key has wrong access scope. Regenerate at
  Admin/App Manager level.

#### Task 8 [HUMAN]: Trigger Android keystore generation + backup

- **Files:** (none)
- **What:**
  ```bash
  pnpm dlx eas-cli@latest build --platform android --profile preview
  ```
  This kicks off the Android preview build which triggers
  keystore generation on EAS's side. The build completes;
  the keystore is now owned by the project. Immediately
  after:
  ```bash
  pnpm dlx eas-cli@latest credentials --platform android
  ```
  Choose "Download Keystore". Store in 1Password vault
  per `docs/operations/eas-keystore-backup.md`.
- **Acceptance:**
  - Preview Android APK exists in EAS Builds.
  - Local backup of keystore exists in 1Password "AIRA
    Android Upload Keystore" entry.
  - User attests backup is restorable (runbook's verify
    procedure).
- **Pause if:** Backup procedure fails or the user can't
  download the keystore — `/mlabs-code` does not move on
  to production builds without backup confirmed.

#### Task 9 [HUMAN]: Preview iOS build

- **Files:** (none)
- **What:**
  ```bash
  pnpm dlx eas-cli@latest build --platform ios --profile preview
  ```
  Internal-distribution; can be sideloaded onto a
  TestFlight tester's device.
- **Acceptance:**
  - Preview iOS IPA exists in EAS Builds.
  - Download link works.

#### Task 10 [HUMAN]: Production iOS + Android builds

- **Files:** (none)
- **What:**
  ```bash
  pnpm dlx eas-cli@latest build --platform all --profile production
  ```
  Both production builds run in parallel. iOS IPA signed
  with distribution cert; Android AAB signed with the
  upload keystore from Task 8.
- **Acceptance:**
  - Both production artifacts exist in EAS Builds.
  - User can download both.
- **Pause if:** Either build fails — user pastes output;
  `/mlabs-code` does not retry without user direction.

### Phase 5 — Portal app records + first uploads

#### Task 11 [HUMAN]: Create App Store Connect app record

- **Files:** (none)
- **What:**
  - In App Store Connect, create new app:
    - Bundle ID: `com.airabynisarga.app`
    - Name: "AIRA"
    - Primary language: English (U.S.)
    - SKU: `aira-1` (internal identifier; any unique string)
  - Open the App Information tab to confirm bundle ID
    matches.
  - **Set up TestFlight Internal Testing group** (Q-E):
    - TestFlight → Internal Testing → Add group "AIRA
      Internal"
    - Add testers (user's email + client testers'
      emails); pick the production IPA from Task 10
    - First TestFlight invite goes out
  - Capture the **Apple Team ID** from upper-right of
    the Apple Developer portal (also visible in App Store
    Connect → Membership Details). Format: 10-character
    alphanumeric (e.g. `ABC1234567`).
- **Acceptance:**
  - App record exists in App Store Connect.
  - User has the Team ID written down for Task 14.
  - TestFlight Internal group exists with at least one
    tester invited.
- **Pause if:** Bundle ID mismatch (App Store says it's
  already used by a different team / app) — user
  resolves with Apple Developer support; `/mlabs-code`
  pauses indefinitely.

#### Task 12 [HUMAN]: Create Play Console app record + upload AAB

- **Files:** (none)
- **What:**
  - In Google Play Console, create new app:
    - App name: "AIRA"
    - Default language: English (United States)
    - App or game: App
    - Free or paid: Free
    - Declarations: tick all required boxes
  - In Setup → App Details:
    - Category: Lifestyle (per Q-D)
    - Package name: `com.airabynisarga.app` (locked at
      first upload; double-check)
  - In Release → Testing → **Internal testing** (Q-E):
    - Create release; upload the production AAB from Task 10
    - Create tester list "AIRA Internal" + invite testers
    - Roll out to Internal Testing
  - After upload, visit Release → Setup → App Integrity
    (or Release → Setup → App Signing) to read the **App
    Signing key SHA-256 fingerprint**. Format:
    colon-separated uppercase hex (`01:23:45:...:EF`).
- **Acceptance:**
  - App record exists in Play Console.
  - Production AAB uploaded to Internal Testing track.
  - User has the SHA-256 fingerprint written down for Task 14.
  - Internal testers list has at least one tester invited.
- **Pause if:** Package name conflict — user resolves with
  Play support; `/mlabs-code` pauses indefinitely.

### Phase 6 — Code: value propagation

#### Task 13: Substitute Team ID into `apple-app-site-association`

- **Files:**
  - `apps/web/public/.well-known/apple-app-site-association`
    (edit)
- **What:** User provides the Team ID from Task 11. Replace
  **both** `{{APPLE_TEAM_ID}}` occurrences:
  - Inside `applinks.details[0].appID` (form:
    `<TEAM_ID>.com.airabynisarga.app`)
  - Inside `webcredentials.apps[0]` (form:
    `<TEAM_ID>.com.airabynisarga.app`)
- **Acceptance:**
  - `grep "{{" apps/web/public/.well-known/apple-app-site-association`
    returns no matches (zero placeholders).
  - Both `appID` and `webcredentials.apps[0]` are filled
    with the same value.
- **Pause if:** The user-provided Team ID is not 10 chars
  alphanumeric — wrong value.

#### Task 14: Substitute SHA-256 into `assetlinks.json`

- **Files:**
  - `apps/web/public/.well-known/assetlinks.json` (edit)
- **What:** User provides the SHA-256 fingerprint from
  Task 12. Replace `{{ANDROID_CERT_SHA256}}` with the
  colon-separated uppercase hex value.
- **Acceptance:**
  - `grep "{{" apps/web/public/.well-known/assetlinks.json`
    returns no matches.
  - The `sha256_cert_fingerprints` array contains exactly
    one string matching the user-provided value.
- **Pause if:** Fingerprint is not 95 chars (32 bytes of
  colon-separated uppercase hex) — wrong format.

#### Task 15: Update derived `FORK_CHECKLIST.md`

- **Files:**
  - `FORK_CHECKLIST.md` (edit — derived fork checklist,
    NOT the `.template`)
- **What:** Tick the items now done:
  - `eas init` line
  - `apple-app-site-association` Team ID substitution line
  - `assetlinks.json` SHA-256 substitution line
  - Leave alone: `IOS_BUNDLE_ID` / `ANDROID_PACKAGE` items
    (stale — done in 2026-06-09)
- **Acceptance:**
  - The relevant 3 boxes are ticked.
  - `pnpm lint` (Markdown not linted, no-op but harmless).

#### Task 16: Update `roadmap.md`

- **Files:**
  - `roadmap.md` (edit)
- **What:** In the "What's pending" callout near top:
  - Flip the four S0 items (EAS init, Apple Team ID,
    Android SHA-256, bundle ID registration) from ⬜ / 🟦
    to ✅.
  - In the S0 sprint section further down, flip the same
    four to ✅ + reference this review by slug.
  - Add a 2026-06-22 entry to the Decision log noting:
    "S0 EAS init shipped — `million-labs` Expo org;
    Expo-managed credentials; EAS Update on for preview +
    production with `runtimeVersion: appVersion` policy;
    placeholder mobile assets through S7; first prod
    builds for both platforms uploaded to TestFlight +
    Play Internal Testing; F21 push broadcasts now purely
    a code task."
- **Acceptance:**
  - All four S0 items show ✅ in both the callout and the
    sprint section.
  - Decision log has the new entry with date.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate,
not guess.

- None. All plan-level questions resolved in "Decisions
  locked" above. Tasks 4 / 7 / 8 / 11 / 12 carry `Pause if`
  triggers for the specific portal failure modes that
  warrant escalation.
