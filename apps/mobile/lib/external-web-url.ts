// externalWebUrl(url) — force an outbound URL to open in the system
// browser instead of getting caught by the app's own intent filter.
//
// The Android intent filter in `apps/mobile/app.config.ts` declares
// `data: [{ scheme: "https", host: "airabynisarga.com" }]` with
// `autoVerify: true`, and the marketing site's
// `apps/web/public/.well-known/assetlinks.json` grants
// `handle_all_urls`. Combined, Android opens EVERY
// `https://airabynisarga.com/*` URL in the AIRA app — including
// pages we intended to be browser-only (Privacy, Legal, About links,
// deletion policy). When Chrome kicks the URL back to the app,
// expo-router has no matching route and shows "unmatched routes".
//
// Correct long-term fix: add `pathPrefix` to the intent filter so
// only `/verify*` and `/reset-password*` are caught (mirrors the iOS
// AASA on the web side). That's a native change → next EAS build.
// See the [HIGH] Android intent-filter follow-up in TODOS.md.
//
// Short-term OTA-safe workaround (this file): rewrite the apex host
// to `www.` before handing to `Linking.openURL`. The intent filter's
// host match is exact — `www.airabynisarga.com` doesn't match
// `airabynisarga.com`, so Android falls through to Chrome. Chrome
// then follows the marketing site's `www → apex` 301 (declared in
// `apps/web/next.config.mjs`) and renders the apex page. The 301 is
// browser-internal — it does NOT trigger a new startActivity
// intent, so the app doesn't intercept the redirect either.
//
// Only rewrites airabynisarga.com URLs; other hosts and mailto:
// links pass through unchanged. Delete this helper and drop the `www`
// use once the native intent-filter restriction ships.

const APEX_HOST = "airabynisarga.com"

export function externalWebUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === APEX_HOST) {
      parsed.hostname = `www.${APEX_HOST}`
      return parsed.toString()
    }
    return url
  } catch {
    return url
  }
}
