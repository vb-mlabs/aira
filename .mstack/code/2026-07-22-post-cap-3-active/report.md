# Code Report — post-cap 3-active

**Status:** complete
**Started:** 2026-07-22 18:40
**Finished:** 2026-07-23 04:27
**Branch:** feat/landing-explainer-videos
**Review:** [.mstack/reviews/2026-07-22-post-cap-3-active.md](../../reviews/2026-07-22-post-cap-3-active.md)

## Tasks

| # | Task | Result | Commit |
|---|------|--------|--------|
| 1 | Add validators constants + limits schema | ✓ done | `efb4e51` |
| 2 | Swap gate to count-based + getMyPostLimits | ✓ done | `097b099` |
| 3 | Wire getMyCommunityPostLimitsOp + route | ✓ done | `ac8d884` |
| 4 | Add service test for the cap boundary | ✓ done | `4aefa12` (+ `0f2664a` type fix) |
| 5 | Web — dialog copy + RSC fetch + gate trigger | ✓ done | `9e0717e` |
| 6 | Mobile — useMyPostLimits + invalidations + gates | ✓ done | `b4ac0d3` |
| 7 | CLAUDE.md addendum | ✓ done | `af9239a` |

## Commits

- `efb4e51` feat(validators): community post cap constants + limits schema
- `097b099` feat(community): count-based active-post cap + getMyPostLimits
- `ac8d884` feat(community/api): getMyCommunityPostLimitsOp + /posts/limits route
- `4aefa12` test(community): cap boundary for createPost + getMyPostLimits
- `9e0717e` feat(web/community): cap-reached CTA + updated dialog copy
- `b4ac0d3` feat(mobile/community): useMyPostLimits + cap-reached CTA on board + composer
- `af9239a` docs(claude): note Post on AIRA active-post cap in Conventions
- `0f2664a` fix(community/test): narrow insertSpy to plain function for Vitest 4 types

Plus one precursor commit landed the mstack housekeeping before the code loop:
- `380f563` docs(mstack): plan + review for post-cap 3-active + housekeeping

## Verification (evidence)

- `pnpm typecheck` — 10/10 tasks successful (final workspace run, 24s wall clock).
- `pnpm --filter @aira/mobile typecheck` — clean (mobile is filter-only in this repo's turbo setup, so it's included explicitly).
- `pnpm --filter @aira/services test` — 7 test files, **62 passed** (7 new cases in `create-post-cap.test.ts` — see Task 4 evidence).
- `pnpm --filter @aira/web lint` — 0 errors, 17 pre-existing warnings in unrelated files.
- Every commit passed lefthook pre-commit gates (check-migrations, check-no-server-actions where relevant, check-contrast).

## Follow-ups

- **Manual verification of the client cap-reached UX on both surfaces.** Boundary tests cover the server; the client's proactive CTA gate isn't unit-tested. Recommend `/mstack-qa` targeting `/community` (web) + `/post` (mobile) with a seeded user at 3 active posts to confirm the disabled button + caption + "Manage my posts" link render correctly and the invalidations flip the state on delete.
- **Vitest 4 spy-typing gotcha.** `ReturnType<typeof vi.fn>` returns `Mock<Procedure | Constructable>` — a union that TS can't narrow under `?.(…)` optional-call syntax. Future service tests should type callback spies as plain callables (`(args) => void`) rather than reaching for the vi.fn helper type. Learning appended below.

## Concerns

- ⚠ Task 4 — Vitest 4's Mock type union broke TS narrowing on `insertSpy?.(vals)`. Fixed by typing the spy as a plain callable in `0f2664a`. Recorded as a follow-up learning; the underlying pattern will resurface in future service tests that want to spy on an optional callback.

## Recommended next step

`/mstack-qa` on the community flow — cover the three states the review locked (under-cap composer open + submit success; at-cap board CTA disabled + caption visible; delete-a-post frees a slot and re-enables the CTA without a manual refresh). Then `/mstack-ship` to push the branch + open a PR whose body is generated from this ledger.
