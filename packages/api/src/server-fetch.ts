import "server-only"

// apiServerFetch — in-process op invocation for React Server Components.
//
// The single rule the codebase enforces (CLAUDE.md): web and mobile both
// consume /api/v1/* — one contract, one Zod-validated input, one ApiError
// envelope, one freshness gate. For Client Components and mobile, that's
// honored by createApiClient() (real HTTP). For Server Components, real HTTP
// would round-trip the same origin pointlessly; instead, this helper builds
// a synthetic Request, copies cookies + X-Request-Id + If-Modified-Since
// from the outer Next request scope (next/headers), and invokes
// op.runFromRequest() directly. Same auth pipeline, same admin-freshness
// gate, same input/output validation, same error mapping — just no socket.
//
// Special case: when the freshness gate fires (ApiError code
// "auth.idle_timeout") inside a cookie-authed RSC, we redirect to
// /login?reason=idle so the RSC doesn't have to catch + re-redirect. This
// preserves the ergonomics of the existing requireAdmin() helper.

import { isApiError, ApiError } from "./errors"
import type { Operation } from "./operation"

export interface ApiServerFetchInit<I> {
  /** Input bound to the operation's input schema. Encoded as a JSON body
   *  on the synthetic Request so the op's existing parser path is reused. */
  input?: I
  /** Path-segment params (e.g. dynamic [id] route). Merged onto the parsed
   *  input by defineOperation — routing wins over body of the same name. */
  pathParams?: Record<string, string | string[]>
  /** Forwarded to the synthetic Request so the op's 304 short-circuit (when
   *  it implements one) still fires. */
  ifModifiedSince?: string
}

export interface ApiServerFetchResult<O> {
  data: O | null
  status: number
  lastModified: string | null
  notModified: boolean
}

// ---------------------------------------------------------------------------
// Test seam
//
// Mirrors operation.ts's setActionHeadersResolver pattern. Tests can swap the
// next/headers + next/navigation lookups for stubs so the helper is exercised
// in vitest without spinning up a Next request scope.

let resolveOuterHeaders: () => Promise<Headers> = async () => {
  const mod = (await import("next/headers")) as {
    headers: () => Promise<Headers>
  }
  return mod.headers()
}

let invokeRedirect: (path: string) => Promise<never> = async (path) => {
  const mod = (await import("next/navigation")) as {
    redirect: (p: string) => never
  }
  // next/navigation.redirect() throws a NEXT_REDIRECT sentinel synchronously;
  // awaiting the call propagates the throw.
  return mod.redirect(path)
}

export function setApiServerFetchInternals(deps: {
  resolveHeaders?: () => Promise<Headers>
  invokeRedirect?: (path: string) => Promise<never>
}): void {
  if (deps.resolveHeaders) resolveOuterHeaders = deps.resolveHeaders
  if (deps.invokeRedirect) invokeRedirect = deps.invokeRedirect
}

// ---------------------------------------------------------------------------
// Public helper

export async function apiServerFetch<I, O>(
  op: Operation<I, O>,
  init: ApiServerFetchInit<I> = {},
): Promise<ApiServerFetchResult<O>> {
  const outerHeaders = await resolveOuterHeaders()

  const synthetic = new Headers()
  // Cookies are the only source of auth on web RSC reads. Forward verbatim;
  // getSession() reads them via Better Auth's headers-based session lookup.
  const cookie = outerHeaders.get("cookie")
  if (cookie) synthetic.set("cookie", cookie)
  // Forward the request id when upstream supplied one — keeps a single trace
  // ID across RSC → op → service → audit, even in the in-process path.
  const requestId = outerHeaders.get("x-request-id")
  if (requestId) synthetic.set("x-request-id", requestId)
  // The session source. RSCs are always cookie-authed web traffic; without
  // this header, defineOperation defaults to source: "web" anyway, but
  // setting it explicitly future-proofs against changes to that default.
  synthetic.set("x-client", "web")
  if (init.ifModifiedSince) {
    synthetic.set("if-modified-since", init.ifModifiedSince)
  }
  synthetic.set("content-type", "application/json")

  // Always POST with a JSON body, even for "read" ops. defineOperation routes
  // input parsing on (method + content-type): POST + json → body. This keeps
  // the helper's encoding contract uniform — no string-coercion gotchas for
  // boolean / number inputs that would otherwise be query-string only.
  const request = new Request("http://internal/__api-server-fetch__", {
    method: "POST",
    headers: synthetic,
    body: JSON.stringify(init.input ?? {}),
  })

  const routeContext = init.pathParams
    ? { params: Promise.resolve(init.pathParams) }
    : undefined

  const response = await op.runFromRequest(request, routeContext)

  // Conditional-GET short-circuit. defineOperation doesn't emit 304 today,
  // but downstream service-direct routes can. Treat as a successful "no
  // change" outcome so callers can preserve cached data.
  if (response.status === 304) {
    return {
      data: null,
      status: 304,
      lastModified: response.headers.get("Last-Modified"),
      notModified: true,
    }
  }

  if (response.ok) {
    const data = (await response.json()) as O
    return {
      data,
      status: response.status,
      lastModified: response.headers.get("Last-Modified"),
      notModified: false,
    }
  }

  // Non-2xx: parse the locked ApiErrorResponse envelope.
  let payload: { error?: { code?: string; message?: string; field?: string } } =
    {}
  try {
    payload = (await response.json()) as typeof payload
  } catch {
    // fall through with the empty payload — the fallback ApiError below uses
    // res.statusText (which is what the wire-shape would have read anyway).
  }
  const code = payload.error?.code ?? "unknown"
  const message =
    payload.error?.message ?? response.statusText ?? "Request failed"
  const field = payload.error?.field

  // Cookie-authed admin RSC bounce: when the freshness gate fired upstream,
  // the op converted it to ApiError.idleTimeout() (code auth.idle_timeout).
  // The RSC's parent layout already redirected via requireAdmin() before
  // we got here in 99% of cases — but if a fresh-min op is the first thing
  // on the page, this helper guarantees the bounce.
  if (response.status === 401 && code === "auth.idle_timeout") {
    // invokeRedirect throws — production path imports next/navigation and
    // throws the NEXT_REDIRECT sentinel Next 16 catches at the RSC boundary;
    // test path throws a tagged Error via setApiServerFetchInternals.
    await invokeRedirect("/login?reason=idle")
    // Unreachable — TS doesn't know `await Promise<never>` is `never`.
    /* c8 ignore next */
    throw new Error("unreachable")
  }

  throw new ApiError({
    status: response.status,
    code,
    message,
    field,
  })
}

/** Re-export for callers that want to catch ApiError thrown by the helper.
 *  Equivalent to importing from "@aira/api" — kept here for proximity. */
export { isApiError }
