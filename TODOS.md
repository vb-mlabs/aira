# TODOs (captured from reviews)

Items deferred from active phases. Each has a clear trigger condition for when to revisit. Add new TODOs at the bottom with date + source review.

---

## 🎯 Next EAS native build (version 0.1.2) — bundled scope

Items that **cannot** ship via OTA because they touch native config, native modules, or the install-time dep tree. Whenever the next `eas build --profile production --platform all` is warranted (a plugin change, another SDK bump, or accumulated urgency), these ride together in one build → one store submission → one review cycle.

**When to trigger**: any single one of these becomes urgent, OR the list gets large enough that the store-review cost is amortized. Not urgent as of 2026-07-30 (OTAs #1–#4 landed the JS-side fixes; users on 0.1.1 are functional).

### Bundle contents

- **[HIGH] `expo-intent-launcher` for Android Open-Gmail button.** Currently on Android the "Open Gmail" button on `/check-email` opens Gmail *web* in a browser because JS-only can't launch a specific Android app. `expo-intent-launcher` unlocks `Intent.ACTION_MAIN + CATEGORY_APP_EMAIL` (system email-app chooser) or explicit `com.google.android.gm` package launch. Wire in `apps/mobile/app/(auth)/check-email.tsx`'s `openMail` (see the comment block there for the RN-limit context). — *originally: expo 2026-07-30-1654*

- **[HIGH] Wire Sentry (`@sentry/react-native` via its Expo config plugin).** `expo.monitoring` in `.mstack/config.json` is currently `none` — every OTA we've shipped this quarter went out without crash-signal observability. Rollback decisions have been on user-reports-only. Native change (SDK ships with native modules). Repeatedly flagged across every recent expo release report. — *originally: expo 2026-07-08-1816, then 2026-07-13-1700, 2026-07-20-1900, 2026-07-27-1330, 2026-07-29-0856*

- **[MED] Patch-bump `expo` + `expo-updates`.** `expo 54.0.35 → ~54.0.36`, `expo-updates 29.0.18 → ~29.0.19`. expo-doctor flags on every preflight. Harmless for OTA today but blocks a clean native build and could bite when the JS bundle assumes newer API. — *originally: expo 2026-07-20-1900, then 2026-07-24-0921, 2026-07-27-1330, 2026-07-29-0856*

- **[MED] Dedup React 19.1.0 / 19.2.4.** The 2026-07-27 vuln fix (`e2be247`) introduced `use-sync-external-store` which brought React 19.2.4 alongside the existing 19.1.0. Resolve via a `pnpm.overrides` entry pinning both `react` and `react-dom`. Bundle-time-only concern (Metro dedups for JS), but a native build with duplicate React can cause hook-instance issues on RN side. Also cleans up the ui-web dupe from the earlier avatar consolidation. — *originally: expo 2026-07-08-1816, expo 2026-07-24-0921, expo 2026-07-27-1330, expo 2026-07-29-0856*

### After the build ships, downstream cleanup

- Bump the "Current runtime in the field" line in `CLAUDE.md` to reference the new native version (`0.1.2` on build 9 or whatever the auto-increment lands at).
- Revisit the Android "Open Gmail" button label — probably back to "Open Mail" once `expo-intent-launcher` is doing the real work, since Android users will land in their actual mail app not just Gmail.
- Drop the `expo/expo-updates patch drift` + `dedup React` items below (they'll be resolved).

---

## 📮 Waiting for next web Publish (Replit Deploy)

These are on the branch but need a Replit Publish to reach prod. Ship next time you Publish web for any reason.

- **`28f18d3`** — `chore(web/auth): forward expiresInMinutes through Better Auth adapter` — fixes silent drift between token TTL and email copy.
- **`7ecb4db`** — `chore(web/auth): temp debug logging on /get-session + /sign-out` — the auth-debug logging that helped diagnose the iOS cookie residue. **Should be removed once the sign-out fix (OTA #3) is confirmed working in prod** — see the removal-note TODO below.

---

## 🌐 Not code — deliverability + config

- **[HIGH] Postmark deliverability audit** for `airabynisarga.com`: verify SPF, DKIM, DMARC DNS records; confirm sender signature is "Verified" in Postmark dashboard; check sender reputation score. Actual root cause of "emails come late" reports — the code-side (Postmark integration, `sendEmail` call) is fine; delivery is dashboard/DNS work. Cooldown bumps (30→60→300s in OTA #1/#2) are mitigations, not cures. — *originally: expo 2026-07-30-1517*

- **Add `EXPO_TOKEN` as a dedicated Replit secret.** Currently we alias `EXPO_ACCESS_TOKEN` when running `eas update`. Works, but a real `EXPO_TOKEN` secret removes the aliasing tax on every OTA. — *originally: expo 2026-07-29-0856*

- **Verify sign-out fix in the wild** for another 24-48h. OTA #3 (`0e25904b`, credentials:omit) was the first fix with actual evidence backing it (iOS cookie residue confirmed via auth-debug logs). If any user still reports sign-out no-op after force-close cycle, get device logs BEFORE another code change. — *originally: expo 2026-07-30-1517*

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
- [ ] SubcategoryPicker.tsx has 8 raw color literals (MUTED, FOREGROUND, ACCENT + menu chrome rgba/hex). Pre-existing; not introduced by the pill-parity fix. Move to design tokens on the next sweep of this file. — *fix 2026-07-06-1619-mobile-subcategory-picker-parity, 2026-07-06*
- [ ] Mobile runtime theme file apps/mobile/lib/theme/tokens.ts is stale — has near-grayscale values while the actual generated tailwind.config.js uses the warm-brown palette (foreground #301d0d, primary #496036, mutedForeground #66503f). Consumers that call useThemeColors() would get the wrong colors. Fix: source both files from packages/config/src/design.ts via shared codegen (extend gen:mobile-tw to also emit theme/tokens.ts), then sweep RN raw-literal consumers (SubcategoryPicker + any others flagged by check-token-drift). Needs /mstack-plan — bigger than a fix. — *fix 2026-07-06-1619-mobile-subcategory-picker-parity, 2026-07-06*
- [ ] Clean up packages/ui-web's react@19.2.4 devDep before the next native EAS Build (also unlocks the ui-web unit test infra deferred in the avatar consolidation) — *expo 2026-07-08-1816, 2026-07-09*
- [ ] Wire Sentry (@sentry/react-native via Expo config plugin) before next native build so post-OTA crash-free sessions are observable — *expo 2026-07-08-1816, 2026-07-09*
- [x] Admin sendPasswordResetTo (apps/web/src/server/operations/admin.ts:121) doesn't pass redirectTo — same empty-callbackURL bug as forgot-password web page — *resolved ee10363*
- [x] Mobile forgotPasswordRequest (apps/mobile/features/auth/api.ts:107) doesn't pass redirectTo — needs a web URL for universal-link handoff — *resolved c91368d*
- [ ] Stand up React Testing Library in apps/web/tests/ — dedupe React in vitest.config so RTL renders work, then add a regression test for forgot-password page's absolute redirectTo — *fix reset-password-callback-empty, 2026-07-13*
- [x] Web signup (apps/web/src/app/(auth)/signup/page.tsx:39) — signUp.email() has no redirectTo; verify-email link on signup has same empty-callbackURL bug — *resolved 0768d08*
- [x] Mobile resendVerifyRequest (apps/mobile/features/auth/api.ts:136) — no redirectTo; verify-email link on resend has empty callbackURL — *resolved c91368d*
- [ ] subscriptions-section.tsx and sponsorships-section.tsx swallow fetch errors with '.catch(() => {})' — even after the permission fix, network/DB failures surface as empty dropdowns with no toast. Surface an inline error state instead. — *fix admin-plan-tier-dropdowns-empty, 2026-07-13*
- [ ] Sweep every 'permission: super_admin' LIST op across apps/web/src/server/operations/*. This bug likely isn't the only place a super_admin gate leaks into an admin workflow — read-only LIST ops should be admin, only catalog-mutating writes should be super_admin. — *fix admin-plan-tier-dropdowns-empty, 2026-07-13*
- [ ] Playwright admin RSC route 404 despite valid session — spec beforeEach that logs in via UI works for page.request.* but not page.goto to admin pages. Fix by minting the session cookie storageState via an equivalent of apps/web/e2e/global-setup.ts (write the signed BetterAuth cookie into the storage state file). Related to the standing RTL infra follow-up for apps/web/tests/. — *qa 2026-07-13-1445, 2026-07-13*
- [ ] Wire @sentry/react-native crash reporting before next OTA — shipping without monitoring means we have no signal to gate rollback decisions on — *expo 2026-07-13-1700, 2026-07-14*
- [ ] Migrate EXPO_PUBLIC_API_BASE_URL from eas.json build.env + .env.production.local to EAS environments so build + OTA share one source via --environment <env> — *expo 2026-07-13-1700, 2026-07-14*
- [ ] Add cross-field .refine() end_date >= start_date on SponsorshipCreate + Update input schemas so inverted dates surface as a friendly Zod error instead of a raw DB CHECK 400. — *review 2026-07-20-admin-edit-sponsorship, 2026-07-20*
- [x] Bring post-hoc evidence upload to subscriptions (mirror the sponsorship inline-dropzone pattern), so admins don't have to recreate a subscription to attach missing evidence. — *review 2026-07-20-admin-edit-sponsorship, 2026-07-20* — absorbed by plans/2026-07-20-admin-edit-subscription.md
- [ ] Manual 'recompute sponsorship status now' admin action so a wrongly-expired row can be re-activated without waiting up to 24h for the cron. — *review 2026-07-20-admin-edit-sponsorship, 2026-07-20*
- [ ] Capture a diff payload in business.sponsorship_updated audit meta (from/to for changed fields) so auditors can reconstruct what changed. — *review 2026-07-20-admin-edit-sponsorship, 2026-07-20*
- [ ] Verify no operational tooling enumerates subscription evidence by literal 'business-subscriptions/' storage prefix — new subscription uploads now land at 'subscriptions/' after commit 41734a7. Two-prefix lookup may be needed for historical rows. — *code 2026-07-20-admin-edit-sponsorship, 2026-07-20*
- [ ] Helper-line copy in the subscription Edit dialog explaining the paid → overdue cron rollover, so admins understand why a manual 'paid' set on a past-end-date row may revert next day. — *review 2026-07-20-admin-edit-subscription, 2026-07-20*
- [ ] Extract a shared <EvidenceCell /> component (currently copy-pasted between sponsorships-section.tsx and subscriptions-section.tsx). Do this at rule-of-three — a third caller. — *review 2026-07-20-admin-edit-subscription, 2026-07-20*
- [ ] Capture a diff payload in business.subscription_updated audit meta (from/to for changed fields) so auditors can reconstruct what changed — symmetric to the sponsorship deferral. — *review 2026-07-20-admin-edit-subscription, 2026-07-20*
- [ ] text-xs → text-sm audit for body/UI text (200+ text-xs usages on web alone). Requires per-callsite judgment: keep on micro-labels (badges, pills, chips), promote elsewhere. Second half of the DESIGN.md 14px floor enforcement — this plan only handled the absolute 12px floor. — *plan 2026-07-20-enforce-12px-floor-sweep, 2026-07-20*
- [ ] ESLint rule flagging text-[<Xrem>] and text-[<Xpx>] arbitrary sizes below 0.75rem (and mobile equivalents for fontSize numeric literals < 12). Nice-to-have safety net so the 12px floor doesn't drift again. — *plan 2026-07-20-enforce-12px-floor-sweep, 2026-07-20*
- [ ] Mobile back-nav on business detail skips /listings/<sub> and lands on Home/Post. Escalated to /mstack-debug — see .mstack/fixes/2026-07-20-1745-back-nav-skips-listings-screen.md for the bounded-look findings and hypotheses list. — *fix 2026-07-20-1745-back-nav-skips-listings-screen, 2026-07-20*
- [ ] Wire Sentry (@sentry/react-native via Expo config plugin) — 2026-07-20 OTA to production shipped without crash monitoring; flying blind on crash-free sessions. Flip expo.monitoring in mstack config to sentry once wired. — *expo 2026-07-20-1900, 2026-07-20*
- [ ] Patch-bump expo 54.0.35→~54.0.36 and expo-updates 29.0.18→~29.0.19 before the next native build. OTA-safe today; will bite if a JS bundle assumes the newer API. — *expo 2026-07-20-1900, 2026-07-20*
- [ ] Resume preview-then-production sequence for the next OTA. 2026-07-20-1900 skipped preview at explicit user direction — not the default. — *expo 2026-07-20-1900, 2026-07-20*
- [ ] Bulk-delete of expired posts on /account/posts (quick-action to free cap slots) — *plan 2026-07-22-post-cap-3-active, 2026-07-23*
- [ ] Admin per-user post-cap override (super_admin only) — *plan 2026-07-22-post-cap-3-active, 2026-07-23*
- [ ] Notify user (push + email) when a post expires so they can post again — *plan 2026-07-22-post-cap-3-active, 2026-07-23*
- [ ] Analytics events for cap-reached / cap-exceeded submit attempts — *plan 2026-07-22-post-cap-3-active, 2026-07-23*
- [ ] Promote MAX_ACTIVE_POSTS_PER_USER from constant to app_setting row (mirrors posts_expiry_days precedent) if the number ever needs runtime tuning — *plan 2026-07-22-post-cap-3-active, 2026-07-23*
- [ ] /mstack-qa the community cap-reached UX on both surfaces — server-side boundary is unit-tested (7/7) but the client CTA gate + invalidation flip needs manual/scripted repro with a seeded 3-post user. — *code 2026-07-22-post-cap-3-active, 2026-07-24*
- [ ] Type-scale QA on-device after OTA group 0be52a62 — check mobile home hero, listings cards, /account/posts row heights at the new sizes; roll back to 436f4b58 if anything looks broken. — *expo 2026-07-24-0921, 2026-07-24*
- [ ] expo-doctor dedupe follow-up — bump expo to ~54.0.36 and expo-updates to ~29.0.19 via env: load .env.local
env: export EXPO_PUBLIC_API_BASE_URL; resolve react 19.1.0/19.2.4 dupe via pnpm.overrides. Do BEFORE next native build. — *expo 2026-07-24-0921, 2026-07-24*
- [ ] Investigate notifications 'Post not found' — usePost(id) returns null for some comment-reply notification post_ids; likely visibility/status filter on the community post fetch — *expo 2026-07-24-1547, 2026-07-24*
- [ ] Verify /post/[id] modal presentation feels right on real devices; if cross-tab dismiss reads awkward, evaluate a top-level modal group instead of the per-stack presentation flag — *expo 2026-07-24-1547, 2026-07-24*
- [ ] Consolidate apps/mobile/lib/format-phone.ts + apps/web/src/lib/format-phone.ts into a shared package once a third consumer appears — *expo 2026-07-24-1832, 2026-07-24*
- [ ] Verify /account/notification/[id] modal on real device — first ship, focus on presentation feel + Read all not clipping + +1 phone/WhatsApp display + tap-to-call routing — *expo 2026-07-24-1832, 2026-07-24*
- [ ] Verify cross-tab back-nav on real device: Home → biz card → arrow back + bottom Go back both return to Home; Categories → sub → biz → back returns to sub — *expo 2026-07-24-2145, 2026-07-24*
- [ ] Wire jest-expo (already in devDeps) as the mobile package's test runner so apps/mobile/lib/nav/__tests__/goBackTo.test.ts runs via pnpm test instead of the standalone vitest.config.ts trick; remove the standalone config once done — *fix 2026-07-27-1155-back-nav-cross-tab-nested, 2026-07-27*
- [ ] Real-device smoke on Expo Go: sign up on mobile, tap verify email on the same phone, confirm the app opens (not the browser) and the user lands in /(app). Repeat for password reset (forgot-password → email → tap → app opens on /reset-password screen). — *fix 2026-07-27-1225-auth-emails-open-web, 2026-07-27*
- [ ] Extend push-notification fan-out to post_interest events (someone marks interest on your community post) using the same sendPushToUser helper introduced by this plan — *plan 2026-07-27-community-push, 2026-07-27*
- [ ] Extend push-notification fan-out to direct messages (message kind) using the same sendPushToUser helper — *plan 2026-07-27-community-push, 2026-07-27*
- [ ] Stand up a cron/edge job that polls Expo's /receipts endpoint for notification_delivery rows with ticket_id + status=pending — full reconciliation for DeviceNotRegistered / MessageTooBig / MismatchSenderId that surface only in the delayed receipt (broadcast + per-user paths both benefit) — *plan 2026-07-27-community-push, 2026-07-27*
- [ ] Consider per-event push opt-outs (push_on_post_comment_reply column on user table + toggle UI on /account/notifications) if user complaints surface post-launch. MVP posture is 'device-registered = all pushes'. — *plan 2026-07-27-community-push, 2026-07-27*
- [ ] Confirm EXPO_ACCESS_TOKEN is set in prod env before running the community-push smoke test on real devices; sender log-and-returns silently on missing token, so a missing prod env would ship a feature that silently no-ops — *review 2026-07-27-community-push, 2026-07-27*
- [ ] Real-device smoke on Expo Go: two accounts, User A comments on User B's post, User B receives push and taps to land on /(app)/account/notification/[id]. Also test the reply case and the cold-start-via-push case (iOS force-quit → tap push from lock screen). — *code 2026-07-27-community-push, 2026-07-27*
- [ ] Verify EXPO_ACCESS_TOKEN is set in prod env before comment-driven traffic actually needs the push fan-out — the sender log-and-returns silently on missing token, so a missing env would ship a feature that silently no-ops. — *code 2026-07-27-community-push, 2026-07-27*
- [ ] Watch for user reports over the next 24h — no Sentry wired (expo.monitoring: none), so regressions surface via manual report only. Rollback via eas update:republish --branch production --group <prior-group-id> if anything critical breaks. — *expo 2026-07-27-1330, 2026-07-27*
- [ ] Before the NEXT eas build: bump expo ~54.0.35 → ~54.0.36, expo-updates 29.0.18 → 29.0.19, resolve the duplicate-react (workspace pnpm.overrides for react + react-dom). Doctor calls all three out; harmless for OTA but blocks a clean native build. — *expo 2026-07-27-1330, 2026-07-27*
- [ ] Wire @sentry/react-native via its Expo config plugin so post-OTA crashes are visible without user reports. Ships with next native build (native change → EAS Build required). — *expo 2026-07-27-1330, 2026-07-27*
- [ ] Consider a renewal_status column on business_subscription + Kanban pipeline view (option 3 from earlier analysis). Real architectural improvement but a schema migration + audit-meta rewrite. Only worth it if the admin team wants a full pipeline dashboard. — *plan 2026-07-27-renewals-visibility, 2026-07-27*
- [ ] If admins complain that ?showAll resets on every fresh page load, persist as user preference (user.preferences JSON) — cheap to add via existing user-preferences validator surface. — *plan 2026-07-27-renewals-visibility, 2026-07-27*
- [ ] Consider surfacing active-sponsorship state on renewal queue rows — same 'customer engagement' surface; sponsorship changes the operator's talk track. Out of scope for the visibility pass but worth flagging. — *plan 2026-07-27-renewals-visibility, 2026-07-27*
- [ ] LATERAL JOIN refactor of listQueue — collapse 5 correlated subqueries into one JOIN per row. Blocked by the 2026-06-10 decision that Drizzle's .orderBy() builder can't compose LATERAL; revisit if the correlated-subquery count becomes measurable or a Drizzle upgrade lifts the constraint. — *review 2026-07-27-renewals-visibility, 2026-07-27*
- [ ] Fix expo/expo-updates patch drift + dedup React 19.1/19.2 before next native build — *expo 2026-07-29-0856, 2026-07-29*
- [ ] Add EXPO_TOKEN as a Replit secret so future OTAs don't need EXPO_ACCESS_TOKEN aliasing — *expo 2026-07-29-0856, 2026-07-29*
- [ ] Wire Sentry (@sentry/react-native) — expo.monitoring is currently 'none', we have no signal for OTA rollback — *expo 2026-07-29-0856, 2026-07-29*
- [ ] Verify sign-out fix (Updates.reloadAsync) actually resolves the recurrent bug; if user reports again, get device logs BEFORE another blind fix — *expo 2026-07-30-1517, 2026-07-30*
- [ ] Postmark deliverability audit — SPF/DKIM/DMARC on airabynisarga.com + sender-signature verification in Postmark dashboard. Actual cause of 'emails come late'. — *expo 2026-07-30-1517, 2026-07-30*
- [ ] Remove auth-debug logging in apps/web/src/app/api/auth/[...all]/route.ts once iOS cookie-residue hypothesis is confirmed or ruled out (fourth-recurrence sign-out investigation) — *auth-debug 2026-07-30, 2026-07-30*
- [ ] Bundle expo-intent-launcher in next native build (0.1.2). Wire Android openMail to Intent.ACTION_MAIN + CATEGORY_APP_EMAIL for system email-app chooser (or explicit com.google.android.gm package). See apps/mobile/app/(auth)/check-email.tsx:49-70 openMail comment. — *expo 2026-07-30-1654, 2026-07-30*
- [ ] audit adjacent chromed surfaces for the same fixed-height-without-inset anti-pattern (TopBar, per-screen headers, any fixed footer) — *fix 2026-08-03-android-tab-bar-safe-area, 2026-08-03*
