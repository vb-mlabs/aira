/**
 * mobile/lib/api/client.ts
 *
 * Fetch wrapper used by every mobile feature. Responsibilities:
 *   - read the bearer access token from expo-secure-store
 *   - attach `Authorization: Bearer <access>` and `X-Client: mobile`
 *   - on 401, attempt a single refresh against `/api/auth/refresh` using the
 *     long-lived refresh token, then retry the original request once
 *   - throw a typed `ApiError(status, code, message, field?)` on non-2xx
 *
 * Token storage layout in SecureStore:
 *   - `auth.access`   — short-lived JWT (1h)
 *   - `auth.refresh`  — long-lived refresh token (7d)
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { ApiErrorResponse } from "@mlabs/validators";

// ---------------------------------------------------------------------------
// Config

export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ??
  "http://localhost:3000";

const KEY_ACCESS = "auth.access";
const KEY_REFRESH = "auth.refresh";

// ---------------------------------------------------------------------------
// Storage shim
//
// expo-secure-store's web build is `export default {}` — calling any of its
// `*ValueWithKeyAsync` methods throws `TypeError: ... is not a function`.
// The Expo web preview is the QA surface for entry/auth flow validation, so
// we route web reads/writes through localStorage instead. Native (Expo Go,
// EAS) continues to use the real SecureStore implementation. Tokens persist
// across hard refreshes on web, matching native Keychain/Keystore semantics
// closely enough for dev QA.
//
// See docs/template/TEMPLATE.md lesson #28 (mobile WebView intercept) +
// gotcha 122 in .mstack/learnings.jsonl.

const isWeb = Platform.OS === "web";

const tokenStore = {
  async get(key: string): Promise<string | null> {
    if (isWeb) {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (isWeb) {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* private mode / quota — drop the write, app behaves as signed-out */
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (isWeb) {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        /* noop */
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// ---------------------------------------------------------------------------
// Error type

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field: string | undefined;

  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

// ---------------------------------------------------------------------------
// Token helpers (exported for auth feature use)

export async function getAccessToken(): Promise<string | null> {
  return tokenStore.get(KEY_ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return tokenStore.get(KEY_REFRESH);
}

export async function setTokens(args: {
  access: string;
  refresh: string;
}): Promise<void> {
  await tokenStore.set(KEY_ACCESS, args.access);
  await tokenStore.set(KEY_REFRESH, args.refresh);
}

export async function clearTokens(): Promise<void> {
  await tokenStore.remove(KEY_ACCESS);
  await tokenStore.remove(KEY_REFRESH);
}

// ---------------------------------------------------------------------------
// Refresh

let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;
  // /api/auth/refresh reads the session (refresh) token from the Authorization
  // header — Better Auth's bearer plugin converts it to a session lookup.
  // The session token itself does NOT rotate (Better Auth's session.updateAge
  // advances expiry server-side); only the short-lived JWT comes back here.
  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "X-Client": "mobile",
      Authorization: `Bearer ${refresh}`,
    },
  });
  if (!res.ok) {
    await clearTokens();
    return null;
  }
  const data = (await res.json()) as {
    accessToken: string;
    expiresIn: number;
    tokenType: string;
  };
  await tokenStore.set(KEY_ACCESS, data.accessToken);
  return data.accessToken;
}

function refreshOnce(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// ---------------------------------------------------------------------------
// Core request

export interface ApiRequestInit extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Pre-built query string params (object). */
  query?: Record<string, string | number | boolean | undefined>;
  /** Skip auto-refresh on 401 (e.g. for the refresh call itself). */
  noRetry?: boolean;
  /** Pass-through If-Modified-Since header value. */
  ifModifiedSince?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  status: number;
  /** Server's Last-Modified header value, if any. */
  lastModified: string | null;
  /** True when server returned 304 Not Modified. */
  notModified: boolean;
}

async function buildHeaders(init: ApiRequestInit): Promise<Headers> {
  const headers = new Headers(init.headers ?? {});
  headers.set("X-Client", "mobile");
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init.body !== undefined && !headers.has("Content-Type")) {
    if (!(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
  }
  const token = await getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.ifModifiedSince) {
    headers.set("If-Modified-Since", init.ifModifiedSince);
  }
  return headers;
}

function buildUrl(path: string, query: ApiRequestInit["query"]): string {
  const base = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  if (!query) return base;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${qs.toString()}`;
}

function encodeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

async function parseError(res: Response): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    return new ApiError(res.status, "unknown", res.statusText || "Request failed");
  }
  const parsed = ApiErrorResponse.safeParse(payload);
  if (parsed.success) {
    const { code, message, field } = parsed.data.error;
    return new ApiError(res.status, code, message, field);
  }
  return new ApiError(res.status, "unknown", res.statusText || "Request failed");
}

export async function apiRequest<T>(
  path: string,
  init: ApiRequestInit = {}
): Promise<ApiResponse<T>> {
  const url = buildUrl(path, init.query);
  const doFetch = async (): Promise<Response> => {
    const headers = await buildHeaders(init);
    return fetch(url, {
      ...init,
      headers,
      body: encodeBody(init.body),
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !init.noRetry) {
    const newAccess = await refreshOnce();
    if (newAccess) {
      res = await doFetch();
    }
  }

  if (res.status === 304) {
    return {
      data: null,
      status: 304,
      lastModified: res.headers.get("Last-Modified"),
      notModified: true,
    };
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  // 204 No Content
  if (res.status === 204) {
    return {
      data: null,
      status: 204,
      lastModified: res.headers.get("Last-Modified"),
      notModified: false,
    };
  }

  const data = (await res.json()) as T;
  return {
    data,
    status: res.status,
    lastModified: res.headers.get("Last-Modified"),
    notModified: false,
  };
}

// Convenience wrappers ------------------------------------------------------

export async function apiGet<T>(
  path: string,
  init: Omit<ApiRequestInit, "method" | "body"> = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { ...init, method: "GET" });
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  init: Omit<ApiRequestInit, "method" | "body"> = {}
): Promise<T> {
  const res = await apiRequest<T>(path, { ...init, method: "POST", body });
  if (res.data === null) {
    throw new ApiError(res.status, "empty_response", "Server returned no body");
  }
  return res.data;
}

export async function apiPatch<T>(
  path: string,
  body?: unknown,
  init: Omit<ApiRequestInit, "method" | "body"> = {}
): Promise<T> {
  const res = await apiRequest<T>(path, { ...init, method: "PATCH", body });
  if (res.data === null) {
    throw new ApiError(res.status, "empty_response", "Server returned no body");
  }
  return res.data;
}

export async function apiDelete(
  path: string,
  init: Omit<ApiRequestInit, "method" | "body"> = {}
): Promise<void> {
  await apiRequest<unknown>(path, { ...init, method: "DELETE" });
}
