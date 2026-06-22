# Plan: EAS project init + first builds + .well-known propagation

**Date:** 2026-06-22
**Slug:** 2026-06-22-eas-project-init
**Status:** reviewed
**Author:** framer@millionlabs.co.uk

---

## Problem

S0 has been carrying four open items for weeks that all gate the mobile
shipping path:

- ⬜ EAS project init
- ⬜ Apple Team ID → `.well-known/apple-app-site-association`
- ⬜ Android signing-cert SHA-256 → `.well-known/assetlinks.json`
- ⬜ Bundle ID registration with Apple/Google (cross-checked against the
  values already locked in `apps/mobile/app.config.ts`)

User just confirmed access to **both** Apple Developer + Google Play
Console accounts. That's the long-pole gate unblocked. F21 push
broadcasts is the immediate downstream feature that becomes shippable
the moment EAS comes online — G1 already landed
`businesses.owner_user_id` + `sendBusinessOwnerBroadcast` +
`notifications.business_broadcast`, so the targeting + persistence
layer is real and waiting on a working push channel.

Benefits:
- Mobile builds become producible — preview builds for QA, production
  builds for the stores.
- Universal-link verification activates the moment the `.well-known`
  files carry real values (the placeholders today 404 verification).
- F21 unblocks: Expo Push tokens become collectable once a build with
  a registered push key reaches a real device.
- F26 force-update gets a stable `buildNumber` semantic to lean on
  (S7 work).
- F25 deep-link wiring (S7) gets the signed bundle ID + verified
  associated domain it needs.

Success: a signed iOS production IPA + Android production AAB sit in
EAS Build artifacts, the `.well-known` files at airabynisarga.com
return the real Team ID + SHA-256 (no `{{...}}` placeholders), and
both Apple's `applinks` verifier + Google's Statement-List verifier
succeed against the live URLs. F21's plan can start the next day
without waiting on anything else.

## Scope

**In:**
- Pick an Expo account / org for ownership; if MLabs doesn't already
  have an Expo org, create a `nisarga` (or `aira`) one (decision Q1).
- Run `eas init` from `apps/mobile/` against that account/org. Captures
  the EAS project ID into the project's eas config (handled
  automatically by the CLI; manifests in
  `apps/mobile/app.config.ts.extra.eas.projectId` after init).
- Extend `apps/mobile/eas.json` with the **`production` build profile**
  the current file is missing. Profile uses:
  - `autoIncrement: "buildNumber"` (per Q5)
  - `channel: "production"` (per the EAS Update decision Q4)
  - Internal-distribution `false` (i.e. store distribution).
- Wire **EAS Update** for `preview` + `production` channels (decision
  Q4). The bare minimum is:
  - `runtimeVersion: { policy: "appVersion" }` in `app.config.ts` so a
    JS-only update stays compatible with a given native build.
  - `channel` set per profile in `eas.json` (`preview` profile already
    has it; `production` profile gets it).
  - `expo-updates` package added to `apps/mobile/package.json`.
- Apple credentials provisioning via **Expo-managed** mode (Q2). One-
  time setup:
  - Generate an App Store Connect API key (Apple Developer portal →
    Users and Access → Integrations → App Store Connect API).
  - `eas credentials --platform ios` and upload the API key when
    prompted.
  - Generate an **Apple Push Key (`.p8`)** (Apple Developer portal →
    Certificates, Identifiers & Profiles → Keys → Create with APNs
    capability). Per-team, reusable across apps, doesn't expire.
    Upload via `eas credentials` flow.
- Android credentials via **Expo-managed + local backup** (Q3):
  - First `eas build --platform android` triggers keystore creation.
  - Immediately after: `eas credentials --platform android` →
    download keystore to a secure store (1Password vault / hardware
    key). Documented in `docs/operations/eas-keystore-backup.md`
    (new file).
- Build the three first builds (Q6):
  - **Simulator iOS** (`eas build --platform ios --profile dev` —
    free, no credentials required, validates wiring).
  - **Preview Android APK + iOS IPA** (`eas build --platform all
    --profile preview` — internal-distribution, for sideloading +
    QA).
  - **Production Android AAB + iOS IPA** (`eas build --platform all
    --profile production` — signed with stored credentials, ready
    for store submission).
- App Store Connect: create the app record with bundle ID
  `com.airabynisarga.app`, name "AIRA". Surfaces the **Apple Team
  ID** in the upper-right corner of the Apple Developer portal once
  enrollment is verified — no separate fetch step.
