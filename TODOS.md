# TODOs (captured from reviews)

Items deferred from active phases. Each has a clear trigger condition for when to revisit. Add new TODOs at the bottom with date + source review.

---

## 2026-05-25 — Design system v1.0 (`/mlabs-design-system`)

Source: `.mstack/design-system/DESIGN.md` § Open questions + `design-system-v1-status` memory.

### Replace placeholder brand identity strings
- **Item:** `brand.supportEmail`, `brand.socialHandle`, `brand.url` in `packages/config/src/brand.ts` are placeholders (`support@aira.app`, `@aira_atl`, `https://aira.app`).
- **Trigger:** Before the first transactional email goes from prod, OR before the marketing site goes live — whichever comes first.

### Confirm tagline copy with client
- **Item:** `brand.tagline = "ROOTS & REACH"` matches the wordmark. Landing hero may want a longer line ("Atlanta's Indian community, rooted and reaching.") or stay as the bare wordmark.
- **Trigger:** When content / brand-voice work begins, or first client review of the landing mockup.

### Client review of dark theme
- **Item:** Dark mode is an extrapolation by the design system — Figma only has light. The coffee/leather warm dark needs client sign-off before being exposed to users.
- **Trigger:** Before enabling dark mode in production, OR if a client request surfaces dark mode as a requirement.

### Paper-grain texture asset fallback
- **Item:** Page background uses CSS-only SVG `feTurbulence` noise. If client says it reads as "synthetic" or "fake", export the two Figma textures (cream paper + green paper) and swap `--texture-paper` / `--texture-paper-green` in `apps/web/src/app/globals.css` to `background-image: url('/textures/cream.png')` style references.
- **Trigger:** First client design review where the texture is critiqued, OR if visual QA on real devices shows the noise pattern repeating awkwardly.

### Mobile native typography
- **Item:** `apps/mobile/lib/fonts/index.ts` is a stub. To actually load Lato + Cormorant Garamond on iOS/Android: `pnpm add @expo-google-fonts/lato @expo-google-fonts/cormorant-garamond expo-font` and follow inline instructions. Then update `scripts/gen-mobile-tailwind.ts` `fontFamily` mapping (currently `Geist`/`System`) to `Lato`/`CormorantGaramond` and re-run `pnpm gen:mobile-tw`.
- **Trigger:** Before first TestFlight / Play Console internal-track upload. Mobile typography must look right on real devices.
