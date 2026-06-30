# Plan: Universal-link verification follow-ups

**Date:** 2026-06-29
**Slug:** 2026-06-29-universal-link-followups
**Status:** implemented
**Author:** Claude (Opus 4.7) via `/mlabs-plan`

---

## Problem

`airabynisarga.com` is now live and resolving to the Replit deploy. Apple's
swcd CDN has already cached our AASA correctly (verified
2026-06-29 against `app-site-association.cdn-apple.com/a/v1/airabynisarga.com`),
so iOS Universal Links work end-to-end for `/verify*` + `/reset-password*`
paths. Three rough edges remain that will bite during S7 store submissions
+ F25 deep-link wiring if we don't address them now:

1. **AASA is served with the wrong MIME** (`application/octet-stream`).
   Replit's static-file layer bypasses the Next.js route handler that was
   designed to set `application/json` + a 5-min cache. Apple is currently
   lenient about this, but it's dead code masquerading as a safety net.
2. **`www.airabynisarga.com` resolves to an unrelated `airabynisarga-com.l.ink`
   parking host.** Any outbound link that ever drifts to `www.` will fail to
   trigger Universal Links AND will land users on a stranger's site. Today
   the code is clean (apex everywhere), but there's no machine-checkable
   guard preventing future drift.
3. **`assetlinks.json` still has the literal `{{ANDROID_CERT_SHA256}}`
   placeholder.** Android App Links autoVerify is broken — every install on
   real devices will see the disambiguator chooser instead of opening the
   app directly. This is the last open universal-link item in roadmap S0.

Who benefits: future-me running the EAS prod rebuild + store submissions
sprint. The wedge is **"Universal Links work on real devices on day-1, with
no surprise debugging in the S7 critical path."**

## Scope

**In:**
- Replace the AASA content-type bypass with a `headers()` rule in
  `apps/web/next.config.mjs` covering `/.well-known/:path*`. Delete the
  now-unused route handler at `apps/web/src/app/.well-known/[file]/route.ts`.
- Add a `redirects()` rule in `next.config.mjs` for `www.airabynisarga.com/*`
  → `airabynisarga.com/*` (301). Document the canonical-apex rule in
  CLAUDE.md so future code/copy/email templates don't drift to `www.`.
- Replace `{{ANDROID_CERT_SHA256}}` in
  `apps/web/public/.well-known/assetlinks.json` with the real App Signing
  key SHA-256 fingerprint (captured from Play Console → Setup →
  App integrity → App signing → "App signing key certificate").
- Update `roadmap.md` S0 status: mark the Android SHA-256 item ✅ and add
  the AASA + www redirect items to the ship log.

**Out (deferred):**
- AASA `paths` widening for F25 deep-link surfaces (`/listings/*`,
  `/community/*`, etc.). Deferred to F25 itself — widening the paths
  without mobile-side route handlers would let iOS cold-start links into
  screens that error. F25 ships the catchers + the paths array edit in
  the same plan, with one EAS rebuild covering both.
- DNS work to point `www.airabynisarga.com` at the Replit deploy.
  Whether that's needed depends on whether the registrar zone is under our
  control (see Open questions). The `redirects()` rule in `next.config.mjs`
  only fires for requests that actually reach our origin — if DNS for `www`
  stays pointed at the parking host, the redirect rule never executes and
  the parking host keeps winning. We accept this as a follow-up: the
  redirect rule + CLAUDE.md guard is correct code; the DNS fix is a one-line
  Replit/registrar change that doesn't need engineering.
- Upload-key SHA-256 alongside the App Signing key. Play App Signing is
  enabled (per the EAS init runbook) so the App Signing key is the only
  cert end-users see; the upload key only matters for sideloaded internal
  APKs, which we don't do. Add a second fingerprint later if QA ever
  sideloads pre-Play builds.
- AASA `webcredentials` audit — already correct (verified against
  `webcredentials.apps[]` = `C529274M9Y.com.airabynisarga.app`).
- iOS Associated Domains entitlement verification on a real device. That's
  an EAS production rebuild + TestFlight install task in S7, not this plan.
- Any actual mobile-side deep-link routing. F25.

## Approach

Four atomic edits across three files, plus one CLAUDE.md docs touch and one
roadmap.md status flip.

**1. AASA content-type fix.** Add a `headers()` async function to
`next.config.mjs` returning a single rule:

```ts
{
  source: "/.well-known/:path*",
  headers: [
    { key: "content-type", value: "application/json" },
    { key: "cache-control", value: "public, max-age=300, s-maxage=300" },
  ],
}
```

Next.js applies `headers()` *before* falling through to static `/public`
serving, so this overrides Replit's `application/octet-stream` default
without us needing to move the file. After verifying the response in prod
(`curl -I https://airabynisarga.com/.well-known/apple-app-site-association`
returns `content-type: application/json`), delete
`apps/web/src/app/.well-known/[file]/route.ts` — it was the failed earlier
attempt at this fix and is now dead code that's actively confusing.

