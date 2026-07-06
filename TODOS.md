# TODOs (captured from reviews)

Items deferred from active phases. Each has a clear trigger condition for when to revisit. Add new TODOs at the bottom with date + source review.

---

## 2026-05-25 — Design system v1.0 (`/mlabs-design-system`)

Source: `.mstack/design-system/DESIGN.md` § Open questions + `design-system-v1-status` memory.

### Paper-grain texture asset fallback
- **Item:** Page background uses CSS-only SVG `feTurbulence` noise. If client says it reads as "synthetic" or "fake", export the two Figma textures (cream paper + green paper) and swap `--texture-paper` / `--texture-paper-green` in `apps/web/src/app/globals.css` to `background-image: url('/textures/cream.png')` style references.
- **Trigger:** First client design review where the texture is critiqued, OR if visual QA on real devices shows the noise pattern repeating awkwardly.

---

## 2026-05-26 — Auth RBAC hardening (`/mlabs-code`)

Source: `.mstack/reviews/2026-05-26-auth-rbac-hardening.md`, T11/T12 follow-ups.

### Audit log retention cron
- **Item:** Sprint 1 starts writing `user.signed_in` / `user.signed_in_failed` / `user.signed_up` rows on every auth event, on top of the existing role-change / ban / session.revoked entries. `audit_log` will grow unbounded. A scheduled cleanup (e.g. delete rows older than 90 days for signed_in events, keep role-change/ban/revoke forever) keeps the table sized.
- **Trigger:** When `audit_log` exceeds ~10MB on the deployed Neon branch, OR before the first public-facing prod release — whichever comes first.

### Integration test infrastructure (real Postgres)
- **Item:** T11's mockable coverage shipped, but the enum-violation acceptance criterion (`UPDATE "user" SET role = 'hacker'` raises a Postgres-level error) cannot be unit-tested with the current in-memory store. The full migration also needs to be exercised against a real branch as part of CI rather than waiting for `pnpm db:migrate` at deploy time.
- **Trigger:** When the next sprint adds another non-trivial migration (likely S2 — Categories) OR when a migration-time bug ships to prod — whichever bites first. Likely path: testcontainers-postgres + a `pnpm db:test-migrate` script that runs the full migration set against an ephemeral DB, plus a small Vitest suite that hits enum-violation, advisory-lock contention, and other DB-level invariants.

---

## 2026-05-26 — Auth shell redesign (`/mlabs-code`)

Source: `.mstack/reviews/2026-05-26-auth-shell-redesign.md` follow-ups.

### Upgrade tree-of-life logo asset (2x PNG or SVG)
- **Item:** `apps/web/public/marketing-images/logo.png` and `apps/mobile/assets/logo.png` are 112×112 PNGs. The new AuthShell renders at 80×80 (crisp at 1x and 2x), but welcome's hero renders at 140×140 — soft-renders on 2x retina screens (iPhones / MacBooks at 13"+ scaling). Marketing nav also scales the logo; same constraint applies elsewhere. Export a 2x PNG (224×224) or an SVG from the Figma source and replace both copies. Mobile build picks up the new file via `require("../assets/logo.png")`; web's next/image hash invalidates automatically.
- **Trigger:** Pre-TestFlight or first client design review where someone notices, whichever comes first.

---

## 2026-07-06 — QA feedback (2026-07-06 review — items #15, #16)

