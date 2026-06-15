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
