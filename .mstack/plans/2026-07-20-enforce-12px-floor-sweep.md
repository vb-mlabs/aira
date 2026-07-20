# Plan: Enforce the 12px absolute font-size floor across components

**Date:** 2026-07-20
**Slug:** 2026-07-20-enforce-12px-floor-sweep
**Status:** implemented
**Author:** framer@millionlabs.co.uk

---

## Problem

QA reports fonts are too small across the app. Root cause traced during
the design-system consultation earlier today: `DESIGN.md` v1 (2026-05-25)
already documented a "body text never below 14px" invariant tied to the
PRD's older-demographic persona, but many components drifted below that
floor over time.

The 2026-07-20 DESIGN.md revision clarified the rule: **14px minimum for
body/UI text, 12px minimum for decorative micro-labels (badges, chips,
pills), and nothing below 12px anywhere**. This plan enforces the hard
part of that rule — the absolute 12px floor. The `text-xs → text-sm`
audit for body/UI text is a separate follow-up plan (scoped out below).

Who benefits: every end user, especially the older-demographic persona
the PRD calls out.

## Scope

**In:**
- Sweep every `text-[<0.75rem>]`, `text-[<12px>]`, and mobile
  `fontSize: <12>` usage. Promote to `text-xs` (0.75rem = 12px) on web
  or `fontSize: 12` on mobile. This is a pure mechanical bump —
  no other class changes, no layout rewrites.
- Include the mobile drawer's `tabBarLabel` fontSize (currently 11) so
  the mobile bottom tab labels comply.
- Update `BusinessCard`'s `SponsoredPill` (currently `text-[0.55rem]`
  → the biggest jump, ~3.2px growth) and the "More Info" link
  (`text-[0.65rem]` → 12px, ~1.6px growth). Both are visual affordances
  that will noticeably grow; padding may need adjustment to keep the
  pill/link tidy — see edge cases.

**Out (deferred):**
- The `text-xs → text-sm` audit for body/UI text (208 `text-xs`
  usages on web alone). Requires per-callsite judgment (which are
  micro-labels? which are body?) — a separate plan
  (`.mstack/plans/<future>-textxs-body-audit.md`). Filed to backlog.
- Type-scale token changes (e.g. redefining `xs` upward). Explicitly
  ruled out during the design-system consultation — the ramp stays put.
- Automated lint rule flagging future sub-12px usages. Nice-to-have
  follow-up; filed to backlog.
- `/design/page.tsx` — intentionally exempted (the page's job is to
  demo the type scale, including small sizes; sweeping would break the
  demo). Exemption documented at the top of the sweep task.

## Approach

Mechanical sweep grouped by area, one atomic commit per group, so the
diff is reviewable in chunks that map to functional surfaces. Each
promotion is the same shape:

```
- className="… text-[0.65rem] …"
+ className="… text-xs …"

- className="… text-[10px] …"
+ className="… text-xs …"

- className="… text-[11px] …"
+ className="… text-xs …"

- className="… text-[0.55rem] …"
+ className="… text-xs …"

- style={{ …, fontSize: 9|10|11 }}  (mobile)
+ style={{ …, fontSize: 12 }}
```

Grouping strategy: shell → pages → marketing → admin → feature → mobile.
The task list below concretizes this.

**Alternatives considered:**

- **Single mega-commit** — rejected. 40+ file diff would be a nightmare
  to review; if a promotion breaks a specific layout, isolating the
  offender is easier with atomic per-area commits.
- **Automated codemod** — rejected. The mechanical transform is trivial
  enough that manual per-file editing is faster than writing + testing
  a jscodeshift script for a one-shot sweep. Also lets us catch
  padding-tweak needs (SponsoredPill) inline.
- **Sweep and simultaneously audit text-xs → text-sm** — rejected per
  the scope-locking question. Two problems, two plans.

## Data model changes

None.

## Files to touch

**New:**
- None.

**Edit (organized as one task per group; grep-verified list of hard
violations from the design-system consultation earlier today):**

