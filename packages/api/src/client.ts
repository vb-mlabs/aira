// @aira/api/client — universal fetch wrapper factory.
//
// Both web and mobile call createApiClient(deps) with their own dep injection:
//
//   - Mobile: SecureStore-backed getAccessToken + a refreshOnce loop that
//     POSTs to /api/auth/refresh.
//   - Web: cookies ride along on `credentials: "include"`; no token deps.
//
// Universal contract:
//   - Attaches `X-Client: <clientId>` so server-side audit can attribute.
//   - When `getAccessToken` resolves a token, sets `Authorization: Bearer <…>`.
//   - JSON-encodes object bodies; passes FormData / string bodies through.
//   - Forwards `If-Modified-Since`; returns `{ notModified: true }` on 304.
//   - On non-2xx, parses the locked ApiErrorResponse envelope and throws
//     ApiError. Falls back to a generic ApiError when the body is malformed.
//   - On 401 with a refreshOnce dep, refreshes once and retries the original
//     request. Subsequent 401s throw.

import { ApiErrorResponse } from "@aira/validators"
import { ApiError } from "./errors"

export interface CreateApiClientDeps {
  /** Origin to prepend to non-absolute paths. Web passes "" (same-origin). */
  baseUrl: string
  /** Identifies the caller in the X-Client header. "web" or "mobile". */
  clientId: string
  /** When provided + resolves a token, attaches Authorization: Bearer. */
  getAccessToken?: () => Promise<string | null>
  /** When provided, called once on a 401 to refresh the access token. The
   *  returned token (if any) is used on the retry; null means giving up. */
  refreshOnce?: () => Promise<string | null>
  /** Defaults to globalThis.fetch — overridable for tests + SSR. */
  fetchImpl?: typeof fetch
}

export interface ApiRequestInit extends Omit<RequestInit, "body"> {
  /** Object → JSON.stringify + Content-Type: application/json.
   *  FormData / string → passed through unchanged. */
  body?: unknown
  /** Pre-built query params. */
  query?: Record<string, string | number | boolean | undefined>
  /** Skip the 401 → refresh-and-retry loop (use for the refresh call itself). */
  noRetry?: boolean
  /** Pass-through If-Modified-Since header value. */
  ifModifiedSince?: string
}

export interface ApiResponse<T> {
  data: T | null
  status: number
  /** Server's Last-Modified header value, if any. */
  lastModified: string | null
  /** True when server returned 304 Not Modified. */
  notModified: boolean
}

export interface ApiClient {
  request<T>(path: string, init?: ApiRequestInit): Promise<ApiResponse<T>>
  get<T>(
    path: string,
    init?: Omit<ApiRequestInit, "method" | "body">,
  ): Promise<ApiResponse<T>>
  post<T>(
    path: string,
    body?: unknown,
    init?: Omit<ApiRequestInit, "method" | "body">,
  ): Promise<T>
  patch<T>(
    path: string,
    body?: unknown,
    init?: Omit<ApiRequestInit, "method" | "body">,
  ): Promise<T>
  delete(
    path: string,
    init?: Omit<ApiRequestInit, "method" | "body">,
  ): Promise<void>
}

export function createApiClient(deps: CreateApiClientDeps): ApiClient {
  const { baseUrl, clientId, getAccessToken, refreshOnce } = deps
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch.bind(globalThis)

  function buildUrl(path: string, query: ApiRequestInit["query"]): string {
    const base = path.startsWith("http") ? path : `${baseUrl}${path}`
    if (!query) return base
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) qs.set(k, String(v))
    }
    const sep = base.includes("?") ? "&" : "?"
    return `${base}${sep}${qs.toString()}`
  }

  async function buildHeaders(init: ApiRequestInit): Promise<Headers> {
    const headers = new Headers(init.headers ?? {})
    headers.set("X-Client", clientId)
    if (!headers.has("Accept")) headers.set("Accept", "application/json")
    if (init.body !== undefined && !headers.has("Content-Type")) {
      if (!(init.body instanceof FormData) && typeof init.body !== "string") {
        headers.set("Content-Type", "application/json")
      }
    }
    if (getAccessToken) {
      const token = await getAccessToken()
      if (token) headers.set("Authorization", `Bearer ${token}`)
    }
    if (init.ifModifiedSince) {
      headers.set("If-Modified-Since", init.ifModifiedSince)
    }
    return headers
  }

  function encodeBody(body: unknown): BodyInit | undefined {
    if (body === undefined) return undefined
    if (body instanceof FormData) return body
    if (typeof body === "string") return body
    return JSON.stringify(body)
  }

  async function parseErrorResponse(res: Response): Promise<ApiError> {
    let payload: unknown = null
    try {
      payload = await res.json()
    } catch {
      return new ApiError({
        status: res.status,
        code: "unknown",
        message: res.statusText || "Request failed",
      })
    }
    const parsed = ApiErrorResponse.safeParse(payload)
    if (parsed.success) {
      const { code, message, field } = parsed.data.error
      return new ApiError({ status: res.status, code, message, field })
    }
    return new ApiError({
      status: res.status,
      code: "unknown",
      message: res.statusText || "Request failed",
    })
  }

  async function request<T>(
    path: string,
    init: ApiRequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(path, init.query)
    const sameOrigin = !path.startsWith("http")

    const doFetch = async (): Promise<Response> => {
      const headers = await buildHeaders(init)
      return fetchImpl(url, {
        // Cookie auth (web) needs include on same-origin calls; mobile's bearer
        // path is unaffected by this flag. Pre-existing `credentials` on init
        // wins so callers can opt out.
        credentials: init.credentials ?? (sameOrigin ? "include" : "same-origin"),
        ...init,
        headers,
        body: encodeBody(init.body),
      })
    }

    let res = await doFetch()

    if (res.status === 401 && !init.noRetry && refreshOnce) {
      const newToken = await refreshOnce()
      if (newToken) {
        res = await doFetch()
      }
    }

    if (res.status === 304) {
      return {
        data: null,
        status: 304,
        lastModified: res.headers.get("Last-Modified"),
        notModified: true,
      }
    }

    if (!res.ok) {
      throw await parseErrorResponse(res)
    }

    if (res.status === 204) {
      return {
        data: null,
        status: 204,
        lastModified: res.headers.get("Last-Modified"),
        notModified: false,
      }
    }

    const data = (await res.json()) as T
    return {
      data,
      status: res.status,
      lastModified: res.headers.get("Last-Modified"),
      notModified: false,
    }
  }

  return {
    request,
    get<T>(path: string, init: Omit<ApiRequestInit, "method" | "body"> = {}) {
      return request<T>(path, { ...init, method: "GET" })
    },
    async post<T>(
      path: string,
      body?: unknown,
      init: Omit<ApiRequestInit, "method" | "body"> = {},
    ) {
      const res = await request<T>(path, { ...init, method: "POST", body })
      if (res.data === null) {
        throw new ApiError({
          status: res.status,
          code: "empty_response",
          message: "Server returned no body",
        })
      }
      return res.data
    },
    async patch<T>(
      path: string,
      body?: unknown,
      init: Omit<ApiRequestInit, "method" | "body"> = {},
    ) {
      const res = await request<T>(path, { ...init, method: "PATCH", body })
      if (res.data === null) {
        throw new ApiError({
          status: res.status,
          code: "empty_response",
          message: "Server returned no body",
        })
      }
      return res.data
    },
    async delete(
      path: string,
      init: Omit<ApiRequestInit, "method" | "body"> = {},
    ) {
      await request<unknown>(path, { ...init, method: "DELETE" })
    },
  }
}
