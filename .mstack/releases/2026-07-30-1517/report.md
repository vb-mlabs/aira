# Release — ota 2026-07-30 15:17

**App:** aira-mobile · **Platform:** both (iOS + Android) · **Channel:** production
**Mode:** ota
**Status:** shipped
**Versions:** version 0.1.1 · runtimeVersion 0.1.1 (policy: appVersion)
**Commit:** `28f18d3` (pushed to `origin/feat/business-logo`)
**Update group:** `043149f8-c668-44d4-92d9-7c997172c246`
**Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/043149f8-c668-44d4-92d9-7c997172c246
**Update IDs:** iOS `019fb39a-0b9f-7275-b9df-228fbafee46f` · Android `019fb39a-0b9f-7aa6-b2eb-21bb12b84ad1`

## Scope

2 mobile commits since the previous OTA (group `8554c69d`, 2026-07-29):

- **`c9ae81e` fix(mobile/auth): Updates.reloadAsync on sign-out (nuclear-option)** — third recurrence of the sign-out no-op bug. Previous fixes (`417694f` on 2026-07-13, `4ace2a1` on 2026-07-29) each added a layer to a 4-step chain (network → cache invalidate → observer notify → gate re-render → Redirect); any single failure in the chain silently defeated the flow. Replaced the entire chain with `Updates.reloadAsync()` — JS runtime restarts, cold-boot path handles the welcome redirect. Zero dependency on React state, cache timing, gate render, or navigation. Ends the class of bugs.
- **`a91483c` feat(mobile/check-email): 5-minute resend cooldown + m:ss timer** — 60s wasn't enough for the first email to land (Gmail/Outlook greylisting delays); bumping to 300s stops users spam-tapping Resend before their first email arrives. Display switches to `m:ss` format above 60s so the countdown doesn't read as broken.

Note: a third commit rode this session (`28f18d3` — Better Auth adapter forwards `expiresInMinutes`) but is web-only, does not affect mobile bundle. Deferred to next Replit Publish.

## Preflight

| Check | Result | Evidence |
|---|---|---|
| Git state | pass | Branch `feat/business-logo` pushed to origin at `28f18d3` |
| Versioning | pass | version `0.1.1`, runtimeVersion policy `appVersion` — matches native build 8 |
| Native-diff since native build 8 (`13abcba`) | pass | `apps/mobile/package.json` diff: only `better-auth ^1.6.10 → ^1.6.22` (JS-only client library, no native module); `apps/mobile/app.config.ts` unchanged; no new plugins/permissions/entitlements/icons |
| Full monorepo typecheck | pass | 10/10 packages, 7 cached |

## Decision

OTA safe — every change is JS/config only.

## Execution log

- Split-committed 3 concerns (`c9ae81e`, `a91483c`, `28f18d3`), all with lefthook contrast + migration checks passing.
- Pushed `feat/business-logo` to origin.
- First `eas update` attempt from repo root failed (`EAS project not configured` — non-interactive mode can't infer projectId when not in the mobile directory).
- Retried from `apps/mobile/` (per CLAUDE.md's runbook note): succeeded.
- iOS + Android bundles uploaded (3.65 MB each), 71 assets/platform, fingerprint computed, group `043149f8` published.

## Sources

- CLAUDE.md — "The command that actually publishes" runbook note (must be in `apps/mobile/`, must set `EAS_PROJECT_ID`).
- `.mstack/releases/2026-07-29-0856/report.md` — previous OTA report; last runtime-in-the-field note.
- `.mstack/fixes/2026-07-14-mobile-signout-modal-noop.md` — records native build 8 as commit `13abcba`.

## Follow-ups

- **Update CLAUDE.md's "current runtime in the field"** — mention this OTA (group `043149f8`, 2026-07-30) alongside the earlier one.
- **Verify sign-out fix works** for real user — this is the third attempt; if it fails again, the next step is device logs, not another blind fix.
- **Postmark deliverability audit** (SPF/DKIM/DMARC on `airabynisarga.com`, sender-signature status, dashboard reputation score) — the actual root cause of "emails come late". Cooldown bump is a mitigation, not a cure.
- **Web publish still pending**: `28f18d3` (email adapter fix) sits uncommitted-to-prod. Needs Replit Publish next time you deploy web.
