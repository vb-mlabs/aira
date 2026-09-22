# Implementation: Landing hero — 3-tier "Discover. Support. Grow."

**Started:** 2026-09-22
**Review:** [2026-09-22-landing-hero-3tier](../../reviews/2026-09-22-landing-hero-3tier.md)
**Branch:** feat/landing-hero-v2
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add `NEXT_PUBLIC_LANDING_HERO_V2` flag to env schema + document in .env.example
  - Files: `apps/web/src/config/env.ts`, `.env.example` (repo root)
  - Commit: `9f1e066`
  - Notes: typecheck + lefthook (check-migrations + check-contrast) both green.

- [x] **Task 2:** Extract `LaunchOfferDialog` from `business-cta-pair.tsx`
  - Files: `apps/web/src/components/marketing/launch-offer-dialog.tsx` (new), `apps/web/src/components/marketing/business-cta-pair.tsx` (edit)
  - Commit: `4ee5cbb`
  - Notes: BusinessCtaPair trigger class kept verbatim. Removed unused lucide imports.

- [x] **Task 3:** Build `HeroV2` component
  - Files: `apps/web/src/components/marketing/hero-v2.tsx` (new)
  - Commit: `2212616`
  - Notes: 292 lines. Server Component; brand.tagline + brand.name via `@aira/config`; lucide-react icons; reused GetListedDialog + LaunchOfferDialog for Owner CTAs. Ships CSS-only QR placeholders + `href="#"` store links (real assets = follow-up per review open questions).

- [x] **Task 4:** Wire flag swap in `page.tsx` + gate OG metadata on the same flag
  - Files: `apps/web/src/app/page.tsx`
  - Commit: `c30d3bd`
  - Notes: build passes; `/` still prerenders as static; both hero + OG selected from same flag.

- [x] **Task 5:** Flip local `NEXT_PUBLIC_LANDING_HERO_V2=1` in this workspace
  - Files: `apps/web/.env.local` (gitignored; NO COMMIT)
  - Commit: — (side effect, no commit)
  - Notes: verified `git check-ignore` matches `.env*` at .gitignore:34; `git status` shows no trace.
