# Run log — Renewals Visibility

Started: 2026-07-27 14:00
Branch: feat/business-logo (off feat/landing-explainer-videos)
Layout: monorepo, pnpm.
UI-Significant: yes (3 feature components + 1 route page + 1 chip).

Pre-flight:
- Review approved.
- 1 prep commit (388a69f) landed with plan + review + follow-ups.
- .claude/* auto-artifacts left dirty; will use targeted `git add` per task.

Contradiction scan: clean. Tasks 1-3 land the plumbing (service → validator → op); tasks 4-7 wire the UI on top. Task 5's badge variants (Resolved = "archived", Scheduled = "unverified") are picked from the existing admin-badge.tsx STYLES map — need to verify at task time.

---

Task 1: 8ab9d08 (queries.ts includeAll opt + 3-tier ordering CASE)
Task 2: 6308cf4 (new list-queue.test.ts, drizzle-orm and() spy via vi.mock+importActual)
Task 3: 8fb3437 (validator + op includeAll, also placeholder passthrough on page + drizzle signature fix on the Task 2 test)
Task 4: 7459e91 (WindowChips.showAll prop + toggle chip + withParams builder + page placeholder)
Task 5: fd90b65 (Next attempt th + resolved/scheduled dim + badges)
Task 6: a1c5d10 (?showAll=1 exact-1 parse, subtitle math with scheduled + resolved bucket counts)
Task 7: 3baf5b3 (4 label suffixes for consequence-first copy)
Task 8: db80baf (Date.now hoist + eslint-disable on the RSC), then verify: typecheck 10/10, lint 3/3 (0 errors, 17 pre-existing warnings), services 9/9 (70 tests)

Final:
- 8 task commits + 1 prep commit
- Concerns: none
- Deviations: Task 8 shipped a lint fix commit rather than pure verify; Task 2 mock signature fix rolled into Task 3
