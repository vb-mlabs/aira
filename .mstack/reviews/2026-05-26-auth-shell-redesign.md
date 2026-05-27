# Review: Auth shell redesign

**Date:** 2026-05-26
**Slug:** auth-shell-redesign
**Plan reviewed:** [2026-05-26-auth-shell-redesign.md](../plans/2026-05-26-auth-shell-redesign.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** Claude (with framer@millionlabs.co.uk as project lead)

---

## Summary

Plan is on-target for the Figma alignment: lift brand chrome into `(auth)/layout.tsx` on web, mirror via a shared `<AuthShell>` on mobile, drop the misleading "Email or Phone" label until phone OTP ships in S1.5. The review pass surfaced one blocker (`welcome.tsx` doesn't fit the AuthShell pattern — it's a brand hero, not a form) and three concerns (logo asset is only 112x112, "Welcome Back!" tension with the voice doc, existing hardcoded "by Nisarga" in marketing-nav). All four resolved via locked decisions. UI-Significant: yes (6 web UI files modified, ≥3 threshold; new mobile component but not in the heuristic's web scope). The Figma reference is detailed enough that a `/mlabs-mockup` gate would be redundant — fold it into Gate C only if you want exploration on the screens Figma doesn't cover (forgot-password, reset-password, verify-email).

## Findings

### Blockers (resolved before approval)

- **Mobile `welcome.tsx` doesn't fit the AuthShell pattern.** The screen is a full-page brand hero (large AIRA wordmark center, tagline, dual `Create account` / `Sign in` CTAs at the bottom) — not a form. Wrapping it in an `<AuthShell>` that's designed for "logo header + heading + form + footer" would flatten the hero's intended weight. **Resolved:** welcome stays standalone, NOT wrapped in `<AuthShell>`. The locked design tokens still apply (warm cream bg, olive primary on the Create-account CTA, secondary on Sign-in), but the structural composition stays as-is: full-screen, large hero. The redesigned tree-of-life logo (140x140) replaces the existing wordmark as the hero element. login/sign-up et al. inherit the smaller-header AuthShell treatment so the visual sequence reads welcome (hero) → login (form) — no visible logo duplication concern because the welcome render is markedly larger and centred.

### Concerns (raised, decided, recorded)

- **Concern:** The logo PNG at `apps/web/public/marketing-images/logo.png` (and `attached_assets/logo_1779693398049.png`) is only 112×112. The plan's "≥100px display" is fine on header use but soft-rendered on a 2x retina hero.
  **Decision:** AuthShell header renders at 80×80px (within 1:1 native, crisp), welcome hero renders at 140×140 (matches the marketing nav's existing scaling). Add a TODOS entry tracking the asset upgrade (2x PNG or SVG export) for the design-system pass — flagged but doesn't block this slice.

- **Concern:** Figma shows `Welcome Back!` with exclamation; `.mstack/design-system/DESIGN.md` voice doc forbids "playful micro-copy (Yay!)" — there's tension.
  **Decision:** Match the Figma exactly: `Welcome Back!` with title case + exclamation. The voice doc's anti-playful examples (Yay! / Oops!) are exclamatory interjections; "Welcome Back!" is a warm returning-user greeting in the same register as "Welcome home!". On-voice. Documented for future copy reviews.

- **Concern:** `apps/web/src/components/marketing/marketing-nav.tsx:30` already hardcodes the literal `"by Nisarga"`, plus `waitlist-card.tsx`, `about-editorial.tsx`, and `marketing-footer.tsx` mention "Nisarga" in narrative copy. The plan added `brand.parentName: "Nisarga"` but didn't migrate the existing hardcoded site.
  **Decision:** Migrate `marketing-nav.tsx:30` to `{brand.parentName}` in this slice (one-line edit, prevents drift). Leave `waitlist-card.tsx` ("Operated by Nisarga Group LLC.") and `about-editorial.tsx` ("where Nisarga began.") alone — those are narrative prose, not the brand attribution composition; touching them mid-sentence would force JSX expressions for prose readability they don't need. `marketing-footer.tsx`'s "Nisarga" mentions are in code comments — also fine to leave.

- **Concern:** The plan's instruction to "add paper-grain background style to the (auth) layout's root <main>" is redundant — the paper texture already paints on `<body>` via `--texture-paper` set in `apps/web/src/app/globals.css`. Adding it again on `<main>` would double-stack.
  **Decision:** Drop the `<main>` background-image edit from the touch list. The (auth) layout stays transparent over the body's paper grain. Note in T3.

- **Concern:** `/verify-email/page.tsx` is a real UI page (verifying / success / error states) with its own `<Suspense>` wrap for `useSearchParams`. The new (auth)/layout.tsx chrome wraps every page; the inner Suspense must not double-wrap or break.
  **Decision:** Verify-email's existing `<Suspense fallback={<div>Loading…</div>}>` stays inside the page; the layout chrome wraps from outside. Render tree is `layout (logo + footer) → page (Suspense → flow)`. Confirmed no nested Suspense issue (Next.js handles nested boundaries fine).

- **Concern:** Mobile fonts are still a stub — Cormorant + Lato don't actually load on iOS/Android per the TODOS entry. The redesign will inherit System fonts on real devices.
  **Decision:** Accept the gap for this slice; the TODO is tracked. NativeWind's `font-display`/`font-sans` classes resolve to System on mobile (no error) — visual will look System-ish until the pre-TestFlight font pass lands. Not blocking.

### Suggestions (taken)

- **Suggested:** Consolidate the per-screen edits into batched commits — each web auth page touch is the same conceptual change (heading copy + button text + signup link). One commit covering all 5 web auth pages reads more cleanly than five small commits. **Taken** — T4 batches the web pages, T6 batches the mobile auth screens. T3 (layout) and T7 (welcome) stay separate because they're structurally different.
- **Suggested:** Add a TODOS entry for the logo asset upgrade. **Taken** — folded into T8's roadmap/TODOS update.

## Decisions locked

Net new decisions beyond the plan:

- Welcome screen stays standalone (no AuthShell wrap). Logo on welcome hero renders at 140×140; AuthShell's header logo at 80×80.
- "Welcome Back!" matches Figma exactly (title case + exclamation).
- `marketing-nav.tsx:30` migrates to `{brand.parentName}` in this slice; narrative `Nisarga` prose in `waitlist-card.tsx` / `about-editorial.tsx` stays.
- Paper-grain texture stays on `<body>` only — (auth)/layout.tsx renders transparent.
- `/verify-email`'s inner Suspense stays intact; layout chrome wraps around it.
- Mobile font loading stays out of scope; System fallback accepted until the TODOS entry lands.

## Implementation plan

8 atomic tasks (one commit each). Web pages and mobile screens are batched per surface — the conceptual change is identical across the screens in each batch.

### Task 1: Add `brand.parentName` to config

- **Files:** `packages/config/src/brand.ts` (edit)
- **What:** Insert `parentName: "Nisarga"` after `legalEntity` in the `brand` object. The composition `${brand.name} by ${brand.parentName}` resolves to "AIRA by Nisarga" — the locked footer copy.
- **Acceptance:** `pnpm typecheck` green; `brand.parentName` is typed as `"Nisarga"` (literal); no runtime test needed (pure config).
- **Pause if:** an existing `parentName` / `parent` / similar field is already present (it isn't per the current `brand.ts` read — but worth a sanity check before adding).

### Task 2: Copy tree-of-life logo into mobile assets

- **Files:** `apps/mobile/assets/logo.png` (new — copy of `apps/web/public/marketing-images/logo.png`)
- **What:** `cp apps/web/public/marketing-images/logo.png apps/mobile/assets/logo.png`. Single file copy; no metadata changes. Establishes the path that `<AuthShell>` and welcome will `require()`.
- **Acceptance:** `file apps/mobile/assets/logo.png` reports `PNG image data, 112 x 112`. `git status` shows the new file under `apps/mobile/assets/`.
- **Pause if:** `apps/mobile/assets/logo.png` already exists with different content.

### Task 3: Web `(auth)/layout.tsx` — full brand chrome

- **Files:** `apps/web/src/app/(auth)/layout.tsx` (edit)
- **What:** Replace the orange-dot + wordmark `<Link>` with `<Image src="/marketing-images/logo.png" alt="AIRA" width={80} height={80}>` (next/image, centred above the card). Drop the radial gradient (the body paper-grain handles atmosphere). Append a `<footer>` after the card: `<p className="text-xs text-muted-foreground text-center">{brand.name} by {brand.parentName}</p>`. Layout structure becomes `<main flex flex-col items-center> → logo → card → footer`. The card itself stays (rounded-2xl border bg-card p-8 shadow-…). Don't add a `background-image` style — the body already paints the texture.
- **Acceptance:** Render `/login` in the dev server (or via curl) — the HTML output includes the `<img src="/marketing-images/logo.png" alt="AIRA"…>` element above the form card and the `<p>AIRA by Nisarga</p>` footer below it. `pnpm typecheck` + `pnpm lint` green (the no-brand-string-literal rule reads `brand.name` correctly; `brand.parentName` is a sibling field so the literal "Nisarga" only appears in `brand.ts`). The orange-dot span and the `<Link>` to `/` no longer appear in the layout.
- **Pause if:** the IdleBanner Suspense wrap on `/login` breaks under the new card placement — re-render the `/login?reason=idle` route and confirm the banner still appears above the form heading.

### Task 4: Web auth pages — Cormorant heading + olive CTA + copy alignment

- **Files (5):** `apps/web/src/app/(auth)/login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`, `verify-email/page.tsx`
- **What:** Per page, replace the `text-2xl font-bold tracking-tight` heading with `<h1 className="font-display text-3xl tracking-tight text-foreground">{copy}</h1>` (Cormorant via the font-display token wired into apps/web/src/app/globals.css). Update copy:
  - `/login` heading: `Welcome Back!` · subtitle: `Sign in to continue to {brand.name}.` · submit button: `Sign In` · signup link: `Sign Up` (centred at card bottom)
  - `/signup` heading: `Create your account` · subtitle: `A few details and you're in.` (existing — keep) · submit button: `Sign Up` · sign-in link: `Sign In`
  - `/forgot-password` heading: existing copy, just typography change
  - `/reset-password` heading: existing copy, just typography change
  - `/verify-email` heading: three states keep their existing copy (`Verifying your email…` / `Email verified` / `Couldn't verify`), all in Cormorant. The Suspense fallback `<div className="text-sm text-muted-foreground">Loading…</div>` stays unchanged.
  Form validation, submit handlers, schema usage stay untouched. Forgot-password link inside `/login` keeps its current `text-xs text-muted-foreground` styling.
- **Acceptance:** Render each route in dev — heading uses Cormorant Garamond (verify by `font-family` in DOM inspector or by visual feel — the serif is distinct). The IdleBanner on `/login?reason=idle` still appears above the heading. Forms submit successfully (the Playwright spec at `.mstack/qa/2026-05-26-1020/specs/admin-flow.spec.ts` continues to pass after this change — re-run as smoke check). `pnpm typecheck`, `pnpm lint`, `pnpm test` all green.
- **Pause if:** the `font-display` Tailwind class doesn't actually resolve to Cormorant on the (auth) routes (it should via globals.css's @theme inline — but the marketing page launch QA found font-* classes are silent no-ops if not declared in @theme; verify before assuming).

### Task 5: Mobile `<AuthShell>` component

- **Files:** `apps/mobile/components/AuthShell.tsx` (new)
- **What:** Single shared component:
  ```tsx
  export function AuthShell({ children }: { children: React.ReactNode }) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <KeyboardAvoidingView ...>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View className="flex-1 px-6 pt-6">
              <View className="items-center pt-8 pb-6">
                <Image source={require("../assets/logo.png")} style={{ width: 80, height: 80 }} />
              </View>
              {children}
            </View>
            <View className="items-center px-6 pb-6 pt-4">
              <Text className="text-xs text-mutedForeground">
                {brand.name} by {brand.parentName}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }
  ```
  Owns: SafeAreaView, keyboard avoiding, scroll behaviour, logo header at 80x80, footer. Children render between logo and footer.
- **Acceptance:** `apps/mobile/components/AuthShell.tsx` exists, default-exported, and `pnpm typecheck` resolves the `require("../assets/logo.png")` path. The Expo Image source pattern matches the existing `apps/mobile/lib/illustrations/*` precedent for asset imports.
- **Pause if:** Expo's Image component doesn't accept `require()` of PNG from this relative path — the asset bundler should handle it, but verify by booting the Expo dev server briefly.

### Task 6: Mobile auth screens — wrap in `<AuthShell>` + copy alignment

- **Files (6):** `apps/mobile/app/(auth)/login.tsx`, `sign-up.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify.tsx`, `check-email.tsx`
- **What:** Per screen: remove the inline wordmark `<View className="flex-row items-center"><View className="size-2 rounded-full bg-primary"/><Text>{brand.name}</Text></View>` (now in AuthShell), remove the outer `<SafeAreaView>` + `<KeyboardAvoidingView>` + `<ScrollView>` (now in AuthShell), wrap the screen's content in `<AuthShell>{...}</AuthShell>`. Heading styling becomes `<Text accessibilityRole="header" className="font-display text-4xl text-foreground">{copy}</Text>`. Copy aligned per Task 4 (mobile-equivalent: `Welcome Back!`, `Sign In`, etc.). Submit logic, validation, navigation stays untouched.
- **Acceptance:** `pnpm typecheck` green. Each screen file becomes meaningfully shorter (boilerplate moves to AuthShell). The mobile screens render the centred 80x80 logo header and the "AIRA by Nisarga" footer (verify by booting Expo briefly and screenshot — or accept the typecheck + structural review as sufficient for the code phase, with visual QA deferred to `/mlabs-qa`).
- **Pause if:** any screen-specific keyboard handling (custom `onSubmitEditing`, ref-passing between inputs) doesn't compose with AuthShell's wrapping `KeyboardAvoidingView` — Expo's behaviour around nested keyboard avoidance is finicky.

### Task 7: Mobile welcome screen — token alignment, NOT in AuthShell

- **Files:** `apps/mobile/app/(auth)/welcome.tsx` (edit)
- **What:** Replace the inline wordmark + the centre AIRA `<Text>` hero with a centred `<Image source={require("../../assets/logo.png")} style={{ width: 140, height: 140 }}>` above the brand name + tagline. Keep the dual CTA structure (Create account → primary, Sign in → secondary) at the bottom. Keep the standalone `<SafeAreaView>` layout (no AuthShell). Apply the Cormorant `font-display` class to the brand name heading.
- **Acceptance:** Welcome renders the tree-of-life logo at 140x140 centred above the brand name + tagline. Dual CTAs at the bottom unchanged. `pnpm typecheck` green.
- **Pause if:** the `flex-1 justify-center` on the inner view causes the logo to push the CTAs off-screen on small viewports (older iPhone SE width) — re-check the spacing values.

### Task 8: Migrate marketing-nav.tsx hardcode + roadmap/TODOS

- **Files:** `apps/web/src/components/marketing/marketing-nav.tsx` (edit) · `TODOS.md` (edit)
- **What:** In marketing-nav.tsx line 30, replace the literal `by Nisarga` with `by {brand.parentName}` (the file already imports `brand` from `@aira/config` — verify or add). In TODOS.md, add an entry for the logo-asset upgrade: "Tree-of-life logo PNG is 112×112. Header uses (80px) render crisp at 1x; welcome hero (140px) soft-renders on 2x retina. Export a 2x PNG or SVG via Figma and replace `apps/web/public/marketing-images/logo.png` + `apps/mobile/assets/logo.png`. Trigger: pre-TestFlight or first client review where someone notices."
- **Acceptance:** `grep -rn 'by Nisarga' apps packages` (excluding docs/tests/) returns only references where `{brand.parentName}` resolves to "Nisarga" — no remaining string literal in app code. TODOS.md gets the new entry. `pnpm lint` green (no-brand-string-literal still passes — the literal "Nisarga" only appears in `brand.ts`).
- **Pause if:** marketing-nav.tsx doesn't already import `brand` — would need an import edit too; verify the current import list.

## Open questions

For `/mlabs-code` to escalate rather than guess:

- **Mobile screen-specific keyboard behaviour vs AuthShell wrapping.** T6 lists this as a Pause-If. The risk is real — the existing login.tsx has a `<PasswordInput onSubmitEditing={submit}>` that may interact with AuthShell's outer KeyboardAvoidingView. If the keyboard-pop animation jitters or the password field gets covered, the fix is screen-specific spacing adjustments or moving KeyboardAvoidingView out of AuthShell back into each screen. `/mlabs-code` should pause and surface this to the user with a visual diagnosis rather than guessing at fixes.
- **`font-display` resolves to Cormorant on (auth) routes.** Per the marketing-page-launch QA learning in `.mstack/learnings.jsonl`, font-* utilities are silent no-ops if not declared in `@theme inline` in globals.css. The marketing page resolved this with an explicit `--font-display` declaration. (auth) routes inherit the same globals.css — should be fine — but Task 4's Pause-If covers the verification.
- **Verify-email Suspense double-wrap risk.** The page already wraps its flow in `<Suspense>` for useSearchParams. The new (auth) layout chrome wraps from outside. Next.js handles nested Suspense fine, but the visual fallback during the first paint (layout shows the chrome immediately, page's Suspense shows "Loading…" until token verification resolves) needs a sanity-check screenshot during /mlabs-code.
- **Should `/mlabs-mockup` run before code?** UI-Significant is `yes` (6 web files in the heuristic), but the Figma reference is concrete enough that mockup exploration would be redundant for `/login` and `/signup`. The screens Figma doesn't show (`/forgot-password`, `/reset-password`, `/verify-email`) follow the locked pattern by extrapolation. **Gate C is the user's call** — recommended: skip the mockup gate, the Figma is the spec.
