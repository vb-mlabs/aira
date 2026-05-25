import "server-only"

// defineOperation — the single adapter that bridges service functions to
// HTTP routes AND Server Actions. Each operation declares its input/output
// schemas + required permission; the adapter handles auth, validation, error
// mapping uniformly so route handlers and action wrappers stay trivial.
//
// Usage:
//   const { defineOperation } = createOperations({ db, getSession })
//
//   export const markAllReadOp = defineOperation({
//     name: "notifications.markAllRead",
//     input: z.object({}),
//     output: z.object({ updated: z.number() }),
//     permission: "user",
//     handler: (db, ctx) => notifications.markAllRead(db, ctx),
//   })
//
//   // In a Next route file:
//   export const POST = markAllReadOp.runFromRequest
//
//   // In a Server Action:
//   "use server"
//   export async function markAllRead() {
//     return markAllReadOp.runFromAction({})
//   }

import type { ZodType, ZodTypeAny } from "zod"
import { ApiError, isApiError } from "./errors"
import type { CallerContext, CallerSource } from "./context"
import type { Permission } from "./permission"

/**
 * Minimal session shape the operation adapter needs. The web app's
 * getSession() returns Better Auth's union; the composition root narrows
 * it down to this when wiring createOperations().
 */
export interface OperationSession {
  user: {
    id: string
    email: string
    role: Permission
  }
}

export type GetSession = (
  headers: Headers,
) => Promise<OperationSession | null>

export interface OperationLogger {
  info?: (message: string, meta?: Record<string, unknown>) => void
  warn?: (message: string, meta?: Record<string, unknown>) => void
  error?: (message: string, meta?: Record<string, unknown>) => void
}

export interface OperationDeps<DB> {
  /** Database handle passed to every service call. Accepts the production
   *  Drizzle instance OR a mock in tests. */
  db: DB
  /** Reads the caller's session from request headers. Returns null when
   *  unauthenticated; defineOperation maps that to a 401 ApiError. */
  getSession: GetSession
  /** Optional. Used for unhandled-error reporting; defaults to console. */
  logger?: OperationLogger
  /** Optional. Generates the request-id when X-Request-Id is absent.
   *  Defaults to crypto.randomUUID(). */
  generateRequestId?: () => string
}

export interface OperationSpec<DB, I, O> {
  /** Stable identifier for logs + audit metadata. Convention:
   *  "<domain>.<verb>" (e.g. "notifications.markAllRead"). */
  name: string
  input: ZodType<I>
  output: ZodType<O>
  /** Minimum role required to call this operation. `"user"` = any authed
   *  caller; `"admin"` = admin only. */
  permission: Permission
  handler: (db: DB, ctx: CallerContext, input: I) => Promise<O>
}

export interface OperationSchema<I, O> {
  name: string
  input: ZodTypeAny
  output: ZodTypeAny
  permission: Permission
  /** Phantom types so consumers can pull the inferred shape:
   *  `type In = (typeof op.schema)["__input"]`. Never read at runtime. */
  __input?: I
  __output?: O
}

/** Next 16 route handlers receive `{ params: Promise<...> }` as the second
 *  argument. The adapter's signature accepts that shape (params optional so
 *  fixed routes don't need to construct one) but doesn't read it today —
 *  dynamic-segment operations parse params via Zod from the input schema. */
export interface OperationRouteContext {
  params?: Promise<Record<string, string | string[]>>
}

export interface Operation<I, O> {
  /** Adapter for Next route files: `export const POST = op.runFromRequest`.
   *  Both arguments are typed to match Next 16's `RouteHandlerConfig`
   *  contract (NextRequest is a Request subtype; the ctx shape is
   *  contravariantly compatible with `{ params: Promise<...> }`). */
  runFromRequest: (
    request: Request,
    context?: OperationRouteContext,
  ) => Promise<Response>
  /** Adapter for Server Actions: callers pass parsed input directly. Throws
   *  ApiError on auth/validation/permission failure so the action surface
   *  can map it to whatever its callers expect. */
  runFromAction: (input: I) => Promise<O>
  schema: OperationSchema<I, O>
}

/** Build the {@link CallerContext} for an authed request. Pure — exported so
 *  tests can construct contexts without spinning up the whole adapter. */
export function buildContext(opts: {
  headers: Headers
  session: OperationSession
  requestId: string
}): CallerContext {
  const xClient = opts.headers.get("x-client")?.toLowerCase()
  const source: CallerSource = xClient === "mobile" ? "mobile" : "web"
  return {
    userId: opts.session.user.id,
    user: opts.session.user,
    requestId: opts.requestId,
    source,
  }
}

function meetsPermission(actual: Permission, required: Permission): boolean {
  if (required === "user") return actual === "user" || actual === "admin"
  return actual === required // "admin"
}

function defaultRequestId(): string {
  return crypto.randomUUID()
}

/**
 * createOperations — factory that closes over per-app deps (db, getSession,
 * logger) and returns a defineOperation() suitable for that runtime. The
 * composition root (apps/web/src/server/operations/...) creates one and
 * exports operations from it.
 */
