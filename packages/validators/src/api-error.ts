// Locked wire format for /api/* errors.
//
// Every route returns one shape so web + mobile clients can branch on `code`
// instead of parsing a free-form string. The Zod schema doubles as the runtime
// contract — clients can validate responses before reading them.
//
// Pure Zod, no framework imports. The Next.js-side `apiError()` helper that
// builds a NextResponse from this shape lives in the web app, not here.

import { z } from "zod";

export const ApiErrorBody = z.object({
  /** Machine-readable; clients branch on this. snake_case, namespaced by
   *  feature (e.g. "messages.user_not_found", "auth.unauthenticated"). */
  code: z.string().min(1),
  /** Human-readable; safe to surface in toasts/inline errors. */
  message: z.string().min(1),
  /** Optional form field this error pertains to (for inline validation). */
  field: z.string().optional(),
});

export const ApiErrorResponse = z.object({
  error: ApiErrorBody,
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>;
