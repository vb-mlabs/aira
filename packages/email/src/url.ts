import "server-only"

// Email URL helpers.
//
// Two builders so a single template can emit either a web URL or a deep link
// without sprinkling string concat through the codebase:
//
//   buildAuthUrl   — always returns an https://authBaseUrl/... URL.
//                    Used for Better Auth's verify/reset links (those flows
//                    end on the server, regardless of which client started
//                    them).
//   buildAppLinkUrl — returns `scheme://path` when an app scheme is configured,
//                    otherwise falls back to the auth URL. Used for "open in
//                    app" CTAs that should jump straight into the installed
//                    Expo app on a phone.
//
// Params are URL-encoded via URLSearchParams (handles tokens with +, /, =, etc.).

type Params = Record<string, string | number | boolean | null | undefined>

function appendParams(usp: URLSearchParams, params: Params): void {
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue
    usp.set(k, String(v))
  }
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`
}

/** Web URL for the server-side flow (verify-email, reset-password landing). */
export function buildAuthUrl(
  authBaseUrl: string,
  path: string,
  params: Params = {},
): string {
  const url = new URL(normalizePath(path), authBaseUrl)
  appendParams(url.searchParams, params)
  return url.toString()
}

/**
 * Deep link to the installed mobile app (e.g. `mlabs://reset-password?token=...`).
 *
 * Falls back to buildAuthUrl when no app scheme is configured — web-only forks
 * still get a working email link instead of an invalid `undefined://...` URL.
 */
export function buildAppLinkUrl(
  authBaseUrl: string,
  appScheme: string | undefined,
  path: string,
  params: Params = {},
): string {
  if (!appScheme) {
    return buildAuthUrl(authBaseUrl, path, params)
  }
  const cleanPath = normalizePath(path).slice(1)
  const usp = new URLSearchParams()
  appendParams(usp, params)
  const qs = usp.toString()
  return qs ? `${appScheme}://${cleanPath}?${qs}` : `${appScheme}://${cleanPath}`
}
