# Release — ota (shipped) 2026-07-24 18:32

**App:** AIRA (`com.airabynisarga.app`) · **Platform:** both · **Channel/profile:** production
**Mode:** ota
**Status:** shipped
**Versions:** version `0.1.1` · runtime `0.1.1`
**Commit:** `578e635` (tip; Expo checkpoint marker `*` in output)
**Update group ID:** `a9b22e75-b112-4d70-8b93-59afe3064252`
**iOS update ID:** `019f9462-9e60-776c-8ed0-b45f009df0c4`
**Android update ID:** `019f9462-9e60-7069-bd7f-eaa397695dcc`
**Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/a9b22e75-b112-4d70-8b93-59afe3064252

## Preflight

| Check | Result | Evidence |
|---|---|---|
| EAS auth | ✅ pass | `vinod@millionlabs.co.uk` (accounts: vb-mlabs owner, million-labs developer) |
| Git state | ✅ pass | Tree clean apart from `.claude/*` + `.expo/*` cache noise; no uncommitted source |
| Native-diff since last OTA (`e75915d0` / tip `bd6451f`) | ✅ pass | 9 mobile files touched. Zero changes to `app.config.ts`, `apps/mobile/package.json`, `apps/mobile/assets/`, or any `packages/*/package.json` |
| Runtime version coherence | ✅ pass | Repo `version: "0.1.1"` in `app.config.ts` == store build 8 runtime `0.1.1` (iOS + Android, submitted 2026-07-14) |
| expo-doctor | ⚠️ 3 pre-existing findings | metro monorepo override (intentional); react duplicate 19.1.0 + 19.2.4 (transitive via use-sync-external-store); expo@54.0.35 vs `~54.0.36` and expo-updates@29.0.18 vs `~29.0.19` patch lag. Same conditions as the previous three OTAs which shipped clean; not release-blockers |

## Decision

OTA on runtime `0.1.1`. Every changed file since the previous OTA is
JS/TS — new notification-detail modal screen, TopBar right-slot
layout tweak, notifications SafeAreaView edges fix, BusinessCard row
sizing, and the mobile phone/WhatsApp formatting helper. No native
modules, no plugin edits, no permission changes, no Expo SDK bump.
Fits the "yes — OTA" row of the decision table.

## Payload (mobile-affecting commits since last OTA)

| Commit | Scope | What |
|---|---|---|
| `cd68a28` | mobile | Notification detail modal at `/account/notification/[id]` — reads from useNotifications cache, never depends on a downstream post/business fetch; TopBar right slot switched to `minWidth: SLOT_WIDTH` + `paddingHorizontal: 12` so text actions ("Read all") don't clip; Home tab `headerTitleStyle.fontSize: 20` for parity with the JS-rendered TopBar after Option A |
| `6b03a5a` | mobile | Notifications list `<SafeAreaView>` now `edges={["bottom"]}` — was defaulting to all edges and doubling `insets.top` with TopBar's own inset (~100pt vs every other screen's ~50pt) |
| `7f3b3a6` | mobile | Notification modal now read-only — dropped "View Post" CTA + its route/label helpers per user; sheet is cleaner and skips the extra tap that could have dead-ended on the same visibility filter |
| `bcfb060` | mobile | BusinessCard second row: category + AIRA Stars label rendered at fontSize 12 (was 14 from Option A) so both fit alongside the Sponsored chip in the actions column without clipping the Stars label |
| `f4bce65` | mobile | AIRA Stars label kept its semibold weight after `bcfb060` (deliberate emphasis) — only the size reduction stayed |
| `578e635` | mobile | New `apps/mobile/lib/format-phone.ts` mirrors the web helper (formatUSPhone / formatUSPhoneWithCode / formatUSPhoneTel + formatWhatsappDigits). ContactCard displays `+1 404-555-1234` for Phone + WhatsApp rows; tap targets route through `tel:+14045551234` (canonical E.164) and `wa.me/14045551234` (leading `1` prepended — bare 10 digits previously would have sent WhatsApp to Romania, country code 4). Same fix in SocialIcons compact strip on BusinessCard |

Non-mobile commits since last OTA: only Replit's `18ef81e` deployment auto-commit (cache + doc noise, no source).

## Execution log

- `bash resolve-config.sh` — gate `hasExpo: true`, policy `appVersion`, channels `production` + `preview`.
- `pnpm dlx expo-doctor` from `apps/mobile/` — 15/18 pass, 3 pre-existing findings (see Preflight table).
- `git log --oneline bd6451f..HEAD` — 7 commits (6 mobile-affecting + 1 Replit auto-commit); mobile touches spread over 9 files including the new `notification/[id].tsx` and `lib/format-phone.ts`.
- `git diff --name-only bd6451f..HEAD -- apps/mobile/app.config.ts apps/mobile/package.json apps/mobile/assets/ 'packages/*/package.json'` — empty output, native surface untouched.
- `EAS_PROJECT_ID=… pnpm dlx eas-cli whoami` — auth confirmed `vinod@millionlabs.co.uk`.
- User confirmed straight-to-production channel (matches previous release pattern).
- `EAS_PROJECT_ID=… pnpm dlx eas-cli update --branch production --message "notifications modal + phone formatting + card polish"` from `apps/mobile/` — ran with fingerprint recompute (same "taking longer than expected" notice as the prior run). Published as group `a9b22e75-b112-4d70-8b93-59afe3064252`.

## Sources

- EAS docs — Runtime Version + appVersion policy: https://docs.expo.dev/eas-update/runtime-versions/ — carried from prior release (checked 2026-07-22; unchanged).

## Follow-ups

- **Monitor manually** — `expo.monitoring` is still `none`. Watch informal channels for the next few hours. Rollback if any user reports app-broken behavior; the prior known-good group `e75915d0-04d1-42a5-9507-d55dc39cd523` (the OTA earlier today) is the target for `eas update:republish`.
- **Verify the notification modal on-device** — first release of the new `/account/notification/[id]` screen. Focus on: modal presentation feel, "Read all" text button not clipping, `+1` display on Phone/WhatsApp in ContactCard, tap-to-call routing to a US number correctly.
- **Post-not-found follow-up** (carried from prior release) — with the notification modal now decoupled from the post fetch, this is less visible to users but the underlying visibility bug in `usePost(id)` still needs investigation. Adds a UX quality issue for anyone who then does navigate to a post whose fetch fails.
- **Consolidate format-phone helpers** — mobile now has `apps/mobile/lib/format-phone.ts` duplicated from `apps/web/src/lib/format-phone.ts`. Move to a shared package (`@aira/formatters`? existing `@aira/config`?) once a third consumer needs the same rule.
- **Doctor's 3 findings** — pre-existing across four OTAs now; carry into the next backlog cleanup (expo/expo-updates patch bump + react dedupe).
- **Wire Sentry** (open across the last three releases) — still not wired. Manual eyes-on stays the only signal until it lands.

## Rollback path

If a regression surfaces, republish the last known-good group:

```
cd apps/mobile
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update:republish --branch production \
  --group e75915d0-04d1-42a5-9507-d55dc39cd523
```

Verify the exact CLI syntax against live docs before running — the rollback subcommand has changed between CLI versions.
