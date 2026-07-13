// Transitional shim — wires env into the @aira/email/url factory functions
// so existing callers can keep importing buildAuthUrl/buildAppLinkUrl from
// this path. Tests at tests/email-url.test.ts mock @/config/env and rely on
// re-importing this module to pick up the new env shape.

import "server-only"
import { env } from "@/config/env"
import {
  buildAuthUrl as _buildAuthUrl,
  buildAppLinkUrl as _buildAppLinkUrl,
} from "@aira/email/url"

type Params = Record<string, string | number | boolean | null | undefined>

function authBase(): string {
  // Fallback chain mirrors apps/web/src/lib/auth/index.ts's baseUrl so a
  // Replit dev workspace with no explicit BETTER_AUTH_URL still emits
  // reachable links against the injected preview host. Throws when neither
  // is set — a `localhost` fallback silently shipped bad links to real users
  // when the deployment env forgot BETTER_AUTH_URL.
  const url =
    env.BETTER_AUTH_URL ??
    (env.REPLIT_DEV_DOMAIN ? `https://${env.REPLIT_DEV_DOMAIN}` : undefined)
  if (!url) {
    throw new Error(
      "BETTER_AUTH_URL is required to build email URLs. " +
        "Set it in the deployment env (e.g. https://airabynisarga.com).",
    )
  }
  return url
}

export function buildAuthUrl(path: string, params: Params = {}): string {
  return _buildAuthUrl(authBase(), path, params)
}

export function buildAppLinkUrl(path: string, params: Params = {}): string {
  return _buildAppLinkUrl(authBase(), env.EXPO_SCHEME, path, params)
}
