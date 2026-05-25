// @mlabs/api — universal types + error class.
//
// The barrel re-exports anything safe to import from any runtime (types,
// ApiError, ApiErrorResponse re-export). Server-only adapters live behind
// the ./server subpath.

export type { CallerContext, CallerSource } from "./context"
export type { Permission } from "./permission"
export { ApiError, isApiError } from "./errors"
export type { ApiErrorOptions } from "./errors"
export { ApiErrorBody, ApiErrorResponse } from "@mlabs/validators"
export type { ApiErrorResponse as ApiErrorResponseType } from "@mlabs/validators"
