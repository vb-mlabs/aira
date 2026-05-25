// ApiError — the server-side throwable that defineOperation maps to the
// locked ApiErrorResponse wire shape (defined in @mlabs/validators). Services
// throw these; the operation adapter catches them and produces the Response.
//
// Universal module: no Next imports here. The Response we build uses the
// standard Web fetch globals (Response, JSON serialization) so the package
// works in any runtime (Next route handlers, Edge, mobile contract tests).

import type { ApiErrorResponse } from "@mlabs/validators"

export interface ApiErrorOptions {
  /** HTTP status code surfaced on the wire. */
  status: number
  /** Machine-readable. snake_case, namespaced by feature
   *  (e.g. "notifications.not_found"). Clients branch on this. */
  code: string
  /** Human-readable. Safe to surface in toasts/inline errors. */
  message: string
  /** Optional form field this error pertains to (inline validation). */
  field?: string
  /** Optional underlying error to chain — preserved on .cause for logging. */
  cause?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly field: string | undefined

  constructor(opts: ApiErrorOptions) {
    super(opts.message, opts.cause !== undefined ? { cause: opts.cause } : {})
    this.name = "ApiError"
    this.status = opts.status
    this.code = opts.code
    this.field = opts.field
  }

  /** Build the JSON body in ApiErrorResponse shape. */
  toBody(): ApiErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.field ? { field: this.field } : {}),
      },
    }
  }

  /** Convenience — a standard Web Response carrying the error envelope. */
  toResponse(): Response {
    return Response.json(this.toBody(), { status: this.status })
  }

  // Common factories. Operation handlers / services use these instead of
  // constructing ApiError with magic strings everywhere.

  static unauthorized(message = "Sign in required"): ApiError {
    return new ApiError({
      status: 401,
      code: "auth.unauthenticated",
      message,
    })
  }

  static forbidden(message = "Permission denied"): ApiError {
    return new ApiError({
      status: 403,
      code: "auth.forbidden",
      message,
    })
  }

  static notFound(code: string, message: string): ApiError {
    return new ApiError({ status: 404, code, message })
  }

  static badRequest(code: string, message: string, field?: string): ApiError {
    return new ApiError({ status: 400, code, message, field })
  }

  static internal(code: string, message: string, cause?: unknown): ApiError {
    return new ApiError({ status: 500, code, message, cause })
  }
}

/** Type-guard for callers that catch unknown. */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}