**Why not the alternative** (move files out of /public so the route handler
runs): it works but is more surgery for the same outcome; the headers rule
is one config block versus a file move plus a handler we'd then need to
keep maintained. Smallest diff wins here because none of this code is
load-bearing for user-visible behavior — it only needs to be correct for
Apple's swcd + Google's verifier, both of which fetch infrequently.

**Why not "leave alone"** (swcd accepted it anyway): the route handler is
dead code in prod and the next person who reads it will assume it's load-
bearing. Either it does the job or it doesn't exist; "design + bypass" is
the worst of both worlds.

**2. www. → apex redirect.** Add a `redirects()` async function to
`next.config.mjs`:

```ts
{
  source: "/:path*",
  has: [{ type: "host", value: "www.airabynisarga.com" }],
  destination: "https://airabynisarga.com/:path*",
  permanent: true,
}
```

Pair this with a one-paragraph addition to CLAUDE.md under "Conventions"
noting that **all outbound URLs use the apex** (`brand.url` =
`https://airabynisarga.com`, no `www.`). The current code is clean (verified
via grep across `packages/email/src`, `packages/config/src`,
`apps/web/src`, `apps/mobile/`), so the CLAUDE.md note is preventive — it
catches the case where someone hand-types a URL into an email template
or marketing copy and reaches for `www.` out of habit.

**Why not also widen the mobile config** to include
`applinks:www.airabynisarga.com`: doubles the .well-known verification
surface for no user benefit. The right answer is one canonical hostname.

**Why this still helps even if DNS for `www` stays pointed at the parking
host**: the moment DNS points at us (which we should do anyway as cleanup),
the redirect rule kicks in automatically and we never need to remember it
again.

**3. Android SHA-256 paste.** Manual ops step gated on capturing the
fingerprint from Play Console. The `apps/web/public/.well-known/assetlinks.json`
file is currently:

```json
{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.airabynisarga.app",
    "sha256_cert_fingerprints": ["{{ANDROID_CERT_SHA256}}"]
  }
}
```

Replace the placeholder with the real fingerprint (uppercase hex with
colons, e.g. `"14:6D:E9:..."`) from Play Console → Setup → App integrity →
App signing → "App signing key certificate" → SHA-256 fingerprint. Single
JSON edit + commit + redeploy.

Verification: Google's Statement List Tester at
`https://developers.google.com/digital-asset-links/tools/generator` will
report green once the file is live and the fingerprint matches the
production APK signature.

**4. AASA `paths` widening — deferred to F25.** Documented above under Out.
Mention in the AC that the current narrow paths (`/verify*`,
`/reset-password*`) are correct for today's MVP scope.

## Data model changes

None.

## Files to touch

**New:**
- None.

**Edit:**
- `apps/web/next.config.mjs` — add async `headers()` + async `redirects()`
  functions to the existing default export.
- `apps/web/public/.well-known/assetlinks.json` — replace
  `{{ANDROID_CERT_SHA256}}` with the real App Signing key SHA-256
  fingerprint (gated on Play Console capture).
- `CLAUDE.md` — add a one-paragraph note under "Conventions" locking the
  apex-only rule for outbound URLs. Should reference `brand.url` as the
  source of truth.
- `roadmap.md` — flip the S0 Android SHA-256 status from 🟦 to ✅; add the
  AASA content-type fix + www redirect + CLAUDE.md guard to the
  Post-S6 ship log section.

**Delete:**
- `apps/web/src/app/.well-known/[file]/route.ts` — after verifying the
  `headers()` rule serves AASA with `application/json` in prod. Pre-deletion,
  `git grep` for any test or import referencing `.well-known/[file]` to
  confirm no dangling references (likely none).

## Edge cases

- **Replit's static-file layer might still win over `headers()`.** Next.js's
  documented behavior is that `headers()` applies to any matched route
  including static `/public` files, but this hasn't been verified against
  Replit Reserved VM's specific frontend (Google-fronted, per the `via: 1.1
  google` response header). If the content-type doesn't actually change after
  deploy, fallback is the original "move files out of /public" approach —
  the route handler still exists in this plan until verified-deleted, so
  reverting is cheap.
- **DNS for `www.airabynisarga.com` is currently pointed at a third-party
  parking host** (`airabynisarga-com.l.ink`). The `redirects()` rule only
  fires for requests that reach our origin. Until the DNS is moved, the
  parking host keeps serving www requests. The redirect rule is correct
  code that activates the moment DNS catches up; CLAUDE.md guard is the
  belt for the suspenders.
- **Apple swcd caches AASA for ~1-2 days.** Even with the content-type fix
  live, the previously-cached entry stays valid until Apple re-fetches.
  No-op for users (the cached entry is already correct content), but if we
  ever change the path patterns we'd be on Apple's schedule for re-pickup.
- **Google's Android App Links verifier requires the apex domain to serve
  `assetlinks.json` at exactly `https://airabynisarga.com/.well-known/assetlinks.json`
  with `Content-Type: application/json`** — currently `application/json;
  charset=UTF-8`, which is fine. The `headers()` rule will continue
  serving it correctly post-fix.
