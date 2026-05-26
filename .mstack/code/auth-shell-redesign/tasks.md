# Implementation: Auth shell redesign

**Started:** 2026-05-26
**Review:** [auth-shell-redesign](../../reviews/2026-05-26-auth-shell-redesign.md)
**Branch:** feat/auth-shell-redesign
**Status:** complete (8/8 ✓)

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **T1:** Add `brand.parentName: "Nisarga"` to config
  - Files: packages/config/src/brand.ts
  - Commit: —
  - Notes: —

- [ ] **T2:** Copy tree-of-life logo into mobile assets
  - Files: apps/mobile/assets/logo.png (new, copy of web public)
  - Commit: —
  - Notes: —

- [ ] **T3:** Web `(auth)/layout.tsx` — full brand chrome
  - Files: apps/web/src/app/(auth)/layout.tsx
  - Commit: —
  - Notes: tree-of-life logo at 80x80, AIRA by Nisarga footer, drop the orange dot + gradient. Body paper-grain stays.

- [ ] **T4:** Web auth pages — Cormorant heading + copy alignment
  - Files: 5× apps/web/src/app/(auth)/{login,signup,forgot-password,reset-password,verify-email}/page.tsx
  - Commit: —
  - Notes: Welcome Back! + Sign In + Sign Up case updates; preserve IdleBanner + verify-email Suspense states.

- [ ] **T5:** Mobile `<AuthShell>` component
  - Files: apps/mobile/components/AuthShell.tsx (new)
  - Commit: —
  - Notes: SafeArea + Keyboard + Scroll + logo + footer.

- [ ] **T6:** Mobile auth screens — wrap in AuthShell + copy
  - Files: 6× apps/mobile/app/(auth)/{login,sign-up,forgot-password,reset-password,verify,check-email}.tsx
  - Commit: —
  - Notes: Watch out for keyboard handling conflicts.

- [ ] **T7:** Mobile welcome screen — token alignment (no AuthShell)
  - Files: apps/mobile/app/(auth)/welcome.tsx
  - Commit: —
  - Notes: 140x140 hero logo replaces wordmark; standalone full-screen layout stays.

- [ ] **T8:** Migrate marketing-nav.tsx + add TODOS for logo upgrade
  - Files: apps/web/src/components/marketing/marketing-nav.tsx · TODOS.md
  - Commit: —
  - Notes: by Nisarga → {brand.parentName}; TODO for 2x or SVG logo export.
