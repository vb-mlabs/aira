# Release — ota (shipped) 2026-07-24 21:45

**App:** AIRA (`com.airabynisarga.app`) · **Platform:** both · **Channel/profile:** production
**Mode:** ota
**Status:** shipped
**Versions:** version `0.1.1` · runtime `0.1.1`
**Commit:** `8f15319` (tip; Expo checkpoint marker `*` in output)
**Update group ID:** `73616d91-9db9-4b14-bb64-a90b90832abe`
**iOS update ID:** `019f94e0-20b7-79a3-a4a2-3be7fa6b96d6`
**Android update ID:** `019f94e0-20b7-7d2a-93ac-3464630147c9`
**Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/73616d91-9db9-4b14-bb64-a90b90832abe

## Preflight

| Check | Result | Evidence |
|---|---|---|
| EAS auth | ✅ pass | `vinod@millionlabs.co.uk` (unchanged from prior OTAs today) |
| Git state | ✅ pass | Tree clean apart from `.claude/*` + `.expo/*` cache noise + TODOS.md (backlog auto-updates from prior OTAs) + prior release report + 2 untracked screenshots |
| Native-diff since last OTA (`a9b22e75` / tip `578e635`) | ✅ pass | 6 mobile files touched (5 modified + 1 new `apps/mobile/lib/nav/goBackTo.ts`). Zero changes to `app.config.ts`, `apps/mobile/package.json`, `apps/mobile/assets/`, or any `packages/*/package.json` |
| Runtime version coherence | ✅ pass | Repo `version: "0.1.1"` in `app.config.ts` == store build 8 runtime `0.1.1` (iOS + Android, submitted 2026-07-14) |
| expo-doctor | ⚠️ 3 pre-existing findings | metro monorepo override (intentional); react duplicate 19.1.0 + 19.2.4 (transitive via use-sync-external-store); expo@54.0.35 vs `~54.0.36` and expo-updates@29.0.18 vs `~29.0.19` patch lag. 5th OTA carrying these; not release-blockers |

## Decision

OTA on runtime `0.1.1`. Every changed file since the previous OTA is
JS/TS — a nav helper split, drawer type-size tweak, and BusinessCard
layout adjustments. No native modules, no plugin edits, no permission
changes. Fits the "yes — OTA" row of the decision table.

## Payload (mobile-affecting commits since last OTA)

| Commit | Scope | What |
|---|---|---|
| `aa1d38c` | mobile | Biz-detail bottom Go-back button rewritten as plain Pressable — the shared `<Button>` primitive wraps children in a `<Text>`, and passing `[<Icon />, "  Go back"]` nested the icon in Text on the tap target; real devices swallowed the tap so onPress never fired |
| `cf3839a` | mobile | BusinessCard second row split — category on its own line, AIRA Stars + rating pill on the next. Prior single-row layout clipped the pill on sponsored cards |
| `4b363f3` | mobile | BusinessCard business name bumped from `text-base` (18) → `text-lg` (20). Applies to Home featured, Listings tab, Categories screen |
| `0ae21ce` | mobile | Cross-tab back navigation fix — `router.dismissTo(from)` only walks the CURRENT stack; from-Home push to biz-detail crosses into the hidden listings tab so `from = "/"` was unreachable and dismissTo failed silently. New `apps/mobile/lib/nav/goBackTo.ts` splits on target shape: tab-root paths use `router.replace` (tab-registry resolve), nested paths use `dismissTo`. BackButton, biz-detail Go back, and useOriginAwareBack (OS gestures) all delegate to the same helper |
| `8f15319` | mobile | Drawer sub-category rows (Restaurants, Specialty Food, etc.) bumped from fontSize 14 → 16 to match DrawerRow + CategoryGroup labels. Active-bg tint + leading bullet already carry the hierarchy |

Non-mobile commits since last OTA: none — this OTA is pure mobile.

## Execution log

- `bash resolve-config.sh` — gate `hasExpo: true`, policy `appVersion`, channels `production` + `preview`.
- `pnpm dlx expo-doctor` from `apps/mobile/` — 15/18 pass, 3 pre-existing findings (see Preflight table).
- `git log --oneline 578e635..HEAD` — 5 commits, all mobile.
- `git diff --name-only 578e635..HEAD -- apps/mobile/app.config.ts apps/mobile/package.json apps/mobile/assets/ 'packages/*/package.json'` — empty output, native surface untouched.
- User confirmed straight-to-production channel (matches prior release pattern; 4th OTA today at this cadence).
- `EAS_PROJECT_ID=… pnpm dlx eas-cli update --branch production --message "back-nav fix + card + drawer polish"` from `apps/mobile/` — ran with fingerprint recompute (same "taking longer than expected" notice; consistent across all recent runs). Published as group `73616d91-9db9-4b14-bb64-a90b90832abe`.

## Sources

- EAS docs — Runtime Version + appVersion policy: https://docs.expo.dev/eas-update/runtime-versions/ — carried from prior release (checked 2026-07-22; unchanged).

## Follow-ups

- **Monitor manually** — `expo.monitoring` is still `none`. Watch informal channels for the next few hours. Prior known-good group is `a9b22e75-b112-4d70-8b93-59afe3064252` (the OTA earlier this evening); use it as the rollback target if needed.
- **Verify the cross-tab back fix on-device** — highest-signal item in this OTA. Reproduce: Home → tap featured business → arrow-left tap in TopBar. Should return to Home. Also test bottom "Go back" from the same screen. Second sub-scenario: Categories → subcategory → biz card → back should return to the subcategory (nested-path branch of `goBackTo`).
- **`useOriginAwareBack` still installed** — the interceptor now delegates to `goBackTo` too, so OS gestures should route consistently. If the modal-presentation `/post/[id]` or `/account/notification/[id]` still exhibits any back weirdness, revisit whether the interceptor is still needed with `goBackTo` in place.
- **Post-not-found follow-up** (carried since 2026-07-24 09:21) — no change; still open. The notification modal decouples users from the failure but the underlying `usePost(id)` visibility issue persists.
- **Consolidate format-phone helpers** (carried from 18:32) — still 2 copies (mobile + web).
- **Doctor's 3 findings** — pre-existing across five OTAs now.
- **Wire Sentry** — still not wired. Manual eyes-on stays the only signal.

## Rollback path

If a regression surfaces, republish the last known-good group:

```
cd apps/mobile
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update:republish --branch production \
  --group a9b22e75-b112-4d70-8b93-59afe3064252
```

Verify the exact CLI syntax against live docs before running — the rollback subcommand has changed between CLI versions.