Source: 2026-07-06 QA feedback pass (items #1–#16). Item deferral confirmed with framer@ during the same session that shipped groups A + B on `feat/featured-business-selection`. Deferred to keep the current sprint tight; both items expand scope beyond a straightforward code change.

### Clean test environment / QA seed integration (#15)
- **Item:** The `feat/qa-test-accounts-seed` branch already introduces `packages/db/scripts/seed-qa-accounts.ts` (four fixed personas — super_admin / admin / two end_users with shared-credential passwords documented in git). What's missing to fully address the "clean app to test" ask: (a) a matching **fixture seed** for demo businesses / categories / sponsorships so QA surfaces have realistic data, not the accumulated dev-tree state (recall the "Restaurants to Food" drift observed in the 2026-07-06-1131 QA run); (b) a **reset script** that purges + re-seeds in one command so QA can start each test from a known baseline; (c) landing the accounts seed branch itself onto `main` so every environment has consistent creds. Consider whether the fixture also seeds ~3–5 subcategories per root (the Group B "skipped Task 3" question comes back as soon as fixture data is a topic).
- **Trigger:** First time an external tester (framer@ or a client-side stakeholder) needs the app in a clean state for a demo, OR the next time QA drift blocks another QA run — whichever first.

### Manage home page content (#16)
- **Item:** Home page copy — About title + body + community-member count under the AIRA wordmark — currently lives in `packages/config/src/brand.ts` under `brand.homepage.*` (aboutTitle, aboutBody, communityMembers). Editing means a code change + deploy. Options for making it admin-editable: (a) **AppSetting rows** (existing pattern — `homepage_about_title` and `homepage_about_body` keys are already seeded into `app_setting` per migration `0016_smiling_nehzno.sql:56-60`; needs an admin UI at `/admin/settings/homepage` and a resolver that overlays the app_setting values on top of `brand.homepage.*` at read time); (b) a light CMS layer per `homepage-cms-to-brand-layer` plan slug that already exists in `.mstack/plans/2026-06-15-homepage-cms-to-brand-layer.md` — worth reading before starting to avoid duplicated design work; (c) leaving as code + deploy if editing frequency stays low. Recommendation: adopt option (a) since half the plumbing is already in the DB.
- **Trigger:** When the client asks to tweak home-page copy for the first time post-launch, OR when marketing wants A/B copy testing — whichever first.

---

## 2026-07-06 — Business verification notes (`/mstack-review`)

Source: `.mstack/reviews/2026-07-06-business-verification-notes.md` Concerns + deferred Suggestions.

### Audit-in-transaction atomicity gap
- **Item:** Both `contact_person_changed` (existing) and the new `business.verification_changed` (added by this plan) emit audit rows *outside* the mutation transaction. A mutation failure after audit success leaves a spurious audit row on a change that didn't land. Same pattern gap likely affects other historical audit branches — sweep once, fix as a small dedicated plan.
- **Trigger:** First time a real audit-vs-mutation drift surfaces in a QA or prod investigation, OR opportunistically alongside the next `updateBusiness` refactor.

### Public-facing verification metadata
- **Item:** Show "Verified 3 months ago by AIRA" (or similar) on the public business detail page. Currently `verified` is a boolean with no timestamp exposure; verification-notes are admin-only. Once notes land, consider surfacing derived metadata (verified_at, possibly a curated public blurb from the notes).
- **Trigger:** When trust signals become a marketing ask, or when user research shows public callers want more than the blue tick.

### `verified_by_user_id` denormalised FK
- **Item:** Add a nullable FK on `businesses` pointing at the user who last flipped `verified` to true. Actor is currently reconstructable via `audit_log` scan; a denormalised column would enable sort-by-verifier and per-admin verification workloads.
- **Trigger:** When an admin UI needs to sort or filter listings by verifier.
- [ ] Wire local db:migrate into the db:generate flow so dev never falls behind prod's deploy-applied schema. Options: (a) chain the two commands in package.json ('db:generate:apply' script that does both), (b) pre-commit hook that fires migrate when a new file in packages/db/drizzle/migrations/ is staged, (c) simplest — a rule in CLAUDE.md that mstack-code MUST run migrate after generate. Incident of record: 2026-07-06 Replit Publish dialog proposed to DROP verification_notes because dev never got migrated after PR #4. — *sprint 2026-07-06, 2026-07-06*
- [ ] Resend confirmation button on the post-email-change 'check inbox' state — add once a real user needs it. Ties into email-verification cadence + Better Auth's send-verification-email endpoint (apps/mobile/features/auth/api.ts already has resendVerifyRequest but it's for signup verification, not email-change verification — check whether Better Auth uses the same endpoint for both). — *review 2026-07-06-mobile-uat-sprint, 2026-07-06*
