import { Platform } from "react-native"

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
// iOS is scoped correctly already. Its AASA at
// `apps/web/public/.well-known/apple-app-site-association` claims
// only `/verify*` and `/reset-password*` on the apex host, so
// Safari opens every other `airabynisarga.com/*` URL in-browser
// without interception. iOS therefore does NOT need any rewrite —
// the helper is a no-op on iOS. Rewriting on iOS actively BROKE
// legal links, because it sent Safari to `www.airabynisarga.com/*`
// which currently DNS-resolves to a third-party parking host
// (`airabynisarga-com.l.ink`) that 302-redirects every path to a
// generic 404. See `apps/web/next.config.mjs` — the dormant
// `www → apex` 301 there activates the moment DNS for `www.`
// points at our origin.
//
// Correct long-term fix (both platforms): add `pathPrefix` to the
// Android intent filter so only `/verify*` and `/reset-password*`
// are caught (mirrors the iOS AASA). Then this helper can be
// deleted entirely and every screen can call
// `Linking.openURL(brand.url + "/...")` directly. That's a native
// change → next EAS build. Tracked in TODOS.md under the HIGH
// [next EAS native build] item added 2026-08-04.
//
// Interim Android behavior: the `www` rewrite still fires on
// Android. Until the parking host DNS is repointed OR the native
// intent-filter fix ships, Android users tapping a legal link end
// up on `airabynisarga-com.l.ink/legal` (parking 404). Removing the
// rewrite here would swap that for an in-app "unmatched routes"
// screen — different broken state, no better UX. The rewrite stays
// so the diff is minimal and iOS is unblocked; Android's real fix
// is the native one.
//
// Only rewrites airabynisarga.com URLs on Android; other hosts and
// mailto: links pass through unchanged. Delete this helper and drop
// the `www` use once the native intent-filter restriction ships.

const APEX_HOST = "airabynisarga.com"

export function externalWebUrl(url: string): string {
  if (Platform.OS !== "android") return url
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
