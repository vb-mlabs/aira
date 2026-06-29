# Review: Universal-link verification follow-ups

**Date:** 2026-06-29
**Slug:** 2026-06-29-universal-link-followups
**Plan reviewed:** [2026-06-29-universal-link-followups.md](../plans/2026-06-29-universal-link-followups.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** Claude (Opus 4.7) via `/mlabs-review`

---

## Summary

Plan is tight and ready to implement. Four small, independent edits that all
live in the universal-link surface; bundling them into one ship is the right
call. Two material refinements during review: (1) carve out the Android
SHA-256 paste from `/mlabs-code`'s scope entirely so the run doesn't pause
on external ops input — it ships as a one-line manual follow-up commit once
the Play Console fingerprint is captured; (2) commit to "ship `headers()` +
delete route handler in one commit" rather than the plan's hedged two-step,
on the basis that the Next.js docs guarantee `headers()` applies to all
matched routes including static `/public` files. If it doesn't override
Replit's static layer in prod, the revert is a single git revert and we
fall back to moving files out of `/public` (recorded as the Plan-B path in
the implementation plan).

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** The Android SHA-256 paste is a manual ops step that depends
  on external state (Play Console App Signing fingerprint). If
  `/mlabs-code` tries to action it, the task either pauses indefinitely or
  guesses a value.
  **Decision:** Carve the SHA-256 paste out of `/mlabs-code`'s scope
  entirely. It ships as a one-line follow-up commit by the human once the
  fingerprint is captured. The roadmap S0 line for Android SHA-256 stays
  open at the end of this run; only the AASA + www + CLAUDE.md items flip
  to shipped.

- **Concern:** The plan hedges on whether `headers()` will actually
  override Replit's static `/public` serving in prod. The hedge leaves
  the route handler around as belt-and-suspenders, which then needs a
  follow-up commit to delete.
  **Decision:** Ship `headers()` + delete the route handler in one
  commit, on the basis that Next.js's documented behavior is that
  `headers()` applies to all matched routes including static files. If
  prod actually doesn't honor it (provable by `curl -I` post-deploy),
  the revert is a single `git revert` and we re-ship via the move-files-
  out-of-`/public` path. The route handler being "dead code in prod"
  today is a worse state than "deleted with a known revert path."

- **Concern:** The plan's verification AC for `www → apex` redirect uses
  the `-H "Host: www.airabynisarga.com"` curl pattern. Need to confirm
  Replit's frontend doesn't strip / rewrite the Host header before it
  reaches Next.js.
  **Decision:** Two-tier verification — first verify locally with
  `pnpm dev` + curl (Next.js sees the Host header directly, no Replit
  layer in between), then post-deploy spot-check the same curl against
  the live origin. If the live curl differs, the redirect rule still
  works for real www traffic *if/when* DNS catches up (because real www
  requests will have the literal `www.airabynisarga.com` Host); the
  curl-with-Host-header is just the dev-time proxy.

- **Concern:** The plan proposes adding a comment in `next.config.mjs`
  explaining the narrow AASA paths. This adds maintenance noise to a
  config file.
  **Decision:** Don't add the comment to `next.config.mjs`. Instead,
  drop a brief inline note at the top of
  `apps/web/public/.well-known/apple-app-site-association` would
  break JSON validity (no comments in JSON), so do nothing in code.
  Future-me debugging universal links will find the plan + review docs
  via `roadmap.md` and `.mstack/plans/`. That's sufficient.

- **Concern:** The plan's regex for SHA-256 validation (`[0-9A-F]{2}`)
  is case-sensitive. Play Console can return lowercase hex.
  **Decision:** Carved-out — moot since the SHA-256 paste isn't a
  `/mlabs-code` task. Documenting the case-insensitive expected shape
  `^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){31}$` here for whoever does the
  manual paste.

### Suggestions (taken or deferred)

- **Suggestion:** Add a `no-www-host-literal` ESLint rule mirroring the
  existing `no-brand-string-literal` rule, to mechanically enforce the
  apex-only convention.
  **Deferred** — codebase is clean today (verified by grep across
  `packages/email/src`, `packages/config/src`, `apps/web/src`,
  `apps/mobile/`), CLAUDE.md guard is preventive enough. Reopen if drift
  shows up.

- **Suggestion:** Move `apps/web/public/.well-known/*` files out of
  `/public` proactively (skip the `headers()` route entirely).
  **Deferred** — chosen the smaller `headers()` diff as primary path,
  with file-move as documented Plan B if prod verification fails.

- **Suggestion:** Add the Apple `webcredentials.apps[]` validation as a
  separate AC.
  **Taken** — added to AC checklist below as a regression guard (the
  file isn't changing during this ship; we're only changing how it's
  served).

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- Android SHA-256 paste is **out of `/mlabs-code` scope**. Human follow-up
  commit when the Play Console fingerprint is captured.
- `headers()` + route handler deletion ship in **one commit**, not two.
  Plan B (move files out of `/public`) is the documented revert path if
  prod doesn't honor the headers rule.
- The verification curl for the www redirect uses `-H "Host:
  www.airabynisarga.com"` against `localhost:3000` first; post-deploy curl
  against the live origin is a spot-check, not a hard AC.
- No comment is added to `next.config.mjs` or the AASA file explaining
  the narrow paths. The plan + review docs are the durable record.
- No new ESLint rule for apex-only enforcement.
- `apps/web/src/app/.well-known/[file]/route.ts` is deleted in T1, not
  preserved as fallback.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit). `/mlabs-code` runs autonomously
