// Transitional shim — wires env into the @mlabs/email/url factory functions
// so existing callers can keep importing buildAuthUrl/buildAppLinkUrl from
// this path. Tests at tests/email-url.test.ts mock @/config/env and rely on
// re-importing this module to pick up the new env shape.

import "server-only"
import { env } from "@/config/env"
import {
  buildAuthUrl as _buildAuthUrl,
  buildAppLinkUrl as _buildAppLinkUrl,
} from "@mlabs/email/url"

type Params = Record<string, string | number | boolean | null | undefined>

function authBase(): string {
  // BETTER_AUTH_URL is optional at env-validation time so the build can pass
  // before deploy. At runtime it should always be set; fall back to localhost
  // in dev/test so tests don't have to mock env.
  return env.BETTER_AUTH_URL ?? "http://localhost:3000"
}

export function buildAuthUrl(path: string, params: Params = {}): string {
  return _buildAuthUrl(authBase(), path, params)
}

export function buildAppLinkUrl(path: string, params: Params = {}): string {
  return _buildAppLinkUrl(authBase(), env.EXPO_SCHEME, path, params)
}