- Google Play Console: create the app with package
  `com.airabynisarga.app`, name "AIRA". Upload the production AAB to
  the **Internal Testing track**. Once uploaded, Play Console
  surfaces the **App Signing key SHA-256** under Release → Setup →
  App Integrity. That's the value `.well-known/assetlinks.json`
  needs.
- **Two-stage value propagation** (Q7 in the plan brief, locked as
  IN scope):
  - Substitute `{{APPLE_TEAM_ID}}` (× 2 sites in
    `apple-app-site-association`) with the real Team ID.
  - Substitute `{{ANDROID_CERT_SHA256}}` (× 1 site in
    `assetlinks.json`) with the real fingerprint.
  - Commit the substituted files. The next Replit deploy serves the
    real manifests; Apple + Google verifiers re-fetch on their own
    schedule (hours, not seconds).
- Add a `docs/operations/eas-build-runbook.md` (new file) capturing
  the per-build CLI invocations + where to look for outputs + how
  to download artifacts. Bare-minimum so the next person isn't
  spelunking through Expo docs.
- Tick the relevant boxes in `FORK_CHECKLIST.md.template` so future
  forks inherit the recorded answers (account/org structure,
  Expo-managed credentials, EAS Update channels).

**Out (deferred):**
- F21 push broadcast implementation (server-side fan-out via
  expo-server-sdk, mobile-side Expo Push Token registration on the
  user profile). Separate plan after this lands.
- F25 mobile deep-link wiring (Universal Links + App Links flow
  through the app). S7 — needs signed builds + a domain that
  resolves.
- F26 force-update dialog. S7 — needs real `buildNumber` values
  flowing through `app_setting`.
- App Store + Play Store listing metadata (descriptions, screenshots,
  privacy nutrition, content rating). S7 — needs assets we don't
  have yet.
- Apple Developer / Google Play Console organisation enrollment
  itself. Already done per the user; this plan assumes accounts are
  live.
- Domain registration for `airabynisarga.com`. Different S0 item.
  EAS can build + publish without it; what doesn't work without the
  domain is universal-link **verification** (the `.well-known` URLs
  have nowhere to be served from). We can ship signed builds and
  defer link verification until the domain lands — see Edge Cases.
- Replit deploy of the new `.well-known` content. Standard
  workflow; not new infrastructure.
- TestFlight invitations + Play Console internal-testing tester
  groups. Operational, not in code.

## Approach

**Two-step ship.** Step 1 is everything that produces values:
`eas init`, credential upload, the three first builds, app records
in App Store Connect + Play Console, AAB upload to the Internal
Testing track. Step 2 is value propagation: take the Apple Team ID
that surfaces in App Store Connect + the App Signing key SHA-256
that surfaces in Play Console, substitute them into the two
`.well-known` files, commit. Verification happens after the next
Replit deploy.

The split matters because Step 2 produces a committed code change
(real Team ID + real SHA-256 → `.well-known` files), and that
change is testable only after Step 1's values exist. Treating them
as one undifferentiated task hides the dependency. Reviewer's task
list should mirror the two stages.

