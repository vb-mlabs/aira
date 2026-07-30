# Release — ota 2026-07-30 16:28

**App:** aira-mobile · **Platform:** both (iOS + Android) · **Channel:** production
**Mode:** ota
**Status:** shipped
**Versions:** version 0.1.1 · runtimeVersion 0.1.1 (policy: appVersion)
**Commit:** `3d73e8b` (pushed to `origin/feat/business-logo`)
**Update group:** `0e25904b-ab66-4cb0-94a1-ae3658cd8d19`
**Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/0e25904b-ab66-4cb0-94a1-ae3658cd8d19
**Update IDs:** iOS `019fb3da-ca5f-7779-a6a1-b4708e317b3d` · Android `019fb3da-ca5f-72d6-99cd-ad7d0e59d9e1`

## Scope

Single commit `3d73e8b`: `credentials:"omit"` on all 5 mobile fetch sites.

## Root cause (finally, with evidence)

Fourth-recurrence sign-out no-op — CONFIRMED via `auth-debug` server logging from the previous web publish. Log line captured 2026-07-30 21:52 IST:

```
auth-debug get-session
{
  path: '/api/auth/get-session',
  transport: {
    bearer: null,           ← SecureStore cleared correctly
    cookieAny: true,
    cookieSession: true,    ← session cookie STILL being sent
    xClient: 'mobile',
    ua: 'AIRA/8 CFNetwork/3860.600.21 Darwin/25.5.0'  ← iOS build 8
  }
}
```

iOS's NSURLSession shared cookie jar auto-persists cookies from any server response with `Set-Cookie`. Better Auth's sign-in response includes `Set-Cookie: better-auth.session_token=...` (used by web; ignored by mobile which uses bearer). iOS stores it silently. `clearTokens()` wipes SecureStore but has no access to the OS cookie jar. On cold-boot after `Updates.reloadAsync()`, `meRequest` hits `/api/auth/get-session` with no bearer (correctly cleared) BUT with the cached cookie (invisibly attached), and Better Auth returns the still-valid session → gate routes to `/(app)` → "sign-out doesn't work".

Previous fix attempts each layered a mechanism onto the failure chain (better cache invalidation, imperative router.replace, Updates.reloadAsync). None could reach the OS cookie jar, so none could fix the actual cause.

## The fix

`credentials: "omit"` on every mobile fetch. Tells RN to skip the cookie jar in both directions:
- outgoing requests carry no `Cookie` header (even if cookies exist in the jar)
- incoming `Set-Cookie` responses are ignored (no new cookies get stored)

Mobile has always been bearer-only. Cookies were pure collateral damage from Better Auth's `Set-Cookie` being interpreted by iOS's URL loader without our knowledge.

## Preflight

| Check | Result |
|---|---|
| Git state | pass — pushed at `3d73e8b` |
| Versioning | pass — version 0.1.1, runtimeVersion policy `appVersion`, matches native build 8 |
| Native-diff since native build 8 | pass — only JS changes in commit |
| Full mobile typecheck | pass |

## Decision

OTA — JS-only. No native module, no plugin change.

## Execution log

- Committed `3d73e8b`; lefthook contrast + migrations checks passed.
- Pushed `feat/business-logo` to origin.
- Published to production channel from `apps/mobile/` with `EAS_PROJECT_ID` env var (per CLAUDE.md runbook).
- Update group `0e25904b` uploaded to iOS + Android, runtime 0.1.1.

## Verification path

User needs to:
1. Force-close the app fully (swipe from recents)
2. Reopen (Launch 1: downloads new bundle in background, runs old)
3. Force-close again
4. Reopen (Launch 2: new bundle active)
5. Sign in fresh
6. Sign out — should land on welcome screen and STAY there
7. Reopen app — should show welcome, not home

Server-side confirmation: look for `auth-debug get-session` line in server logs after the user reproduces. Should now show `cookieSession: false`.

## Sources

- `.mstack/fixes/2026-07-14-mobile-signout-modal-noop.md` — Round 2 (closed as "old bundle")
- `.mstack/releases/2026-07-29-0856/report.md` — Round 3 fix (router.replace)
- `.mstack/releases/2026-07-30-1517/report.md` — Nuclear-option fix (Updates.reloadAsync)
- This release — Round 4, first fix with evidence backing it

## Follow-ups

- **Remove the auth-debug logging** after user confirms sign-out is fixed. Log lines in `apps/web/src/app/api/auth/[...all]/route.ts` — search for `auth-debug`. Backlogged.
- **Sanity check Android sign-out** — Android's OkHttp does NOT have a shared cookie jar by default, so Android was likely already working. `credentials: "omit"` is a no-op there but harmless.
- **When the next native build ships** (any future `eas build`), consider whether to keep `Updates.reloadAsync()` on sign-out. Nuclear-option is still architecturally cleaner even with the cookie fix; keep it as belt-and-braces.
- Update CLAUDE.md's "Current runtime in the field" to reference this OTA (`0e25904b`, 2026-07-30 16:28 UTC).