export function createOperations<DB>(deps: OperationDeps<DB>) {
  const { db, getSession, logger, generateRequestId } = deps
  const log: OperationLogger = logger ?? {
    error: (m, meta) => console.error(m, meta),
  }
  const newRequestId = generateRequestId ?? defaultRequestId

  function defineOperation<I, O>(
    spec: OperationSpec<DB, I, O>,
  ): Operation<I, O> {
    const schema: OperationSchema<I, O> = {
      name: spec.name,
      input: spec.input,
      output: spec.output,
      permission: spec.permission,
    }

    async function runWithContext(
      ctx: CallerContext,
      rawInput: unknown,
    ): Promise<O> {
      // Authorization gate. The session was already resolved upstream; this
      // checks that the caller's role meets the operation's required
      // permission. Throwing here keeps the error path uniform.
      if (!meetsPermission(ctx.user.role, spec.permission)) {
        throw ApiError.forbidden(
          `Operation '${spec.name}' requires '${spec.permission}' permission`,
        )
      }

      const parsedInput = spec.input.safeParse(rawInput)
      if (!parsedInput.success) {
        const first = parsedInput.error.issues[0]
        throw ApiError.badRequest(
          "validation.input",
          first?.message ?? "Invalid input",
          first?.path?.join(".") || undefined,
        )
      }

      const result = await spec.handler(db, ctx, parsedInput.data as I)

      const parsedOutput = spec.output.safeParse(result)
      if (!parsedOutput.success) {
        // Programmer error — the service returned data that doesn't match
        // the declared contract. Log loudly, surface a generic 500 so we
        // don't leak the malformed shape to clients.
        log.error?.("operation.output_mismatch", {
          op: spec.name,
          requestId: ctx.requestId,
          issues: parsedOutput.error.issues,
        })
        throw ApiError.internal(
          "internal.contract_mismatch",
          "Server response failed contract validation",
        )
      }

      return parsedOutput.data as O
    }

    return {
      schema,

      async runFromRequest(request, _context) {
        const requestId =
          request.headers.get("x-request-id") ?? newRequestId()
        try {
          const session = await getSession(request.headers)
          if (!session) {
            throw ApiError.unauthorized()
          }
          const ctx = buildContext({
            headers: request.headers,
            session,
            requestId,
          })

          // Input source: prefer JSON body when present; otherwise the URL's
          // query string. The Zod schema decides what's valid; this just
          // gathers raw material. GET / DELETE typically have no body, so
          // falling back to query params keeps those routes ergonomic.
          let raw: Record<string, unknown> = {}
          if (
            request.method !== "GET" &&
            request.method !== "HEAD" &&
            request.headers.get("content-type")?.includes("application/json")
          ) {
            try {
              const body = await request.json()
              if (body && typeof body === "object" && !Array.isArray(body)) {
                raw = { ...(body as Record<string, unknown>) }
              }
            } catch {
              throw ApiError.badRequest(
                "validation.json",
                "Request body is not valid JSON",
              )
            }
          } else {
            const url = new URL(request.url)
            raw = Object.fromEntries(url.searchParams)
          }

          // Merge dynamic-segment params from the Next route context. Params
          // come from the URL path so they win over body/query of the same
          // name — those are caller-controlled, params are routing-controlled.
          if (_context?.params) {
            const params = await _context.params
            raw = { ...raw, ...params }
          }

          const result = await runWithContext(ctx, raw)
          return Response.json(result, {
            status: 200,
            headers: { "X-Request-Id": requestId },
          })
        } catch (err) {
          if (isApiError(err)) {
            const res = err.toResponse()
            res.headers.set("X-Request-Id", requestId)
            return res
          }
          log.error?.("operation.unhandled", {
            op: spec.name,
            requestId,
            error: err instanceof Error ? err.message : String(err),
          })
          const fallback = ApiError.internal(
            "internal.unhandled",
            "Unexpected server error",
          ).toResponse()
          fallback.headers.set("X-Request-Id", requestId)
          return fallback
        }
      },

      async runFromAction(input) {
        // Server Action path: no Request, no Response. Caller supplies the
        // headers env via getSession() under the hood (Next exposes the
        // current request's headers to "use server" code via next/headers).
        // We still need the same auth + validation guards; on failure we
        // throw ApiError so the action surface can map it to its callers.
        const headersImpl = await loadActionHeaders()
        const requestId =
          headersImpl.get("x-request-id") ?? newRequestId()
        const session = await getSession(headersImpl)
        if (!session) {
          throw ApiError.unauthorized()
        }
        const ctx = buildContext({
          headers: headersImpl,
          session,
          requestId,
        })
        return runWithContext(ctx, input)
      },
    }
  }

  return { defineOperation, buildContext }
}

/**
 * Resolve a Headers object for Server Action invocations. Implemented as a
 * dynamic import so the @mlabs/api package doesn't take a hard dep on
 * next/headers — tests + non-Next runtimes can override it via
 * setActionHeadersResolver().
 */
let actionHeadersResolver: () => Promise<Headers> = async () => {
  const mod = (await import("next/headers")) as {
    headers: () => Promise<Headers>
  }
  return mod.headers()
}

async function loadActionHeaders(): Promise<Headers> {
  return actionHeadersResolver()
}

/** Test/runtime hook to override how runFromAction reads incoming headers. */
export function setActionHeadersResolver(
  resolver: () => Promise<Headers>,
): void {
  actionHeadersResolver = resolver
}
