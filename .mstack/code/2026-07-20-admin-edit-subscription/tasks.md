# Implementation: Admin edit subscription

**Started:** 2026-07-20 15:00
**Finished:** 2026-07-20 15:35
**Review:** [2026-07-20-admin-edit-subscription](../../reviews/2026-07-20-admin-edit-subscription.md)
**Branch:** feat/landing-explainer-videos
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add `business.subscription_updated` audit variant + render case
  - Files: `packages/validators/src/audit-meta.ts`, `apps/web/src/features/admin/audit/render-detail.tsx`
  - Commit: 312df1d
  - Notes: spec: ok — union + KNOWN_AUDIT_ACTIONS + label override + render case; coverage assertion passes.

- [x] **Task 2:** Emit audit in `updateSubscriptionOp` with resolve-first pattern
  - Files: `apps/web/src/server/operations/business-subscriptions.ts`
  - Commit: 2e6305a
  - Notes: spec: ok — resolves via getSubscriptionById, audits before mutate. Same shape as commit 657d54f on updateSponsorshipOp.

- [x] **Task 3:** Add/Edit dialog + Edit button + row-level Evidence dropzone
  - Files: `apps/web/src/features/admin/components/subscriptions-section.tsx`
  - Commit: b54f8b8
  - Notes: spec: ok — AddSubscriptionDialog renamed to SubscriptionDialog with optional `subscription` + `planById` props. Add mode unchanged (still uploads evidence during Create). Edit mode: plan_id renders as `Plan: <name> (locked)` text, no auto-shift of end_date from plan duration, PATCH via apiClient.patch, evidence-upload branch skipped (post-hoc handled by EvidenceCell). New EvidenceCell subcomponent lifted from sponsorships-section.tsx. loadAndSeed() extracted so eslint-disable-next-line covers React 19's set-state-in-effect rule (same pattern as sponsorship). Typecheck + lint + token drift all clean.
