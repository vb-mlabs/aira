# Review: Enforce the 12px absolute font-size floor across components

**Date:** 2026-07-20
**Slug:** 2026-07-20-enforce-12px-floor-sweep
**Plan reviewed:** [2026-07-20-enforce-12px-floor-sweep.md](../plans/2026-07-20-enforce-12px-floor-sweep.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** framer@millionlabs.co.uk

---

## Summary

Approved. Grep-verified mechanical sweep enforcing the 12px absolute
floor locked in earlier today's DESIGN.md revision. Six atomic tasks
grouped by area; every task is the same shape (arbitrary sub-12px
`text-[…]` / `fontSize: <12>` → `text-xs` / `fontSize: 12`). Two
files carry an in-scope allowance for a padding tweak — `BusinessCard`'s
`SponsoredPill` (~3.2px growth on the biggest jump) and
`NotificationBell` badge (~1.6px growth). Marketing files (~5
replacements) swept in the same run.

Note on `UI-Significant: yes`: the flag triggers because the task list
touches three `page.tsx` files (`account/page.tsx`,
`account/terms/page.tsx`, `admin/page.tsx`) plus many
`features/*/components/**` files — well over the ≥3 threshold. But this
is a compliance sweep of an already-locked design decision, not a new UI
direction. `/mstack-mockup` doesn't apply; run `/mstack-code` directly.

## Findings

### Blockers

- None.

### Concerns (raised, decided, recorded)

- **Concern:** Two components need a padding tweak to look tidy after
  the size bump — `SponsoredPill` (`px-1.5 py-px` was sized for
  `text-[0.55rem]`) and `NotificationBell` badge (`min-w-[1.1rem] px-1
  leading-4` sized for `text-[0.65rem]`).
  **Decision:** In-scope for the same commit as the size bump (Task 5).
  Avoids a follow-up visual-polish commit that would ride purely as a
  consequence of the sweep. Any other padding surprises during
  implementation ride the same commit as their size bump.

- **Concern:** Task 4 (admin components) is easily the largest — 10
  files, ~20 replacements. Splitting would give smaller commits but at
  the cost of two review passes for identical mechanical shape.
  **Decision:** Keep as one atomic task. All 20 replacements are the
  same shape; reviewer skims for pattern consistency once. If
  implementation surfaces any file where the promotion needs judgment
  beyond the mechanical bump (e.g. a chip layout breaking), that's a
  pause trigger and gets escalated on the spot.

- **Concern:** Marketing files (`components/marketing/*`) are content-
  heavy code that arguably has different owners than product UI.
  **Decision:** Sweep in the same run. The 12px floor rule applies
  everywhere including marketing (small print in a footer is still
  small print). Task 3 keeps marketing bundled — 4 files, ~5
  replacements — separable if a marketing owner objects post-hoc.

### Suggestions (taken or deferred)

- **Taken:** Grep-based acceptance criteria — the plan cites the exact
  greps that must return zero after the sweep. Makes `/mstack-code`'s
  verification unambiguous. Kept verbatim.
- **Taken:** `/design/page.tsx` exemption — the page's purpose is to
  demo the type scale including small sizes. Sweeping it would break
  the demo.
- **Deferred (already in backlog):** `text-xs → text-sm` audit for
  body/UI text (~208 usages on web). Requires per-callsite semantic
  judgment; separate plan.
- **Deferred (already in backlog):** ESLint rule flagging arbitrary
  sub-12px sizes so the floor doesn't drift again.

## Decisions locked

- 6 atomic tasks (not split further).
- Padding tweaks on `SponsoredPill` and `NotificationBell` badge are
  in-scope for the same commit as the size bump.
- Marketing files in the same run (Task 3).
- `/design/page.tsx` exempted; documented in Task 1's Notes so
  `/mstack-code` doesn't accidentally sweep it.
- Zero token changes — the type scale in `packages/config/src/design.ts`
  stays untouched.

## Implementation plan

Ordered tasks for `/mstack-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit).

### Task 1: Sweep — web core shell

- **Files:**
  - `apps/web/src/app/error.tsx` (edit) — 2× `text-[11px]`
  - `apps/web/src/app/not-found.tsx` (edit) — 1× `text-[11px]`
  - `apps/web/src/app/(app)/_components/app-sidebar.tsx` (edit) —
    1× `text-[0.65rem]` (line 169, the "by Nisarga" tagline)
  - `apps/web/src/app/(app)/_components/bottom-tab-bar.tsx` (edit) —
    1× `text-[0.65rem]` (line 51)
- **What:** Promote every arbitrary sub-12px `text-[…]` on the listed
  files to `text-xs`. Change only the size class; no other className
  edits. Do **not** touch `apps/web/src/app/(app)/design/page.tsx` —
  explicitly exempted.
- **Acceptance:**
  - Post-edit: `grep -n "text-\[0\.[0-6][0-9]*rem\]\|text-\[1[01]px\]\|text-\[[0-9]px\]" apps/web/src/app/error.tsx apps/web/src/app/not-found.tsx apps/web/src/app/\(app\)/_components/app-sidebar.tsx apps/web/src/app/\(app\)/_components/bottom-tab-bar.tsx` returns zero lines.
  - `pnpm typecheck` passes.
- **Pause if:** Any file in the list has more sub-12px matches than
  documented above (drift since plan write) — pause and confirm the
  extended list, don't guess.

### Task 2: Sweep — web account + admin route pages

- **Files:**
  - `apps/web/src/app/(app)/account/page.tsx` (edit) — 2× `text-[0.65rem]`
  - `apps/web/src/app/(app)/account/terms/page.tsx` (edit) — 1× `text-[0.65rem]`
  - `apps/web/src/app/admin/page.tsx` (edit) — 1× `text-[0.65rem]`
- **What:** Same mechanical bump as Task 1 — sub-12px `text-[…]` →
  `text-xs`.
- **Acceptance:** `grep -n "text-\[0\.[0-6][0-9]*rem\]\|text-\[1[01]px\]\|text-\[[0-9]px\]" apps/web/src/app/\(app\)/account/page.tsx apps/web/src/app/\(app\)/account/terms/page.tsx apps/web/src/app/admin/page.tsx` returns zero lines; typecheck passes.

### Task 3: Sweep — web marketing components

- **Files:**
  - `apps/web/src/components/marketing/phone-showcase.tsx` (edit) — 1× `text-[11px]`
  - `apps/web/src/components/marketing/business-cta-pair.tsx` (edit) — 1× `text-[11px]`
  - `apps/web/src/components/marketing/marketing-footer.tsx` (edit) — 2× `text-[11px]`
  - `apps/web/src/components/marketing/marketing-nav.tsx` (edit) — 1× `text-[11px]`
- **What:** Same mechanical bump. Marketing labels typically pair the
  size with `tracking-[Xpx]` letter-spacing tuned for 11px; the
  tracking tokens stay put — only the size promotes.
- **Acceptance:** `grep -n "text-\[0\.[0-6][0-9]*rem\]\|text-\[1[01]px\]\|text-\[[0-9]px\]" apps/web/src/components/marketing/` (recursive) returns zero lines; typecheck passes.

### Task 4: Sweep — web admin components

- **Files:**
  - `apps/web/src/features/admin/components/audit-table.tsx` (edit) — 1× `text-[11px]`
  - `apps/web/src/features/admin/components/category-tree-manager.tsx` (edit) — 1× `text-[10px]`
  - `apps/web/src/features/admin/components/business-owner-picker.tsx` (edit) — 1× `text-[10px]`
  - `apps/web/src/features/admin/components/user-detail.tsx` (edit) — 1× `text-[0.65rem]`
  - `apps/web/src/features/admin/components/business-detail.tsx` (edit) — 4× `text-[0.65rem]`
  - `apps/web/src/features/admin/community/status-filter.tsx` (edit) — 1× `text-[10px]`
  - `apps/web/src/features/admin/community/post-detail-modal.tsx` (edit) — 1× `text-[11px]` + 1× `text-[10px]`
  - `apps/web/src/features/admin/community/comment-moderation.tsx` (edit) — 1× `text-[11px]` + 1× `text-[10px]`
  - `apps/web/src/features/admin/waitlist/waitlist-counts-header.tsx` (edit) — 1× `text-[0.65rem]`
  - `apps/web/src/features/admin/waitlist/waitlist-tabs.tsx` (edit) — 1× `text-[10px]`
  - `apps/web/src/features/admin/renewals/followup-modal.tsx` (edit) — 1× `text-[11px]` + 1× `text-[10px]`
- **What:** Mechanical bump. No className rewrites beyond size.
- **Acceptance:** `grep -rn "text-\[0\.[0-6][0-9]*rem\]\|text-\[1[01]px\]\|text-\[[0-9]px\]" apps/web/src/features/admin/` returns zero lines; typecheck passes.
- **Pause if:** Any admin table cell layout breaks (col widths sized
  for a smaller chip). Escalate rather than silently tweak widths in
  this task — that's a separate polish decision.

### Task 5: Sweep — web feature components + inline padding tweaks

- **Files:**
  - `apps/web/src/features/messages/components/thread.tsx` (edit) — 2× `text-[0.65rem]`
  - `apps/web/src/features/listings/components/stat-card.tsx` (edit) — 1× `text-[0.65rem]`
  - `apps/web/src/features/listings/components/business-card.tsx` (edit) — 2× `text-[0.65rem]` (More Info link, lines 132/137) + 1× `text-[0.55rem]` (`SponsoredPill`, line 159). **Padding tweak in-scope for SponsoredPill: `px-1.5` → `px-1` if the pill looks chunky after promotion.**
  - `apps/web/src/features/community/components/my-posts-list.tsx` (edit) — 1× `text-[10px]`
  - `apps/web/src/features/community/components/post-detail-modal.tsx` (edit) — 2× `text-[11px]`
  - `apps/web/src/features/community/components/post-card.tsx` (edit) — 1× `text-[11px]` + 4× `text-[10px]` (status pills)
  - `apps/web/src/features/community/components/comment-thread.tsx` (edit) — 2× `text-[11px]`
  - `apps/web/src/features/notifications/components/notification-bell.tsx` (edit) — 1× `text-[0.65rem]`. **Padding tweak in-scope: `min-w-[1.1rem]` → `min-w-[1.25rem]` if the digit crowds after promotion.**
  - `apps/web/src/features/account/components/my-listings-card.tsx` (edit) — 1× `text-[10px]`
- **What:** Mechanical bump on all listed. SponsoredPill and
  NotificationBell may need the noted padding/min-width tweak in the
  same commit — no follow-up.
- **Acceptance:**
  - `grep -rn "text-\[0\.[0-6][0-9]*rem\]\|text-\[1[01]px\]\|text-\[[0-9]px\]" apps/web/src/features/messages apps/web/src/features/listings apps/web/src/features/community apps/web/src/features/notifications apps/web/src/features/account` returns zero lines.
  - Typecheck passes.

### Task 6: Sweep — Expo mobile

- **Files:**
  - `apps/mobile/app/(app)/_layout.tsx` (edit) — `tabBarLabelStyle: { fontSize: 11 }` (line 94) → `fontSize: 12`
  - `apps/mobile/components/nav/NotificationBell.tsx` (edit) — `fontSize: 10` (line 69) → 12
  - `apps/mobile/components/nav/AppDrawerContent.tsx` (edit) — `fontSize: 10` (line 218) → 12
  - `apps/mobile/features/listings/components/BusinessCard.tsx` (edit) — `fontSize: 9` on SponsoredPill (line 195) → 12; `text-[10px]` on More Info (line 172) → `text-xs`
  - `apps/mobile/features/listings/components/StatCard.tsx` (edit) — `text-[10px]` → `text-xs`
  - `apps/mobile/features/community/components/PostCard.tsx` (edit) — `text-[11px]` → `text-xs`
  - `apps/mobile/features/community/components/MyPostRow.tsx` (edit) — `text-[10px]` → `text-xs`
- **What:** Mechanical bump on both `fontSize: <12>` (inline styles) and
  arbitrary NativeWind `text-[<12px>]`. Mobile Tailwind config
  (`apps/mobile/tailwind.config.js`) is generated — do **not** edit it;
  the sizes above are all in component files.
- **Acceptance:**
  - `grep -rn "fontSize:\s*\(9\|10\|11\)\b" apps/mobile` returns zero lines outside `node_modules` / `.expo`.
  - `grep -rn "text-\[1[01]px\]\|text-\[[0-9]px\]" apps/mobile` returns zero lines.
  - `pnpm typecheck` passes.
- **Pause if:** SponsoredPill on mobile (going 9→12, ~33% growth) or
  the bottom tab labels clip their region. Escalate rather than silently
  reshape the tab bar height.

## Open questions

None left blocking. The follow-ups (text-xs body/UI audit, ESLint rule)
are already captured in the backlog from the plan phase.
