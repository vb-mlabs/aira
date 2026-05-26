# QA report: Auth shell redesign

**Date:** 2026-05-26  
**Branch:** `feat/auth-shell-redesign`  
**Slice:** auth-shell-redesign (T1–T8)  
**Runner:** Playwright Chromium (Desktop Chrome) + manual regression notes  
**Status:** ✅ PASS — 7/7 tests green, 0 bugs found

---

## Test results

| # | Test | Result |
|---|---|---|
| 1 | `/login` — AuthShell chrome, Welcome Back!, Sign In button, Sign Up link | ✅ pass |
| 2 | `/login?reason=idle` — IdleBanner still surfaces above heading | ✅ pass |
| 3 | `/signup` — chrome, Sign Up button, Sign In link | ✅ pass |
| 4 | `/forgot-password` — chrome + Cormorant heading | ✅ pass |
| 5 | `/reset-password` (no token) — "Invalid reset link" state | ✅ pass |
| 6 | `/verify-email` (no token) — "Couldn't verify" state | ✅ pass |
| 7 | Marketing-nav — by Nisarga reads through `brand.parentName` | ✅ pass |

**Spec:** `.mstack/qa/2026-05-26-1110/specs/auth-shell.spec.ts`  
**Screenshots:** `.mstack/qa/2026-05-26-1110/assets/01-login.png` … `06-verify-email-no-token.png`

---

## Spec fix applied

**Issue:** `getByLabel('Password')` resolved to 2 elements in strict mode — the password input AND the "Show password" toggle (which has `aria-label="Show password"`). This is a spec-authoring artifact, not an app bug.

**Fix:** Changed both `/login` and `/signup` assertions to `getByLabel('Password').first()`. The actual password input is present and functional on both pages.

---

## Findings

### No bugs

All AuthShell chrome elements (tree-of-life logo, `aria-label="AIRA home"` link, "AIRA by Nisarga" footer) are present on all five `(auth)` routes. Cormorant headings render at `text-3xl` across all pages. Copy matches Figma spec exactly:

- `/login` — "Welcome Back!" · "Sign in to continue to AIRA." · "Sign In" button · "Sign Up" link
- `/signup` — "Create your account" · "Sign Up" button · "Sign In" link
- `/forgot-password` — "Forgot your password?" · "Send reset link" button · "Sign In" link
- `/reset-password` (no token) — "Invalid reset link" · "Request a new link" link
- `/verify-email` (no token) — "Couldn't verify" · "Back to sign in" link

### IdleBanner regression — confirmed

Test #2 confirms `<IdleBanner>` still surfaces above the "Welcome Back!" heading on `/login?reason=idle`. The `(auth)/layout.tsx` rewrite (logo + footer chrome) did not disturb the inner Suspense boundary that conditionally renders the banner.

### Idle-timeout DB logic — no change, prior QA sufficient

`adminSessionIsStale` was not touched by the auth-shell redesign. The critical fix (reading `last_activity_at` directly from DB via Drizzle rather than from the Better Auth session shape) was applied and verified in the auth-rbac-hardening QA slice. No regression in this slice.

### `brand.parentName` migration — confirmed

Marketing-nav renders "by Nisarga" via `brand.parentName` (T8 migration). Test #7 passes; the hardcoded literal is gone from `marketing-nav.tsx`.

---

## Open follow-ups (carried from implementation report)

- **Tree-of-life logo asset upgrade.** The 112×112 PNG is crisp at the 80×80 AuthShell header, but soft at 140×140 on the mobile welcome hero. Export 2× or SVG from Figma before TestFlight.
- **Mobile native typography.** `font-display` resolves to system fallback on iOS/Android until Cormorant + Lato are wired up via `expo-font`. Accepted gap per locked decision.

---

## Approval

**Verdict: APPROVED.** Auth shell redesign slice is QA-complete. No blocking issues. Safe to merge `feat/auth-shell-redesign` → `main`.