but pauses if a task lists a **Pause if** trigger that matches the
situation.

### Task 1: AASA content-type via next.config headers() + delete dead route handler

- **Files:**
  - `apps/web/next.config.mjs` (edit)
  - `apps/web/src/app/.well-known/[file]/route.ts` (delete)
- **What:** Add an async `headers()` function to the existing Next config
  export. Return a single rule for `source: "/.well-known/:path*"` that
  sets `Content-Type: application/json` and `Cache-Control: public,
  max-age=300, s-maxage=300`. Delete the now-redundant route handler at
  `apps/web/src/app/.well-known/[file]/route.ts` (and its parent dir
  `apps/web/src/app/.well-known/[file]/` if it becomes empty; remove
  `apps/web/src/app/.well-known/` if that also becomes empty).
- **Acceptance:**
  - `pnpm typecheck` clean (the JSDoc `@type {import("next").NextConfig}`
    annotation should infer `headers` correctly).
  - `pnpm lint` clean.
  - `apps/web/src/app/.well-known/[file]/route.ts` no longer exists.
  - `apps/web/next.config.mjs` exports a `headers()` function returning
    the rule above.
  - `git grep -F "/.well-known/[file]/route"` is empty.
- **Pause if:**
  - `pnpm typecheck` complains about the `headers()` return type under
    the JSDoc-typed config — escalate so the human can decide between
    annotating manually vs. converting the file to `.ts`.
  - The directory structure under `apps/web/src/app/.well-known/`
    contains unexpected files beyond the `[file]/route.ts` — pause and
    inspect before deleting.

### Task 2: www → apex 301 redirect via next.config redirects()

- **Files:** `apps/web/next.config.mjs` (edit)
- **What:** Add an async `redirects()` function returning a single rule
  matching `source: "/:path*"` with `has: [{ type: "host", value:
  "www.airabynisarga.com" }]` and `destination:
  "https://airabynisarga.com/:path*"`, `permanent: true`. This activates
  whenever DNS for `www.airabynisarga.com` resolves to our origin (today
  the subdomain is parked at a third-party host; rule ships as dormant
  code that catches up automatically when DNS does).
- **Acceptance:**
  - `pnpm typecheck` + `pnpm lint` clean.
  - `pnpm dev` running locally; `curl -sS -I -H "Host:
    www.airabynisarga.com" http://localhost:3000/foo` returns `301`
    with `location: https://airabynisarga.com/foo`.
  - `apps/web/next.config.mjs` exports a `redirects()` function returning
    the rule above.
