import "server-only"

// @aira/api/server — server-only entry point.
//
// Exports the operation adapter + helpers a composition root needs to wire
// up its routes and Server Actions. Anything universal (types, ApiError)
// lives in the package root export and ./errors.

export {
  createOperations,
  buildContext,
  setActionHeadersResolver,
} from "./operation"

export type {
  Operation,
  OperationSpec,
  OperationDeps,
  OperationLogger,
  OperationSession,
  OperationSchema,
  GetSession,
} from "./operation"

export {
  apiServerFetch,
  setApiServerFetchInternals,
} from "./server-fetch"

export type {
  ApiServerFetchInit,
  ApiServerFetchResult,
} from "./server-fetch"