Web — shell (Task 1):
- `apps/web/src/app/error.tsx` — 2× `text-[11px]`
- `apps/web/src/app/not-found.tsx` — 1× `text-[11px]`
- `apps/web/src/app/(app)/_components/app-sidebar.tsx:169` — `text-[0.65rem]` (the "by Nisarga" tagline)
- `apps/web/src/app/(app)/_components/bottom-tab-bar.tsx:51` — `text-[0.65rem]`

Web — account + admin pages (Task 2):
- `apps/web/src/app/(app)/account/page.tsx` — 2× `text-[0.65rem]`
- `apps/web/src/app/(app)/account/terms/page.tsx` — 1× `text-[0.65rem]`
- `apps/web/src/app/admin/page.tsx` — 1× `text-[0.65rem]`

Web — marketing (Task 3):
- `apps/web/src/components/marketing/phone-showcase.tsx` — 1× `text-[11px]`
- `apps/web/src/components/marketing/business-cta-pair.tsx` — 1× `text-[11px]`
- `apps/web/src/components/marketing/marketing-footer.tsx` — 2× `text-[11px]`
- `apps/web/src/components/marketing/marketing-nav.tsx` — 1× `text-[11px]`

Web — admin components (Task 4):
- `apps/web/src/features/admin/components/audit-table.tsx` — 1× `text-[11px]`
- `apps/web/src/features/admin/components/category-tree-manager.tsx` — 1× `text-[10px]`
- `apps/web/src/features/admin/components/business-owner-picker.tsx` — 1× `text-[10px]`
- `apps/web/src/features/admin/components/user-detail.tsx` — 1× `text-[0.65rem]`
- `apps/web/src/features/admin/components/business-detail.tsx` — 4× `text-[0.65rem]`
- `apps/web/src/features/admin/community/status-filter.tsx` — 1× `text-[10px]`
- `apps/web/src/features/admin/community/post-detail-modal.tsx` — `text-[11px]` + `text-[10px]`
- `apps/web/src/features/admin/community/comment-moderation.tsx` — `text-[11px]` + `text-[10px]`
- `apps/web/src/features/admin/waitlist/waitlist-counts-header.tsx` — 1× `text-[0.65rem]`
- `apps/web/src/features/admin/waitlist/waitlist-tabs.tsx` — 1× `text-[10px]`
- `apps/web/src/features/admin/renewals/followup-modal.tsx` — `text-[11px]` + `text-[10px]`

Web — feature components (Task 5):
- `apps/web/src/features/messages/components/thread.tsx` — 2× `text-[0.65rem]`
- `apps/web/src/features/listings/components/stat-card.tsx` — 1× `text-[0.65rem]`
- `apps/web/src/features/listings/components/business-card.tsx` — 2× `text-[0.65rem]` (More Info link) + 1× `text-[0.55rem]` (SponsoredPill) — **the biggest jump**; padding tweak may be needed
- `apps/web/src/features/community/components/my-posts-list.tsx` — 1× `text-[10px]`
- `apps/web/src/features/community/components/post-detail-modal.tsx` — 2× `text-[11px]`
- `apps/web/src/features/community/components/post-card.tsx` — 1× `text-[11px]` + 4× `text-[10px]` (status pills)
- `apps/web/src/features/community/components/comment-thread.tsx` — 2× `text-[11px]`
- `apps/web/src/features/notifications/components/notification-bell.tsx` — 1× `text-[0.65rem]`
- `apps/web/src/features/account/components/my-listings-card.tsx` — 1× `text-[10px]`

Mobile (Task 6):
- `apps/mobile/app/(app)/_layout.tsx:94` — `tabBarLabelStyle: { fontSize: 11 }` → 12
- `apps/mobile/components/nav/NotificationBell.tsx:69` — `fontSize: 10` → 12
- `apps/mobile/components/nav/AppDrawerContent.tsx:218` — `fontSize: 10` → 12
- `apps/mobile/features/listings/components/BusinessCard.tsx:195` — `fontSize: 9` (SponsoredPill) → 12; ditto `text-[10px]` at line 172 (More Info analogue)
- `apps/mobile/features/listings/components/StatCard.tsx:18` — `text-[10px]` → `text-xs`
- `apps/mobile/features/community/components/PostCard.tsx:44` — `text-[11px]` → `text-xs`
- `apps/mobile/features/community/components/MyPostRow.tsx:59` — `text-[10px]` → `text-xs`

