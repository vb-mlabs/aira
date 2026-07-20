# Implementation: Admin edit sponsorship + payment evidence upload

**Started:** 2026-07-20 13:15
**Finished:** 2026-07-20 14:05
**Review:** [2026-07-20-admin-edit-sponsorship](../../reviews/2026-07-20-admin-edit-sponsorship.md)
**Branch:** feat/landing-explainer-videos
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Schema + migration for `sponsorship.payment_evidence_url`
  - Files: `packages/db/src/schema/sponsorships.ts`, `packages/db/drizzle/migrations/0037_stale_phantom_reporter.sql`
  - Commit: 6b35062
  - Notes: spec: ok — pure ADD COLUMN, applied locally against dev DB, `SELECT payment_evidence_url FROM sponsorship` returns NULL column.

- [x] **Task 2:** Extend sponsorship Zod schemas
  - Files: `packages/validators/src/sponsorships.ts`
  - Commit: f33da5b
  - Notes: spec: ok — `.min(1).nullable()` per storage-driver-relative-urls memory. Typecheck passes.

- [x] **Task 3:** Add sponsorship audit variants + render cases
  - Files: `packages/validators/src/audit-meta.ts`, `apps/web/src/features/admin/audit/render-detail.tsx`
  - Commit: dfa7d09
  - Notes: spec: ok — both variants added to union + KNOWN_AUDIT_ACTIONS + label override map + render switch. Coverage assertion passes.

- [x] **Task 4:** Project `payment_evidence_url` in read mapper
  - Files: `packages/services/src/sponsorships/queries.ts`
  - Commit: 363136b
  - Notes: spec: ok — one-line addition matching the other nullable-column defensive `?? null` pattern.

- [x] **Task 5:** Emit `business.sponsorship_updated` audit in the op
  - Files: `apps/web/src/server/operations/sponsorships.ts`
  - Commit: 657d54f
  - Notes: spec: ok — resolves via getSponsorshipById first, audits before mutate. Matches createSponsorshipOp's pattern.

- [x] **Task 6:** Generalize `processAndStoreEvidence` with `domain` param
  - Files: `apps/web/src/features/admin/server/evidence-pipeline.ts`, `apps/web/src/app/api/v1/admin/businesses/[id]/subscriptions/[subId]/evidence/route.ts`
  - Commit: 41734a7
  - Notes: spec: ok — Pause-if checked: only reference to the old `business-subscriptions/` prefix was inside evidence-pipeline itself; nothing indexes on it. ⚠ concern — pre-existing subscription evidence lives under `business-subscriptions/`, new uploads land at `subscriptions/`. Old URLs remain reachable; but admin cleanup enumeration would need to check both prefixes for subscription evidence going forward.

- [x] **Task 7:** New evidence upload route for sponsorships
  - Files: `apps/web/src/app/api/v1/admin/businesses/[id]/sponsorships/[spId]/evidence/route.ts`
  - Commit: 8abac62
  - Notes: spec: ok — mirrors subscription route; requireAdminJSON returns the user directly (not `{ user }`), fixed to `auth.id` after first typecheck failure. Emits sponsorship_evidence_uploaded audit before updating URL.

- [x] **Task 8:** Add/Edit dialog + Edit button + inline Evidence dropzone
  - Files: `apps/web/src/features/admin/components/sponsorships-section.tsx`
  - Commit: 7b6d75c
  - Notes: spec: ok — AddSponsorshipDialog renamed to SponsorshipDialog with optional `sponsorship` prop (Edit mode). Amount rendered as `$<value> (locked)` in Edit. Edit + Cancel buttons only on scheduled/active rows. Evidence column shows View link OR useDropzone tile. Lint required a refactor to extract `loadAndSeed()` from the useEffect body so the disable-next-line covers React 19's set-state-in-effect rule (same pattern as SponsorshipsSection.fetchSponsorships). Typecheck + lint + token drift all pass.