- **Pause if:**
  - Next.js 16's `redirects()` API has diverged from the well-known
    `{ source, has, destination, permanent }` shape (per AGENTS.md
    "This is NOT the Next.js you know"). Cross-reference
    `node_modules/next/dist/docs/` before assuming the signature is
    stable.

### Task 3: CLAUDE.md apex-only convention

- **Files:** `CLAUDE.md` (edit)
- **What:** Add a new bullet under the "Conventions" section locking the
  apex-only outbound URL rule. Should reference `brand.url` (currently
  `https://airabynisarga.com`) as the source of truth and the
  `next.config.mjs` `redirects()` rule as the live guard against www
  drift. Match the voice/format of the existing bullets (each is a
  one-paragraph rule starting with a bold label, e.g. "**Apex-only
  outbound URLs.**").
- **Acceptance:**
  - `CLAUDE.md` has a new "Conventions" bullet following the existing
    format pattern (bold label + 2-4 sentence body).
  - The bullet references `brand.url` and the `redirects()` guard.
  - No markdown lint errors (if a lint tool is configured for
    `CLAUDE.md`; none observed in repo today, so just visual review).
- **Pause if:** none.

### Task 4: roadmap.md status flip + ship log

- **Files:** `roadmap.md` (edit)
- **What:** Two edits:
  1. In the top-of-file "What's pending" section (currently dated
     2026-06-23), update the Sprint 0 bullet list to mark the
     AASA content-type + www redirect as shipped; the Android SHA-256
     placeholder remains 🟦 (unchanged, since this run doesn't paste
     it). Bump the "Last updated" date to **2026-06-29**.
  2. In the "Off-roadmap progress" section (chronological ship log
     under `2026-05-26 → 2026-06-23`), add a new `### ✅ Post-S6 —
     Universal-link follow-ups (2026-06-29)` entry summarizing the
     three shipped items + link to this review doc and the plan doc.
     Mirror the voice of recent entries (e.g. the
     `### ✅ Post-S6 — Expo SDK 55 → 54 downgrade (2026-06-23)`
     entry).
- **Acceptance:**
  - `roadmap.md` "Last updated" reflects 2026-06-29.
  - "What's pending" S0 bullets show AASA + www redirect ✅; Android
    SHA-256 stays 🟦.
  - A new dated entry under "Off-roadmap progress" exists, links to
    `.mstack/plans/2026-06-29-universal-link-followups.md` and
    `.mstack/reviews/2026-06-29-universal-link-followups.md`.
- **Pause if:**
  - The "What's pending" section structure has changed shape since
    review — re-read before editing to avoid breaking the ship log
    pattern.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

- **Headers override verification can only happen post-deploy.**
  `/mlabs-code` ships the change locally and verifies via typecheck +
  lint + local-dev curl. The actual prod-server verification (does
  Replit's static layer honor `headers()` for `/public/*` files?) is a
  human-driven post-deploy step. If the post-deploy `curl -I
  https://airabynisarga.com/.well-known/apple-app-site-association`
  still shows `application/octet-stream`, the human reverts T1's
  next.config.mjs change AND re-ships via Plan B (move files out of
  `/public`, restore the route handler). `/mlabs-code` doesn't need to
  pause on this — it's an after-the-fact verification, not a code-time
  decision.

- **Android SHA-256 paste timing.** Out of `/mlabs-code` scope per the
  decision above. Human captures fingerprint from Play Console →
  Setup → App integrity → App signing → SHA-256 certificate, then
  edits `apps/web/public/.well-known/assetlinks.json` (single
  replacement) + commits + redeploys. Expected fingerprint shape:
  `^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){31}$`. Post-edit verification: Google's
  Statement List Tester at
  `https://developers.google.com/digital-asset-links/tools/generator`
  reports green for `https://airabynisarga.com` ↔
  `com.airabynisarga.app`.

- **F25 AASA paths widening.** Out of scope here; folded into F25's own
  plan + ship. When F25 ships, expect a `next.config.mjs` edit too if
  the `headers()` rule needs to change cache duration, plus an EAS
  rebuild after the AASA paths array changes.
