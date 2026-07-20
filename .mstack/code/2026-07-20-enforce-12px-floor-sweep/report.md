# Implementation report — Enforce 12px absolute font-size floor

**Status:** complete
**Review:** [.mstack/reviews/2026-07-20-enforce-12px-floor-sweep.md](../../reviews/2026-07-20-enforce-12px-floor-sweep.md)
**Branch:** `feat/landing-explainer-videos`
**Commits:** 6 (task commits) + 1 (housekeeping)

## Tasks

| # | Status | Task | Commit |
|---|--------|------|--------|
| 1 | ✓ done | Sweep — web core shell | 66cb487 |
| 2 | ✓ done | Sweep — web account + admin route pages | 1d04e13 |
| 3 | ✓ done | Sweep — web marketing components | 96ecba1 |
| 4 | ✓ done | Sweep — web admin components | 4f1ffba |
| 5 | ✓ done | Sweep — web feature components + padding tweaks | f5a693a |
| 6 | ✓ done | Sweep — Expo mobile | bb7684a |

## Commits

- `66cb487` chore(a11y): promote sub-12px text to text-xs in web core shell
- `1d04e13` chore(a11y): promote sub-12px text to text-xs on account + admin pages
- `96ecba1` chore(a11y): promote sub-12px text to text-xs in marketing components
- `4f1ffba` chore(a11y): promote sub-12px text to text-xs across admin components
- `f5a693a` chore(a11y): promote sub-12px text + pill padding tweaks in feature components
- `bb7684a` chore(a11y): promote sub-12 fontSize/text-[Npx] to 12 across Expo mobile
- (plus `ebd46df` docs(mstack) housekeeping commit before Task 1)

## Verification evidence (this session)

- **Typecheck:** `pnpm typecheck` — 10/10 tasks pass on the final tree, plus after every intermediate task.
- **Grep acceptance:** every task's grep clause was re-run post-edit and returned zero lines (i.e. no remaining sub-12px arbitrary sizes in the swept scope).
  - Final global check across the whole task list — all clean:
    - `grep -rn "text-\[0\.[0-6][0-9]*rem\]\|text-\[1[01]px\]\|text-\[[0-9]px\]"` under swept paths on web → clean
    - `grep -rn "fontSize:\s*\(9\|10\|11\)\b"` under `apps/mobile` → clean
- **Pre-commit hook:** every commit passed `check-migrations`, `check-contrast`, `check-no-server-actions`, `check-mobile-tailwind`.

## Follow-ups

Both are pre-existing backlog items filed during the plan phase — nothing new:
- `text-xs → text-sm` audit for body/UI text (~208 usages)
- ESLint rule flagging arbitrary sub-12px sizes

## Concerns

None. Notable observations that stayed within the plan's mechanical shape:
- **Task 4 (admin) hit 11 files, plan said 10.** `category-tree-manager.tsx`
  had an ActiveBadge ternary that included `text-[10px]` in one branch;
  swept the same as everything else. Same shape (arbitrary size → `text-xs`),
  so within tolerance.
- **Task 4 side-effect: `category-tree-manager.tsx` ActiveBadge now returns
  `text-xs` in both `small` and `!small` branches.** Padding still differs
  (`px-1.5` vs `px-2`), so the `small` prop retains meaning for layout but
  is now a no-op for font size. Potential cleanup — the `small` prop could
  be removed if no callers rely on the padding difference — but that's a
  separate refactor, not part of this sweep.
- **Task 6: mobile NotificationBell badge got a `lineHeight` bump 12→14
  alongside `fontSize` 10→12.** React Native clips text if `lineHeight <
  fontSize` (unlike CSS which just enlarges the line box). One-line change
  to accompany the mechanical `fontSize` bump; recorded here for
  transparency.

## Recommended next step

Run `/mstack-qa` focused on:

1. **Visual regression on the two padding tweaks in Task 5:**
   - `BusinessCard.SponsoredPill` — mid-slot cards on `/listings/<sub>` — the
     "Sponsored" pill grew ~3.2px vertically; padding tightened to
     compensate. Verify it doesn't look chunky or clash with the
     `More Info` link next to it.
   - `NotificationBell` badge — trigger a scenario with a 2-digit count
     (e.g. 12 unread notifications) and verify the digits fit inside the
     wider min-w-[1.25rem] circle without overflow.
2. **Mobile smoke:**
   - Bottom tab labels grew 11→12px — confirm no clipping in the tab region.
   - Mobile `BusinessCard` mid-slot Sponsored pill grew 9→12px (biggest
     mobile jump, ~33%). Verify the card layout still holds — the pill sits
     next to the More Info label in a tight column.
   - Mobile `AppDrawerContent` "Operated by" footer grew 10→12; verify it
     doesn't wrap awkwardly on smaller phones.
3. **Cross-cutting:** every admin table + community post card + business
   card should now have all pills / chips / meta labels at ≥12px. Quick
   scroll through `/admin/community`, `/community`, `/listings/<sub>`,
   `/account`, `/admin/businesses/<id>` catches any layout surprise.
4. **/design page (exempted from the sweep):** verify the type-scale
   demo still shows the deliberately-small sizes as reference — it should
   look unchanged.
