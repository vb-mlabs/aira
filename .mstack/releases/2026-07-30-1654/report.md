# Release — ota 2026-07-30 16:54

**App:** aira-mobile · **Platform:** both (iOS + Android) · **Channel:** production
**Mode:** ota
**Status:** shipped
**Versions:** version 0.1.1 · runtimeVersion 0.1.1 (policy: appVersion)
**Commit:** `86fa7fc` (pushed to `origin/feat/business-logo`)
**Update group:** `57b01169-bf78-443e-922d-209e6f099a18`
**Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/57b01169-bf78-443e-922d-209e6f099a18
**Update IDs:** iOS `019fb3f2-90c5-7606-ab01-c6d320a15b46` · Android `019fb3f2-90c5-7e16-9117-3e4178c971cb`

## Scope

Single commit `86fa7fc`: check-email button label reflects reality on Android.

User reported that "Open Mail" on Android opens Gmail *web* in the browser instead of the Gmail app.

Verified against React Native SDK 54 source that JS-only cannot launch a specific Android app:
- `Linking.openURL` uses `Uri.parse(url)` (not `Intent.parseUri(url, Intent.URI_INTENT_SCHEME)`), so `intent://…` URIs don't resolve.
- `Linking.sendIntent` takes an action string but has no JS API for `setPackage()` or `addCategory()`.
- `expo-linking` doesn't override either.

Real fix needs `expo-intent-launcher` (native module) — deferred to next EAS build.

## Changes

- **Android candidate list** in `openMail` becomes `[]`. The previous `["googlegmail://"]` was a wrong assertion (that scheme is iOS-only) and always threw + fell through. Explicit empty array documents that no JS-only scheme works on Android and we go straight to `https://mail.google.com`.
- **Platform-conditional button label**:
  - iOS: `"Open Mail"` (Apple Mail is still OS default, fallback chain tries it first)
  - Android: `"Open Gmail"` (honest about the destination since we're going to Gmail web in a browser)
- Extensive comment refresh in `openMail` documenting the RN limitation.

## Preflight

| Check | Result |
|---|---|
| Git state | pass — pushed at `86fa7fc` |
| Versioning | pass — version 0.1.1, runtimeVersion policy `appVersion`, matches native build 8 |
| Native-diff since native build 8 | pass — JS only |
| Typecheck | pass |

## Decision

OTA — JS/copy only.

## Execution log

- Committed `86fa7fc`; lefthook contrast + migration checks passed.
- Pushed `feat/business-logo` to origin.
- Published to production channel from `apps/mobile/`.
- Update group `57b01169` uploaded to iOS + Android, runtime 0.1.1.

## Follow-ups

- **[HIGH]** Bundle `expo-intent-launcher` into next native build (0.1.2) and wire Android Open-Mail to `CATEGORY_APP_EMAIL` intent — this is the actual fix, currently blocked by needing a native rebuild.
- **[MED]** Once expo-intent-launcher is in, revisit the button label on Android — probably back to "Open Mail" since we'd actually be opening the mail app of user's choice.
- **[LOW]** No further OTA-eligible optimization for this button. Any further improvement needs the native module.

## Sources

- Verified against `node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/intent/IntentModule.kt` (RN SDK 54)
- Verified against `node_modules/expo-linking/build/Linking.js` (delegates to RNLinking, no override)
- expo-linking's own docstring on `sendIntent`: "Use `expo-intent-launcher` instead. `sendIntent` is only included in Linking for API compatibility with React Native's Linking API."
