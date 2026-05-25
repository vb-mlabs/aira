# Contributing — mobile/

Expo (SDK 51+) sibling app to the Next.js web app at `../src`. NativeWind v4
+ Tailwind v3 mobile config (generated from `src/config/design.ts`).

## Local dev

```bash
cd mobile
npm install
npx expo start
```

Press `i` to open iOS simulator (Mac only), `a` for Android emulator. Hot
reload on save.

### On Replit (no local Xcode/Android Studio needed)

The repo's `.replit` ships three mobile workflows:

- **Mobile (Expo Web)** — fastest preview; serves `expo start --web` on
  port 8080. No native APIs.
- **Mobile (Native Simulator)** — starts Metro with
  `EXPO_PACKAGER_PROXY_URL` + `REACT_NATIVE_PACKAGER_HOSTNAME` pointing at
  `$REPLIT_DEV_DOMAIN`, so Replit's built-in iOS/Android preview pane can
  attach to the real native bundle on port 8081.
- **Expo Go (Tunnel)** — `expo start --tunnel` for connecting a physical
  device running Expo Go.

EAS shortcuts (`EAS Init`, `EAS Update`, `EAS Publish Preview iOS`, `EAS
Publish Preview Android`) are also wired as one-click workflows.

## Token regeneration

Tailwind config is generated from `src/config/design.ts`. Never hand-edit
`mobile/tailwind.config.js` — pre-commit will reject it.

```bash
npm run gen:mobile-tw         # regenerate (run after design.ts changes)
npm run gen:mobile-tw:check   # CI-style check: exits 1 if drifted
```

## E2E tests (Maestro, local-only)

Phase 5.5 ships 11 flows in `.maestro/`. They run locally only; CI promotion
is tracked in `TODOS.md` #2.

```bash
brew install maestro             # one-time
maestro test .maestro/           # runs all 11 flows in order
maestro test .maestro/05-avatar-upload.yaml   # single flow
```

Flows reference a few template variables (`${MAESTRO_APP_ID}`, `${RUN_ID}`,
`${VERIFY_TOKEN}`, `${RESET_TOKEN}`, `${PEER_NAME}`); set them in your shell
or via `maestro --env`.

## Type check

```bash
npm run typecheck            # mobile-only tsc --noEmit
```

## Native builds

```bash
npx expo prebuild --no-install   # generates ios/ + android/ project folders
eas build --profile dev          # development client (internal distribution)
eas build --profile preview      # internal preview (.apk / .ipa)
```

Production build profiles are deliberately omitted in v1 (per Architecture
decision #6); add them per-fork when ready to submit. The HANDOVER.md
template carries the full submission checklist.

## When bumping the Expo SDK in production

OTA updates only land on users whose installed binary has a matching
`runtimeVersion`. An SDK bump that changes native code (e.g. SDK 51 → 55)
is a native-binary change — existing users on the old binary **will stop
receiving updates** until you ship a new binary that they install.

If your fork has already shipped to production and you're bumping the SDK:

1. Bump `runtimeVersion` in `app.config.ts` (e.g. `"1.0.0"` → `"2.0.0"`).
2. `eas build --profile production --platform all` to produce new native
   binaries.
3. Submit the new binaries to App Store / Play Store. Users must update.
4. Only after the new binary is in users' hands will OTA updates on the
   new `runtimeVersion` channel reach them.

The OTA channel for the previous `runtimeVersion` keeps serving the last
JS bundle compatible with the old binary — it does **not** roll forward
automatically. Keep at least one release on the old channel until adoption
of the new binary is high enough.

See the Expo docs on [runtime versions](https://docs.expo.dev/eas-update/runtime-versions/)
for the full policy options (`appVersion`, `nativeVersion`, fingerprint).

## Adding a primitive

Mobile components live in `mobile/components/ui/`. Match the shadcn API
surface (variants, sizes) so web ↔ mobile feature parity is mechanical.