**Expo-managed credentials throughout.** Decision Q2 + Q3 locked
Expo-managed for both platforms. Reasoning:
- Apple: requires an App Store Connect API key (one-time setup,
  encrypted-at-rest on Expo's side); thereafter EAS rotates the
  distribution cert + provisioning profile silently. No
  team-member-leaves-with-the-cert risk.
- Android: EAS generates the upload keystore once. We download an
  encrypted backup to 1Password / hardware key per Q3 — solves the
  "what if the EAS project ever vanishes" worry without paying
  daily ceremony.

**EAS Update channel-gated.** Q4 locked Update on for `preview` +
`production` channels. `runtimeVersion: { policy: "appVersion" }`
ties OTAs to a marketing version (`version: "0.1.0"`) — bump the
version when shipping a native-code-affecting change, OTAs only
flow within a runtime version. Hotfixes for JS-only bugs flow as
`eas update --branch production`. Adds the small ops surface of a
hotfix being an `eas update` away, which is worth it the first
time a typo lands in prod.

**`buildNumber` auto-increment.** Q5 locked it. With
`appVersionSource: "remote"` (already set in `eas.json`) + an
`autoIncrement: "buildNumber"` profile setting, the per-build
counter lives on Expo's side and increments deterministically.
Marketing `version` you still bump manually. F26 force-update logic
in S7 leans on the build number being monotonic; auto-increment
guarantees it.

**All three first builds.** Q6 locked the breadth. Simulator iOS
exercises the wiring without paying for credentials; preview
internal builds give QA a real device path; production builds
exercise the signed credential pipeline end-to-end. Cheaper to
discover a missing entitlement now than at submission week.

**Alternatives considered:**

- **Use Expo Application Services without `eas init` (Classic
  builds).** Classic builds are deprecated and don't support
  Expo 55 + the credential flows we want. Rejected.
- **Skip EAS Update entirely.** Lighter operational surface but
  every typo fix is a store resubmission. Rejected per Q4.
- **Self-managed Apple credentials.** Tighter control, more
  ceremony. Rejected per Q2; the team's small and rotation is
  rare.
- **Defer production builds to S7.** Tested as an option Q6, user
  picked the broader path. Production builds now means missing
  cert / entitlement / API-key-permission issues surface in S0
  instead of at submission.
- **Use a separate `staging` channel between `preview` +
  `production`.** Extra OTA channel adds surface for v1's
  benefit-per-cost. `preview` covers internal QA; `production`
  covers public release. Three-channel future-proofing rejected.

## Data model changes

None.

The `application_setting` table grows by zero rows; F26 will seed
`min_supported_build_ios` + `min_supported_build_android` when it
ships in S7, but those keys aren't introduced here. No DB
migration.

## Files to touch

**New:**

- `docs/operations/eas-build-runbook.md` — step-by-step CLI
  invocations for each build profile, where to find outputs, common
  failure modes. ~1 page.
- `docs/operations/eas-keystore-backup.md` — one-time Android
  keystore download procedure + where to store the backup + how to
  restore if EAS project ever vanishes. ~½ page.

**Edit:**

- `apps/mobile/eas.json` — add the missing `production` profile:
  - `channel: "production"`
  - `autoIncrement: "buildNumber"`
  - `ios.simulator: false`
  - Android default build type (AAB for store).
  - `distribution: "store"` (so EAS knows to use the distribution
    cert, not ad-hoc).
- `apps/mobile/app.config.ts`:
  - Add `runtimeVersion: { policy: "appVersion" }` so EAS Update
    OTAs are scoped per marketing version.
  - Add `updates.url` + `updates.fallbackToCacheTimeout` per
    EAS Update guidance.
  - **Verify only** (no change expected): `extra.eas.projectId`
    populated by `eas init`. If `init` writes it to the wrong
    file (it sometimes goes to `app.json` if one exists; we
    only have `app.config.ts`), surface the issue in the
    runbook.
- `apps/mobile/package.json` — add `expo-updates` to dependencies
  at the Expo 55 compatible version.
- `apps/web/public/.well-known/apple-app-site-association` —
  replace **both** occurrences of `{{APPLE_TEAM_ID}}` with the
  real Team ID. (Two sites: under `applinks.details[0].appID`
  and under `webcredentials.apps[0]`.)
- `apps/web/public/.well-known/assetlinks.json` — replace the
  single `{{ANDROID_CERT_SHA256}}` with the real Play Console
  signing-key fingerprint (colon-separated uppercase hex, e.g.
  `01:23:45:...:EF`).
- `FORK_CHECKLIST.md.template` — tick the `eas init` box for the
  AIRA fork (template stays as a template for future forks, but
  this specific fork's checklist gets marked done). Confirm
  whether the project keeps a derived checklist (e.g.
  `FORK_CHECKLIST.md`) or only the template.

**External (Apple Developer portal — no repo change):**
- Confirm bundle ID `com.airabynisarga.app` is registered + tied
  to the development team.
- Generate App Store Connect API key.
- Generate Apple Push Key (.p8) with APNs capability.
- Create the app record in App Store Connect with name "AIRA" +
  the bundle ID.
- Read the **Team ID** from upper-right of Apple Developer portal
  → carry into the `.well-known` substitution task.

**External (Google Play Console — no repo change):**
- Create the app with package `com.airabynisarga.app` and name
  "AIRA".
- Upload the production AAB to the Internal Testing track.
- Read the **App Signing key SHA-256** from Release → Setup →
  App Integrity → carry into the `.well-known` substitution
  task.
- (Cannot read SHA-256 until at least one AAB is uploaded —
  that's why the production build runs BEFORE the `.well-known`
  substitution step.)

## Edge cases

- **`eas init` writes `extra.eas.projectId` to `app.json`, not
  `app.config.ts`.** Expo's CLI scans for both files; if a stray
  `app.json` exists it picks that one and the projectId ends up
  in the wrong file. We only have `app.config.ts`, so this
  shouldn't happen — but verify after init that the projectId
  surfaces in the right place. If wrong: move it manually to
  `app.config.ts.extra.eas.projectId` and delete the stray
  `app.json`.

- **App Store Connect API key has the wrong access scope.** EAS
  needs a key with "Admin" or "App Manager" access. "Developer"
  is insufficient and produces cryptic "failed to fetch
  provisioning profiles" errors mid-build. Surface this in the
  runbook.

- **Apple Push Key already exists for the team.** Apple limits
  to 2 active push keys per team. If the team has one already
  (legacy app, sibling project), reuse it rather than create a
  third — EAS doesn't manage the key, you tell it which one to
  use during `eas credentials`.

- **Android keystore + EAS Update.** Once a keystore is committed
  to a project, you can't rotate it without store resubmission
  (because the signing key is the app's identity). The download-
  to-backup step is one-shot — do it immediately after the first
  build, before any store upload pins the identity.

- **`appVersionSource: "remote"` + manual `version` bump.** With
  remote source, `app.config.ts`'s `version: "0.1.0"` is the
  marketing string only. Build numbers live on Expo's side.
  Don't try to manually set `ios.buildNumber` or
  `android.versionCode` in `app.config.ts` — Expo ignores them
  in remote mode and the next `eas build` overwrites the value.

- **Domain not registered yet.** EAS builds, store uploads,
  TestFlight, and Play Internal Testing all work without the
  domain. What doesn't work: the `.well-known` files have
  nowhere to be served from, so Apple's `applinks-verifier` and
  Google's Statement List API fail. The fix is to commit the
  substituted `.well-known` files now (Step 2 of this plan)
  and let verification activate the moment the domain points at
  the Replit deploy. Don't wait for the domain to substitute
  the values — the substitution work is identical and the
  commit is queued behind nothing else.

- **EAS Update without `expo-updates` installed.** Channel
  config in `eas.json` does nothing on its own; the runtime
  needs `expo-updates` to actually check for and apply updates.
  Adding the dep is part of this plan (not a separate plan).

- **`runtimeVersion` policy "appVersion" pins OTA compatibility
  per marketing version.** Bumping `version: "0.1.0"` to
  `"0.2.0"` invalidates any in-flight OTA on `"0.1.0"` — the
  next OTA delivers only to `"0.2.0"` clients. This is the
  desired behaviour but surprises people who expect OTAs to
  flow across versions. Document in the runbook.

- **Two `{{APPLE_TEAM_ID}}` sites in `apple-app-site-association`.**
  Easy to miss the `webcredentials.apps[0]` substitution and
  ship only the `applinks` one. Make the substitution step
  list both sites explicitly. A pre-commit grep for `{{` in
  `apps/web/public/.well-known/` catches partial substitutions
  cheaply.

- **EAS Update channel + branch name confusion.** The `channel`
  config in `eas.json` maps a build to a channel; the *branch*
  is what `eas update --branch <name>` publishes to. The
  channel-to-branch mapping is set in Expo dashboard. Defaults
  to channel == branch, which is what we want. If someone
  configures a non-default mapping later, OTA pushes go to the
  wrong cohort silently. Lock the default mapping in the
  runbook.

- **The 100-active-build-credit free EAS tier.** EAS Build has a
  monthly free tier on the personal account (low double digits).
  Org accounts are a separate quota. If we run all three
  builds (simulator + preview iOS + preview Android +
  production iOS + production Android = 5 builds) we're well
  under the quota for the personal tier and effectively zero
  cost for org. No action item, just awareness.

## Acceptance criteria

- [ ] EAS project bound to the chosen account/org. Verified by
      `eas project:info` showing the right owner.
- [ ] `apps/mobile/app.config.ts` has `extra.eas.projectId`
      populated with the EAS project's UUID.
- [ ] `apps/mobile/eas.json` has the `production` profile with
      `channel: "production"`, `autoIncrement: "buildNumber"`,
      `ios.simulator: false`, `distribution: "store"`.
- [ ] `apps/mobile/app.config.ts` has
      `runtimeVersion: { policy: "appVersion" }` and the
      `updates.url` block.
- [ ] `apps/mobile/package.json` includes `expo-updates` at the
      Expo 55-compatible version.
- [ ] Apple Push Key (.p8) registered under the team in Apple
      Developer portal, with APNs capability, uploaded to EAS via
      `eas credentials`.
- [ ] App Store Connect API key generated with Admin or App
      Manager access; uploaded to EAS.
- [ ] App record exists in App Store Connect with name "AIRA",
      bundle ID `com.airabynisarga.app`, primary language
      English (US).
- [ ] App record exists in Google Play Console with name "AIRA",
      package `com.airabynisarga.app`, category Lifestyle (or
      Business — confirm with client).
- [ ] **Simulator iOS build** completes successfully (`eas build
      --platform ios --profile dev`). Artifact downloadable.
- [ ] **Preview build for both platforms** completes successfully
      (`eas build --platform all --profile preview`). Both
      artifacts downloadable; iOS IPA is internal-distribution,
      Android APK is sideloadable.
- [ ] **Production build for both platforms** completes
      successfully (`eas build --platform all --profile
      production`). iOS IPA signed with distribution cert,
      Android AAB signed with the upload keystore.
- [ ] Android upload keystore backed up to a secure store; the
      backup is verified-restorable per the keystore-backup doc.
- [ ] Production Android AAB uploaded to Play Console Internal
      Testing track. Play Console shows the App Signing key
      SHA-256 fingerprint.
- [ ] Apple Team ID captured from Apple Developer portal.
- [ ] `apps/web/public/.well-known/apple-app-site-association`
      committed with the real Team ID at **both** sites
      (`applinks.details[0].appID` and
      `webcredentials.apps[0]`). No `{{...}}` placeholders
      remain.
- [ ] `apps/web/public/.well-known/assetlinks.json` committed
      with the real SHA-256 fingerprint. No `{{...}}`
      placeholders remain.
- [ ] After the next Replit deploy, Apple's `applinks-validator`
      (in App Store Connect → TestFlight → external testers →
      paste the URL) succeeds against
      `https://airabynisarga.com/.well-known/apple-app-site-association`.
- [ ] After the next Replit deploy, Google's Statement List
      Generator and Tester succeeds against
      `https://airabynisarga.com/.well-known/assetlinks.json`.
- [ ] `docs/operations/eas-build-runbook.md` exists with the
      runnable CLI commands for each build profile.
- [ ] `docs/operations/eas-keystore-backup.md` exists with the
      one-shot download procedure.
- [ ] `FORK_CHECKLIST.md.template` (and the AIRA-specific fork
      checklist if one exists) marks the `eas init` line item
      done.
- [ ] Roadmap S0 section flips the 4 outstanding items to ✅,
      and the "What's pending" callout at the top is updated.

## Open questions

For `/mlabs-review` to resolve before implementation:

- **Q-A — Org name.** Plan says "create a new `nisarga` or
  `aira` Expo org if MLabs doesn't already have one." Lock the
  exact org slug at review. Either is fine; `nisarga` matches
  the parent entity (and aligns with how Apple Developer is
  enrolled), `aira` matches the product. Either is changeable
  later via Expo's rename flow.

- **Q-B — Apple Push Key creation OR reuse?** If the user's
  Apple team already has a push key (some past project, some
  side experiment), Apple won't let us create a third — they
  cap at 2 active. Confirm at review whether the team has 0,
  1, or 2 active push keys before running through `eas
  credentials`.

- **Q-C — Run `eas init` from where?** The user's local
  machine + their Expo login is the easy path. Alternatively
  Replit shell can do it if Expo CLI is installed there. Q-C
  is more about logistics — the plan doesn't constrain it.
  Confirm at review.

- **Q-D — App primary category in Play Console.** Plan
  default: Lifestyle. Could also be Business or Local. Pick at
  review to keep the Play Console step unambiguous.

- **Q-E — TestFlight + Play Internal Testing tester groups.**
  Out of scope for this plan but the reviewer should confirm
  whether the user wants tester groups set up as part of S0,
  or deferred to S7 with the rest of the store-submission
  prep.

- **Q-F — Does an MLabs Expo org already exist?** Sidesteps Q-A
  entirely if the answer is yes. Reviewer confirms by visiting
  expo.dev → user's account → organizations.
