# EAS submission (iOS + Android)

End-to-end walkthrough for shipping the Expo mobile app at `/mobile` to the
App Store and Google Play. The MLabs template ships dev + preview EAS
profiles only — production submit is a per-fork concern.

> **Audience:** the client/operator taking over the project at handover, or
> an MLabs engineer running the first production submit. Assumes you can
> already run `npx eas build -p ios --profile preview` successfully.

---

## 0. Prerequisites

| Item | Cost | Time |
|---|---|---|
| Apple Developer Program membership | $99/yr | up to 48h approval |
| Google Play Console account | $25 one-time | up to 48h ID verification |
| EAS account + project linked (`eas init`) | free tier OK for first submits | 10 min |
| Apple D-U-N-S number (only if signing up as a company) | free | up to 1 week |

Always start the Apple/Google account setup BEFORE you need to submit — both
take real-world calendar time you can't compress.

---

## 1. iOS — App Store Connect

### 1a. Identifiers (once per app)

1. Apple Developer Portal → **Identifiers** → register a new App ID
   - Bundle ID: must match `mobile/app.config.ts` `ios.bundleIdentifier`
     (e.g. `com.client.appname`)
   - Capabilities: **Associated Domains** (required for deep links).
     Add `applinks:app.client.com` (the production web host)
2. App Store Connect → **My Apps** → **+** → new iOS app
   - SKU: same as bundle ID is fine
   - Primary language: en-US (or client's primary market)

### 1b. Capture the Apple Team ID

Required for `public/.well-known/apple-app-site-association`. Two ways:

```bash
# Method A — Apple Developer Portal
# https://developer.apple.com/account → Membership → Team ID (10 chars)

# Method B — once you have a signing cert installed locally
xcrun altool --list-providers -u <apple-id> -p <app-specific-password>
```

Substitute the Team ID into the AASA placeholder (`{{APPLE_TEAM_ID}}`).
See `HANDOVER.md` step 2 for the exact paths.

### 1c. EAS Submit

```bash
cd mobile
npx eas submit -p ios --profile production
```

EAS will prompt for:
- **App Store Connect API key** (preferred — create in App Store Connect →
  Users and Access → Integrations → App Store Connect API → Generate)
- Or app-specific password (legacy)

Choose API key — it's revocable, scoped, and survives Apple ID changes.

### 1d. TestFlight

After the first successful submit, the build appears in TestFlight within
~15 min for internal testing. External TestFlight requires Apple review
(~24h). Wire client testers in App Store Connect → TestFlight → Internal
or External Group.

### 1e. Push notifications (deferred per v1)

The template does NOT configure push entitlements today (polling-only).
When push lands:
1. Apple Developer Portal → Identifiers → App ID → enable Push Notifications
2. Generate APNs Auth Key (preferred over per-cert)
3. Upload to EAS: `eas credentials -p ios` → push key
4. Update `mobile/app.config.ts` ios entitlements

---

## 2. Android — Google Play Console

### 2a. Identifiers (once per app)

1. Google Play Console → **All apps** → **Create app**
   - App name, default language, app or game, free or paid — answer per client
2. Package name: must match `mobile/app.config.ts` `android.package`
   (e.g. `com.client.appname`)
3. Internal testing track → set up testers list

### 2b. Signing keys + SHA-256 fingerprint

The SHA-256 fingerprint goes into `public/.well-known/assetlinks.json`.
Where it comes from depends on who owns the upload key:

**If EAS manages the signing key (recommended, default for new projects):**

```bash
cd mobile
npx eas credentials -p android
# select: production → keystore → show
# Copy the "SHA-256 Fingerprint" line.
```

**If Google Play manages the app signing key (Play App Signing):**

After the first production upload, Play generates its own signing key.
Find the fingerprint at:
Play Console → App → Setup → App integrity → App signing → "App signing key
certificate" → SHA-256 certificate fingerprint.

> **Important:** if Play App Signing is enabled (it is, by default for new
> apps), the SHA in `assetlinks.json` must be the **App signing key**
> fingerprint, NOT the upload key. Get this wrong and Android verifies
> deep links against the wrong key → links open in-browser instead of
> in-app.

### 2c. EAS Submit

```bash
cd mobile
npx eas submit -p android --profile production
```

EAS prompts for the Google Play service account JSON. Create it at:
Play Console → Setup → API access → Create new service account → grant
"Release manager" role.

Store the JSON path in `mobile/eas.json` under `submit.production.android.serviceAccountKeyPath`. Treat it as a secret — never commit the file.

### 2d. Internal track

First submit lands in Internal testing automatically. Promote to Closed/Open/
Production via the Play Console once QA passes.

---

## 3. Deep-link verification (one-time per fork)

After the production web app is deployed AND production mobile builds are
submitted (so Apple/Google have your appID and SHA):

```bash
npm run verify:deeplinks -- https://app.client.com
```

Expected output: green checks for both AASA and assetlinks. The script:
- Confirms each manifest is reachable + served as `application/json`
- Validates `appID` matches `<TEAM_ID>.<bundleIdentifier>`
- Validates `package_name` matches `mobile/app.config.ts`
- Validates the SHA-256 fingerprint shape

If anything is red, fix it BEFORE wider TestFlight or Play release — once
universal links fail in the wild, users learn to expect the in-browser
fallback and never re-try in-app even after you fix it.

---

## 4. Submission checklist (pre-flight)

- [ ] Apple Developer Program active + Team ID copied
- [ ] App Store Connect listing created (screenshots, description, age rating)
- [ ] iOS bundle ID matches `mobile/app.config.ts`
- [ ] AASA file deployed with real Team ID + bundle ID (no `{{...}}` left)
- [ ] Google Play Console account active
- [ ] Android package name matches `mobile/app.config.ts`
- [ ] SHA-256 fingerprint copied to `assetlinks.json`
- [ ] `npm run verify:deeplinks -- <prod URL>` green
- [ ] Privacy policy URL + support URL configured on both stores
- [ ] App icons + splash assets sized per platform (`mobile/assets/`)
- [ ] TestFlight internal group seeded with client + 1 MLabs engineer

---

## 5. Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Deep links open Safari instead of the app | AASA `appID` mismatch with provisioned bundle ID | Re-check Team ID prefix. Re-verify with `npm run verify:deeplinks`. |
| Android intent opens browser | `assetlinks.json` SHA mismatch with Play signing key | Use Play App Signing fingerprint, NOT upload key (§2b). |
| EAS submit "Invalid binary" iOS | bundle ID conflict with another App Store Connect app | Either delete the stale ASC app or pick a different bundle ID. |
| Postmark verify email link 404s the app | universal link host not on the AASA path list | Add `/verify*` and `/reset-password*` to AASA `paths`. |
| TestFlight stuck "Processing" >2h | App Store Connect rebuild after metadata edit | Bump build number, re-submit. Open a DTS request if it persists. |

---

## 6. References

- AASA spec: <https://developer.apple.com/documentation/xcode/supporting-associated-domains>
- assetlinks spec: <https://developers.google.com/digital-asset-links/v1/getting-started>
- EAS Submit docs: <https://docs.expo.dev/submit/introduction/>