- **The `paths` narrowness might surprise someone.** If a curious team
  member tries `https://airabynisarga.com/listings/atlanta-restaurants/foo`
  on iOS expecting it to open the app, they'll get the browser instead.
  This is correct today (F25 mobile half hasn't shipped — there's no
  handler), but a brief comment in the AASA file explaining the narrow
  scope and pointing at F25 would prevent confusion. NB: AASA is JSON
  so comments aren't valid syntax; instead, drop a one-line comment block
  at the top of `apps/web/src/app/.well-known/[file]/route.ts`'s
  replacement... except we're deleting that. Alternative: add the comment
  to the headers rule block in `next.config.mjs` since that's the file
  someone debugging universal-link issues will look at first.
- **The next.config.mjs JSDoc-typed import pattern** means the new
  `headers()` and `redirects()` blocks need to type-check via JSDoc
  inference. Both are well-trodden Next.js APIs; type errors at edit time
  are unlikely but worth verifying with `pnpm typecheck` post-edit.

## Acceptance criteria

- [ ] `curl -sS -I https://airabynisarga.com/.well-known/apple-app-site-association`
  returns `content-type: application/json` and `cache-control: public,
  max-age=300, s-maxage=300`.
- [ ] `curl -sS -I https://airabynisarga.com/.well-known/assetlinks.json`
  returns `content-type: application/json` (charset suffix is acceptable)
  and the same `cache-control` header.
- [ ] `apps/web/public/.well-known/assetlinks.json` contains a real SHA-256
  fingerprint (uppercase hex, colon-separated, 32 segments — pattern
  `^[0-9A-F]{2}(:[0-9A-F]{2}){31}$`) and no `{{ANDROID_CERT_SHA256}}`
  placeholder remains anywhere in the repo (`git grep` clean).
- [ ] Google's Statement List Tester reports green for
  `https://airabynisarga.com` ↔ `com.airabynisarga.app`.
- [ ] `apps/web/src/app/.well-known/[file]/route.ts` is deleted.
- [ ] CLAUDE.md "Conventions" section has a new paragraph locking the
  apex-only outbound URL rule, referencing `brand.url`.
- [ ] `roadmap.md` S0 Android SHA-256 line is ✅ and the universal-link
  cleanup ships are logged.
- [ ] `pnpm typecheck` + `pnpm lint` clean across the monorepo.
- [ ] `curl -sS -I -H "Host: www.airabynisarga.com"
  https://airabynisarga.com/test` returns `301` with `location:
  https://airabynisarga.com/test` (DNS-independent verification that the
  redirect rule is wired correctly inside Next.js).
- [ ] Apple's swcd CDN at
  `https://app-site-association.cdn-apple.com/a/v1/airabynisarga.com`
  continues to return the expected AASA body (no regression — the file
  content isn't changing, only its serving headers).

## Open questions

For `/mlabs-review` to resolve before implementation.

- **DNS control for `www.airabynisarga.com`** — is the registrar zone
  under our control, or is `www` pointing at the parking host because of
  a registrar-default record we haven't touched? If we control the zone,
  the right answer is to add a DNS record (CNAME or A) pointing
  `www.airabynisarga.com` at the Replit deploy so the `redirects()` rule
  actually fires. If we don't, that's a separate ops thread.
- **Capture timing for the Android SHA-256.** Do we have a real Play
  Console "App signing key certificate" SHA-256 in hand right now, or are
  we gated on the first Internal Testing release landing first? If gated,
  this plan ships as three changes (AASA headers + www redirect +
  CLAUDE.md) and the Android paste lands as a one-line follow-up commit
  whenever the fingerprint becomes available. If in-hand, all four ship
  together.
- **Should the AASA narrow-paths rationale be inline-documented?** Either
  a comment block in `next.config.mjs` near the headers rule, or a TODO in
  the F25 plan slot, or both. Mild preference for next.config.mjs since
  that's where someone debugging universal-link issues will look first.
- **Verify the `headers()` override actually beats Replit's static-file
  layer in prod.** This is testable post-deploy with `curl -I`; if it
  doesn't, fall back to the move-files-out-of-/public approach. Should
  the plan pre-commit to the fallback path, or wait and see?
- **Should we audit Postmark sender signatures for `www.` or apex
  mismatch?** Postmark's DKIM/SPF is configured against
  `airabynisarga.com` (apex) per `brand.ts` comment. If the From-address
  on outbound auth/welcome emails is ever `support@www.airabynisarga.com`
  (it shouldn't be), DKIM would fail silently. Probably no-op given the
  code is already apex-clean, but worth a single grep in the review.
