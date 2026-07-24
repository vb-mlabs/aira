# Release — ota (shipped) 2026-07-24 15:47

**App:** AIRA (`com.airabynisarga.app`) · **Platform:** both · **Channel/profile:** production
**Mode:** ota
**Status:** shipped
**Versions:** version `0.1.1` · runtime `0.1.1`
**Commit:** `bd6451f` (tip; Expo checkpoint marker `*` in output)
**Update group ID:** `e75915d0-04d1-42a5-9507-d55dc39cd523`
**iOS update ID:** `019f9436-1168-7c2c-9449-2dfbbe4575b6`
**Android update ID:** `019f9436-1168-797c-81c3-c19c56f33137`
**Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/e75915d0-04d1-42a5-9507-d55dc39cd523

## Preflight

| Check | Result | Evidence |
|---|---|---|
| EAS auth | ✅ pass | `vinod@millionlabs.co.uk` (accounts: vb-mlabs owner, million-labs developer) |
| Git state | ✅ pass | Tree clean apart from `.claude/*` and `.expo/*` cache noise + one untracked screenshot; no uncommitted source |
| Native-diff since last OTA (`0be52a62` / tip `a8a5658`) | ✅ pass | 5 mobile files + `.claude/.last-update-result.json` + release-report doc. Zero changes to `app.config.ts`, `apps/mobile/package.json`, `apps/mobile/assets/`, or any `packages/*/package.json` |
| Runtime version coherence | ✅ pass | Repo `version: "0.1.1"` in `app.config.ts` == store build 8 runtime `0.1.1` (iOS + Android, submitted 2026-07-14) |
| expo-doctor | ⚠️ 3 pre-existing findings | metro monorepo override (intentional); react duplicate 19.1.0 + 19.2.4 (transitive via use-sync-external-store); expo@54.0.35 vs `~54.0.36` and expo-updates@29.0.18 vs `~29.0.19` patch lag. Same conditions as the two previous OTAs which shipped clean; not release-blockers |

## Decision

OTA on runtime `0.1.1`. Every changed file since the previous OTA is
JS/TS or generated config — no native modules, no plugin edits, no
permission changes, no Expo SDK bump. Fits the "yes — OTA" row of
the decision table.

## Payload (mobile-affecting commits since last OTA)

| Commit | Scope | What |
|---|---|---|
| `8ddd1ff` | mobile | Notifications: `Mark all read` swapped from clipping text to `check-all` icon (WhatsApp/Gmail double-check convention); row padding bumped to `px-5 py-4` with `mb-1 px-5` under section headers; `/post/[id]` now presents as `presentation: "modal"` so both the community-board tap and notification tap open the post as a sheet |
| `bd6451f` | mobile | Ten hardcoded `fontSize:` values in the chrome bumped one step to align with the Option A type scale: TopBar title `17 → 20`; tab labels `12 → 14`; tab glyphs `22 → 24`; drawer wordmark `24 → 30`; drawer tagline / footer `12 → 14`; "Contact Us" `16 → 18`; DrawerRow labels `14 → 16`; CategoryGroup roots `14 → 16`; sub-category rows `12 → 14`. NotificationBell badge (12 inside 16pt circle) and drawer close ✕ glyph deliberately untouched |

Non-mobile commits since last OTA (`01ddd53`, `3f00822`, `f858153`
web-only phone/URL fixes, plus the Replit `ac30f3e` deployment
auto-commit and docs housekeeping) don't change mobile behavior and
bundle transparently.

## Execution log

- `bash resolve-config.sh` — gate `hasExpo: true`, policy `appVersion`, channels `production` + `preview`.
- `pnpm dlx expo-doctor` — 15/18 pass, 3 pre-existing findings (see Preflight table).
- `git log --oneline a8a5658..HEAD` — 6 commits (5 in the payload + 1 Replit auto-commit); mobile touches confined to 5 files.
- `git diff --name-only a8a5658..HEAD -- apps/mobile/app.config.ts apps/mobile/package.json apps/mobile/assets/ 'packages/*/package.json'` — empty output, native surface untouched.
- `EAS_PROJECT_ID=… pnpm dlx eas-cli whoami` — auth confirmed `vinod@millionlabs.co.uk`.
- User confirmed straight-to-production channel (matches previous release pattern).
- `EAS_PROJECT_ID=… pnpm dlx eas-cli update --branch production --message "notifications UI polish + chrome font-size bumps"` from `apps/mobile/` — ran with fingerprint recompute (slower than typical, one "taking longer than expected" notice). Published as group `e75915d0-04d1-42a5-9507-d55dc39cd523`.

## Sources

- EAS docs — Runtime Version + appVersion policy: https://docs.expo.dev/eas-update/runtime-versions/ — carried from prior release (checked 2026-07-22; unchanged).

## Follow-ups

- **Monitor manually** — `expo.monitoring` is still `none`. Watch informal channels for the next few hours. Rollback if any user reports app-broken behavior; the prior known-good group `0be52a62-e88b-4d50-b654-210642c7603e` (the earlier OTA today) is the target for `eas update:republish`.
- **Verify on-device that the modal presentation feels right** — commit `8ddd1ff` sets `presentation: "modal"` on `/post/[id]`. Community-board tap AND notifications tap both open as sheets now. Cross-tab context is preserved by the modal presentation but the underlying push still hits the Post tab's stack; if a user reports feeling "dropped into Post tab" on modal dismiss, revisit whether a top-level modal group is the better shape.
- **Post-not-found follow-up** — notifications tap → some comment-reply notifications land on the `!post` empty state in `apps/mobile/app/(app)/post/[id].tsx:46`. `usePost(id)` returns null for those IDs. Needs an investigation of whether the notification's `post_id` references something the current user can't fetch (visibility/status).
- **Doctor's 3 findings** — pre-existing; still not resolved (expo/expo-updates patch bump + react dedupe). Roll into the next backlog cleanup.
- **Wire Sentry** (open from prior release) — `@sentry/react-native` via Expo config plugin still not wired. Manual eyes-on stays the only signal until it lands.

## Rollback path

If a regression surfaces, republish the last known-good group:

```
cd apps/mobile
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update:republish --branch production \
  --group 0be52a62-e88b-4d50-b654-210642c7603e
```

Verify the exact CLI syntax against live docs before running — the rollback subcommand has changed between CLI versions.