## Edge cases

- **`BusinessCard` SponsoredPill: `text-[0.55rem]` → `text-xs`** is the
  largest jump (~3.2px growth). The pill's `px-1.5 py-px` padding was
  sized for the smaller text; the pill may look chunky after the
  promotion. Verify visually in the dev browser; if it dominates the
  card, reduce horizontal padding one notch (`px-1.5` → `px-1`) inline
  with the promotion. This is the ONE task where a padding tweak is
  in-scope; everywhere else, only the size class changes.
- **`BusinessCard` "More Info" link: `text-[0.65rem]` → `text-xs`**
  (~1.6px growth). Same considerations as above but smaller magnitude;
  no padding tweak expected.
- **Mobile bottom tab bar labels** currently 11px. Bumping to 12 costs
  ~4px vertical (line-height grows too). Screens with tight tab-bar
  regions may need a quick eyeball to confirm nothing clips.
- **Bell badge (`notification-bell.tsx`)** uses `text-[0.65rem]` inside
  a tiny circle. Growing to 12px may need `min-w-[1.1rem]` → `min-w-[1.25rem]`
  so the number stays centered. Verify visually; tweak inline if needed.
- **Marketing footer + nav uppercase 11px labels** with `tracking-[3px]` /
  `tracking-[2px]`. The letter-spacing was tuned for 11px; at 12px the
  labels will feel slightly looser. Acceptable — the tracking token
  stays; only the size promotes.
- **Test files** — none currently reference these class strings by
  literal match. If a snapshot test does, it'll fail and needs a
  regenerate; not expected but worth grepping during code phase.

## Acceptance criteria

- [ ] `grep -rn "text-\[0\.[0-6][0-9]*rem\]\|text-\[[0-9]px\]\|text-\[1[01]px\]" apps/web/src` returns zero results **except** matches under `apps/web/src/app/(app)/design/page.tsx` (explicitly exempted).
- [ ] `grep -rn "fontSize:\s*\(9\|10\|11\)\b" apps/mobile` returns zero results (except any inside `node_modules` or `.expo`).
- [ ] `grep -rn "text-\[1[01]px\]\|text-\[[0-9]px\]" apps/mobile` returns zero results.
- [ ] Every promoted usage changes ONLY the size class (or `fontSize`);
      no unrelated className rewrites, no layout changes. Exception:
      `BusinessCard` SponsoredPill may lose one horizontal padding
      notch to compensate — see edge case.
- [ ] `pnpm typecheck` + `pnpm lint` pass across the monorepo.
- [ ] Each of the 6 area tasks is a single atomic commit.

## Open questions

For the reviewer (`/mstack-review`) to resolve before implementation.

- **Padding compensation on SponsoredPill.** Should the padding tweak
  be scoped in this plan (Task 5) or filed as a separate visual polish
  after seeing the result? Recommend: in-scope; the plan already flags
  the ~3.2px growth as the biggest jump so tweaking padding in the
  same commit avoids a follow-up.
- **Marketing files.** `components/marketing/*` is opt-out
  content-heavy code (per CLAUDE.md's mention of marketing being
  content). Should marketing files be swept in the same run as
  product UI, or split into a marketing-owned task? Recommend: same
  run — the floor rule applies to marketing too, and the changes are
  identical shape.
- **Task granularity.** 6 area tasks vs one big mechanical sweep.
  Recommend: 6 tasks — reviewable atomically, isolates any
  padding-tweak surprises to the offending commit.
- **Snapshot tests.** No existing snapshot tests target these class
  strings today (verified by grep during plan). If any surface during
  code phase, regenerate them in the same commit.
