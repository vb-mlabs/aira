# Implementation report: Auth shell redesign

**Date:** 2026-05-26
**Branch:** `feat/auth-shell-redesign` (branched off `feat/auth-rbac-hardening` — inherits its 16 commits)
**Review:** [.mstack/reviews/2026-05-26-auth-shell-redesign.md](../../reviews/2026-05-26-auth-shell-redesign.md)
**Status:** complete

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | Add `brand.parentName` to config | ✓ done | `2fbefda` |
| 2 | Copy tree-of-life logo into mobile assets | ✓ done | `386b3ed` |
| 3 | Web `(auth)/layout.tsx` — full brand chrome | ✓ done | `3d4a0f5` |
| 4 | Web auth pages — Cormorant heading + Figma copy | ✓ done | `67c5e47` |
| 5 | Mobile `<AuthShell>` component | ✓ done | `236ccd2` |
| 6 | Mobile auth screens — wrap in AuthShell | ✓ done | `bde9a69` |
| 7 | Mobile welcome — token alignment | ✓ done | `0de4ddf` |
| 8 | Migrate marketing-nav + logo TODO | ✓ done | `ec70442` |

## Commits

```
ec70442 chore(brand): migrate marketing-nav 'by Nisarga' to brand.parentName
0de4ddf feat(mobile): welcome hero — tree-of-life logo + dual CTAs + footer
bde9a69 feat(mobile): wrap six (auth) screens in shared AuthShell
236ccd2 feat(mobile): shared AuthShell component for (auth) screens
67c5e47 feat(auth): Cormorant headings + Figma copy across web auth pages
3d4a0f5 feat(auth): tree-of-life logo + AIRA by Nisarga footer in (auth) layout
386b3ed feat(mobile): copy tree-of-life logo into apps/mobile/assets
2fbefda feat(config): add brand.parentName for auth shell + nav composition
```

Plus pre-code chore commits (plan + review) on the same branch.

## What changed

- **Brand config:** new `brand.parentName: "Nisarga"` in `packages/config/src/brand.ts`. Composes with `brand.name` everywhere "AIRA by Nisarga" appears, so the no-brand-string-literal ESLint rule keeps the literal contained to `brand.ts`.
- **Web `(auth)` layout:** orange-dot wordmark replaced with a centred tree-of-life PNG (80×80, `priority` hinted for LCP), background-image redundant edit dropped (the body's paper-grain texture paints through), and an `AIRA by Nisarga` footer rendered below the content card.
- **Web auth pages (5):** `font-display` Cormorant headings at `text-3xl` across `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email` (all three states). Login copy aligned to Figma: `Welcome Back!` + `Sign in to continue to AIRA.` + `Sign In` button + `Sign Up` link. Signup gets `Sign Up` button + `Sign In` link. IdleBanner Suspense and verify-email Suspense both preserved.
- **Mobile `<AuthShell>`:** new component at `apps/mobile/components/AuthShell.tsx` owns SafeArea, keyboard-avoiding, scrolling, the 80×80 logo header, and the AIRA-by-Nisarga footer. Replaces ~60 lines of boilerplate per consuming screen.
- **Mobile auth screens (6):** `login`, `sign-up`, `forgot-password`, `reset-password`, `verify`, `check-email` all wrap in `<AuthShell>`. Headings → `font-display text-4xl text-foreground`. Net **-122 lines** across the six screens after the boilerplate moves into AuthShell.
- **Mobile welcome:** stays standalone (brand-hero composition, not a form). 140×140 tree-of-life replaces the wordmark hero; dual CTAs and the AIRA-by-Nisarga footer round it out.
- **Marketing-nav cleanup:** the lone remaining hardcoded `by Nisarga` literal migrates to `{brand.parentName}`. Marketing prose (`waitlist-card.tsx`, `about-editorial.tsx`) intentionally stays — narrative copy, allowlisted.
- **TODOS.md:** new entry for the tree-of-life asset upgrade (112×112 PNG is crisp at the AuthShell header but soft on the welcome hero at 140×140; export 2x or SVG pre-TestFlight).

## Pause events

None. Eight tasks executed top-to-bottom without a pause-if trigger. Every typecheck stayed green between commits; lint stayed green; lefthook hooks (check-migrations + check-contrast) passed on every commit.

The review's open questions that pointed at potential pause-ifs:
- **Mobile keyboard handling vs AuthShell wrapping** — AuthShell's outer KeyboardAvoidingView composed cleanly with each screen's per-input `onSubmitEditing` handlers. No conflict surfaced.
- **`font-display` resolves to Cormorant** — verified via the existing marketing page using the same token (`font-display` shows up across the marketing nav and hero). Same `globals.css` `@theme inline` declaration covers the (auth) routes.
- **Verify-email Suspense double-wrap** — inner Suspense kept; outer (auth) layout's chrome wraps the page from outside. Next.js handles nested boundaries fine.
- **Marketing-nav import for brand** — file didn't yet import `brand`; T8 added the import alongside the literal migration.

## Follow-ups (carried into TODOS.md)

- **Tree-of-life logo asset upgrade.** 112×112 PNG is fine for the 80×80 header but soft on the 140×140 welcome hero. Export 2x or SVG from the Figma source pre-TestFlight.

Already-tracked TODOs (not new from this slice):
- Mobile native typography — Cormorant + Lato don't actually load on iOS/Android yet. This redesign's `font-display` classes resolve to System fallback on mobile until that lands. **Accepted gap** per the locked decision in the review.

## Recommended next step

Run **`/mlabs-qa`** with focus on the visual redesign:
1. Web — open `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email?token=invalid` on the Replit dev preview and confirm the logo, Cormorant heading, olive CTA, and "AIRA by Nisarga" footer all appear as specified. Capture screenshots.
2. Mobile (Expo) — boot the Expo dev workflow, navigate through welcome → login → sign-up → check-email and confirm AuthShell renders consistently across the screens.
3. Regression — re-run `.mstack/qa/2026-05-26-1020/specs/verify-idle-timeout.ts` to confirm the auth-rbac-hardening slice still works (the IdleBanner on `/login?reason=idle` should still surface after the layout edit).

If anything looks off visually that the Figma didn't anticipate, `/mlabs-ux-audit` is the right follow-up rather than another `/mlabs-code` round.
