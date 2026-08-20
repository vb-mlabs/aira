# Fix — Legal links from app open a parking-host 404 (`airabynisarga-com.l.ink`)

**Started:** 2026-08-20 12:11
**Source:** user-report
**Status:** fixed (iOS) / interim (Android — native fix pending, already tracked)
**Commit:** 3f403ce

## Symptom / repro

User reported: tapping a legal link from the mobile app (e.g. Legal &
Policies → "Terms of Use") opens
`https://airabynisarga-com.l.ink/legal#terms` in the browser and shows a
generic "404 (002) pixie proxy" page instead of the AIRA `/legal` page.

Reproduced with `curl`:

```
$ curl -sI https://airabynisarga.com/legal    → HTTP/2 200 (apex works)
$ curl -sI https://www.airabynisarga.com/legal → HTTP/2 302
  location: https://airabynisarga-com.l.ink/legal   ← the reported 404
```

## Root cause

`apps/mobile/lib/external-web-url.ts` unconditionally rewrote apex →
`www.` on every outbound `airabynisarga.com` URL before handing it to
`Linking.openURL`. That workaround was added on 2026-08-04 to escape the
Android intent filter (which has no `pathPrefix`, so `autoVerify` + the
`handle_all_urls` assetlinks match every apex URL and bounce them back
into the app as "unmatched routes").

The workaround assumed `www.airabynisarga.com` would 301 back to apex
via the redirect declared in `apps/web/next.config.mjs`. In reality the
redirect is dormant — the comment above it (`next.config.mjs:103–108`)
says it "activates the moment DNS for www.airabynisarga.com points at
our origin." Right now `www.` DNS resolves to a third-party parking host
(`airabynisarga-com.l.ink`) that 302s every path to a generic 404. So
every legal link, on both platforms, walked apex → www → parking → 404.

iOS never needed the rewrite. AASA
(`apps/web/public/.well-known/apple-app-site-association`) claims only
`/verify*` and `/reset-password*` on the apex host, so Safari opens
every other `airabynisarga.com/*` URL in-browser without app
interception. The rewrite was *actively breaking* iOS.

## Fix

`apps/mobile/lib/external-web-url.ts` — platform-guard the helper: no-op
on iOS (`Platform.OS !== "android"` → return input unchanged), keep the
existing `www` rewrite on Android as the interim behavior. Comment
rewritten to reflect actual reality (dormant 301, parking-host DNS,
tracked native follow-up).

Callers unchanged — the four screens (`account/about.tsx`,
`account/index.tsx`, `account/privacy-security.tsx`, `account/terms.tsx`)
keep calling `externalWebUrl(...)` and get the correct behavior per
platform.

## Evidence

- Repro re-run (URL semantics unchanged; the fix moves iOS off the www
  path entirely, so iOS now hits the 200 branch):
  - `curl -sI https://airabynisarga.com/legal` → HTTP/2 200 ✓ (iOS
    target after fix)
  - `curl -sI https://www.airabynisarga.com/legal` → HTTP/2 302 →
    `airabynisarga-com.l.ink/legal` (unchanged; Android still hits this
    until the native intent-filter fix ships).
- `pnpm --filter @aira/mobile exec tsc --noEmit` → EXIT=0.
- No touched-code test file exists (`find apps/mobile -name
  '*external-web-url*'` returns only the source file).
- No styles or design tokens touched — drift check n/a.

## Android status (interim, not part of this fix)

Android still calls `externalWebUrl` → `www.` → parking 404. Removing
the rewrite on Android would swap the parking 404 for an in-app
"unmatched routes" screen — different broken state, no better UX.

The real Android fix is the native intent-filter `pathPrefix`
restriction, already tracked in `TODOS.md` line 183 as a HIGH item
under "[next EAS native build]" (added 2026-08-04 with the original
hotfix). Once that ships, this helper can be deleted entirely and every
screen can call `Linking.openURL(brand.url + "/...")` directly.

Same-day mitigations available without a code change (either would
un-break Android on the current build):

1. Repoint `www.airabynisarga.com` DNS at our Next.js origin. The 301
   in `next.config.mjs` activates immediately, `www → apex` works, and
   the existing Android rewrite starts doing what it was designed to do.
2. Ship the native `pathPrefix` change in the next EAS build (proper
   long-term fix, deletes this helper).

## OTA delivery

Published to production via `eas update` on 2026-08-20:

- Group ID: `7011d5e6-a2a6-49ff-aae2-110cdbcc0f33`
- Runtime: `0.1.2` (matches store build 10 on both platforms)
- Platforms: android + ios
- Commit: `3f403ce`
- Dashboard: https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/7011d5e6-a2a6-49ff-aae2-110cdbcc0f33

Rollback: republish the prior group
`a8071734-0060-4f74-b1dd-ffc4b3705651` (the notifications-banner OTA).

## Follow-ups

- None new — TODOS.md line 183 already covers the native fix. The plan
  doc `.mstack/plans/2026-06-29-universal-link-followups.md` also
  covers the `www.` DNS / redirect story.
