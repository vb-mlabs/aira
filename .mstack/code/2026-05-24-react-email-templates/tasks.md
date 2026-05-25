# Implementation: React Email templates (replace Postmark hosted templates)

**Started:** 2026-05-24 12:41
**Completed:** 2026-05-24 12:54
**Review:** [2026-05-24-react-email-templates](../../reviews/2026-05-24-react-email-templates.md)
**Branch:** Vbhadala/incorporate-fork-learnings
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add email-safe brand color palette to @mlabs/config
  - Files: `packages/config/src/brand.ts`
  - Commit: `ab6e8cc`
  - Notes: Paused per AGENTS.md rebrand-layer rule; user approved all 7 hex values before commit.

- [x] **Task 2:** Add React Email deps to @mlabs/email
  - Files: `packages/email/package.json`, `pnpm-lock.yaml`
  - Commit: `ad77957`
  - Notes: Upgraded versions to latest stable (`@react-email/components@^1.0.12`, `@react-email/render@^2.0.8`) — initial pin was deprecated.

- [x] **Task 3:** Build shared Layout + Button components
  - Files: `packages/email/src/components/{Layout,Button}.tsx`, `theme.ts`, `tsconfig.json`
  - Commit: `304e487`
  - Notes: Added `jsx: react-jsx` + DOM lib + `.tsx` include to email package tsconfig.

- [x] **Task 4:** Build three template components
  - Files: `packages/email/src/templates/{verify-email,password-reset,notification}.tsx`
  - Commit: `18ef810`

- [x] **Task 5:** Rewire types + templates + drivers
  - Files: `packages/email/src/{types,index}.ts`, `templates.ts → templates.tsx` (rename), `drivers/{postmark,console}.ts`, `package.json`, `apps/web/tests/email.test.ts`
  - Commit: `15e0e4a`
  - Notes: Renamed `templates.ts` → `templates.tsx` for JSX. Surfaced subpath exports for components + each template (preview route needs them). Updated email tests to assert on new SendArgs shape (6/6 passing).

- [-] **Task 5b:** (optional) Snapshot tests per template
  - Skipped per review's Pause-if: `@mlabs/email/package.json` has no `scripts.test`. Coverage is already provided by `apps/web/tests/email.test.ts` recordingDriver pattern (renders templates + asserts on rendered HTML/text per call).

- [x] **Task 6:** Verify apps/web shims unaffected
  - Files: (none — verification only)
  - Commit: — (no commit)
  - Notes: `pnpm -F @mlabs/web typecheck` passed without touching `apps/web/src/lib/email/*`. `grep templateAlias` returns empty across packages/ and apps/web/.

- [x] **Task 7:** Add /_dev/emails preview route
  - Files: `apps/web/src/app/_dev/emails/page.tsx` (new)
  - Commit: `1c6ed3c`
  - Notes: Production guard uses `env.NODE_ENV` from `@/config/env` per AGENTS.md.

- [x] **Task 8:** Update landing copy + handover docs
  - Files: `apps/web/src/components/marketing/feature-grid.tsx`, `docs/handover/postmark-templates.md`
  - Commit: `d9512bf`
  - Notes: Handover doc fully rewritten — was 200+ lines of "create these templates in Postmark UI", now 40 lines pointing at the .tsx files.
