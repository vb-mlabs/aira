# Implementation report: Universal-link verification follow-ups

**Review:** [2026-06-29-universal-link-followups](../../reviews/2026-06-29-universal-link-followups.md)
**Branch:** `feat/qa-test-accounts-seed`
**Status:** complete
**Started:** 2026-06-29 10:35
**Completed:** 2026-06-29 10:55

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| T1 | AASA `headers()` + delete dead route handler | ✓ done | `d6b8c5d` |
| T2 | www → apex 301 redirect | ✓ done | `c7d5b4e` |
| T3 | CLAUDE.md apex-only convention | ✓ done | `749778b` |
| T4 | roadmap.md status flip + ship log | ✓ done | `0e09e03` |

## Commits (chronological)

```
0faa415  fix(web):    surface server validation error on Get Listed form  [prep]
bf37c8b  chore(mstack): universal-link follow-ups plan + review            [prep]
d6b8c5d  chore(web):  serve /.well-known/* with application/json via next.config
c7d5b4e  chore(web):  301 redirect www.airabynisarga.com → apex via next.config
749778b  docs(claude): lock apex-only outbound URL convention
0e09e03  docs(roadmap): flip S0 status for domain + universal-link follow-ups
```

The two `[prep]` commits are pre-task-loop housekeeping (committing the
unrelated Get Listed form fix from earlier in the session + the plan/review
docs). The four implementation commits are T1–T4.

## What shipped

**Functional changes:**
- `apps/web/next.config.mjs` now exports `headers()` + `redirects()`
  functions. The headers rule pins `/.well-known/:path*` to
  `Content-Type: application/json` with a 5-min cache. The redirects rule
  301s any request with `Host: www.airabynisarga.com` to the apex.
- `apps/web/src/app/.well-known/[file]/route.ts` deleted (dead in prod
  because Replit's static layer served `/public` directly).
- `apps/web/tests/well-known-route.test.ts` deleted (tested the now-gone
  handler).

**Documentation changes:**
- CLAUDE.md "Conventions" — new bullet locking apex-only outbound URLs.
- roadmap.md — Last updated bumped to 2026-06-29; S0 status flip for
  domain registration + AASA + www redirect; new ship-log entry under
  Off-roadmap progress.

## Verification status

- `pnpm --filter @aira/web typecheck` — ✓ clean after T1's `.next` cleanup.
- `pnpm --filter @aira/web lint` — 7 pre-existing errors in untouched files
  (broadcast-modal cascading renders, instrumentation env access,
  sponsorships-section, cron route). `npx eslint apps/web/next.config.mjs`
  on the file I touched — ✓ clean.
- Lefthook pre-commit hooks ran on every commit (check-migrations,
  check-contrast, etc.) — ✓ all green.
- AASA still cached correctly by Apple's swcd at
  `https://app-site-association.cdn-apple.com/a/v1/airabynisarga.com`
  (no content change, only serving-headers change).
- **Post-deploy verification still needed** (see Follow-ups).

## Follow-ups (human-driven)

1. **Verify the `headers()` rule overrides Replit's static layer in prod.**
   After deploy, run:
   ```
   curl -sS -I https://airabynisarga.com/.well-known/apple-app-site-association
   ```
   Expected: `content-type: application/json` and
   `cache-control: public, max-age=300, s-maxage=300`. If still showing
   `application/octet-stream` or `max-age=0`, the override didn't win —
   revert T1 and re-ship via Plan B (move files out of `/public`, restore
   the route handler).

2. **Paste the Android SHA-256 fingerprint** into
   `apps/web/public/.well-known/assetlinks.json` once captured from
   Play Console → Setup → App integrity → App signing → "App signing key
   certificate" → SHA-256 fingerprint. Expected shape:
   `^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){31}$`. Single replacement of
   `{{ANDROID_CERT_SHA256}}`, redeploy, then verify with Google's
   Statement List Tester at
   `https://developers.google.com/digital-asset-links/tools/generator`.

3. **DNS for `www.airabynisarga.com`** is still pointed at the
   third-party parking host (`airabynisarga-com.l.ink`). The
   `redirects()` rule is dormant until DNS catches up. Decide:
   point www at the Replit deploy (CNAME or A record) so the
   redirect rule activates, OR leave parked and rely solely on the
   CLAUDE.md guard. Out of code scope.

4. **F25 AASA paths widening** — when F25 ships the mobile-side deep-link
   route handlers, add the new path globs (`/listings/*`,
   `/community/*`, etc.) to
   `apps/web/public/.well-known/apple-app-site-association`'s `paths`
   array, then rebuild + submit via EAS.

5. **Address pre-existing lint errors** — 7 errors in untouched files
   (instrumentation env access, broadcast-modal cascading renders,
   sponsorships-section, cron route). Not introduced here, but worth a
   separate small cleanup commit at some point. Out of scope for this
   plan.

## Recommended next step

`/mlabs-qa` is not the right next step — there's no real-device UI surface
to test here, and the post-deploy `curl -I` verification is the only thing
that actually validates this ship. Once you deploy:

```
curl -sS -I https://airabynisarga.com/.well-known/apple-app-site-association
curl -sS -I https://airabynisarga.com/.well-known/assetlinks.json
```

If both show `content-type: application/json`, T1 worked. If one or both
still show `application/octet-stream`, revert T1 and re-ship via Plan B.

After verification: capture the Android SHA-256 from Play Console and
land follow-up #2 as a one-line commit.
