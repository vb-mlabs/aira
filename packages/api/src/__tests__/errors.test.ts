// ApiError.toResponse() emits the locked ApiErrorResponse wire shape (OV7).
// Both web and mobile clients depend on `body.error.{code,message,field?}` —
// regressions here would force every client to special-case.

import { describe, expect, it } from "vitest"
import { ApiErrorResponse } from "@mlabs/validators"
import { ApiError } from "../errors"

describe("ApiError.toResponse()", () => {
  it("produces the locked envelope with code + message", async () => {
    const res = ApiError.unauthorized().toResponse()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({
      error: { code: "auth.unauthenticated", message: "Sign in required" },
    })
  })

  it("includes the field key when supplied (RHF/form integration)", async () => {
    const res = ApiError.badRequest(
      "messages.invalid_payload",
      "Body is required",
      "body",
    ).toResponse()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toEqual({
      code: "messages.invalid_payload",
      message: "Body is required",
      field: "body",
    })
  })

  it("omits `field` when not supplied (no `field: undefined` in JSON)", async () => {
    const res = ApiError.internal("server_error", "Boom").toResponse()
    const body = await res.json()
    expect(Object.prototype.hasOwnProperty.call(body.error, "field")).toBe(false)
  })

  it("output validates against the Zod schema", async () => {
    const res = ApiError.notFound("messages.not_found", "Not found").toResponse()
    const body = await res.json()
    const parsed = ApiErrorResponse.safeParse(body)
    expect(parsed.success).toBe(true)
  })

  it("schema rejects malformed shapes (regression guard)", () => {
    expect(ApiErrorResponse.safeParse({ error: "string" }).success).toBe(false)
    expect(ApiErrorResponse.safeParse({ error: {} }).success).toBe(false)
    expect(ApiErrorResponse.safeParse({ error: { code: "x" } }).success).toBe(false)
    expect(ApiErrorResponse.safeParse({ error: { message: "x" } }).success).toBe(false)
  })

  it("passes arbitrary HTTP statuses through unchanged", () => {
    expect(new ApiError({ status: 400, code: "x", message: "y" }).toResponse().status).toBe(400)
    expect(new ApiError({ status: 413, code: "x", message: "y" }).toResponse().status).toBe(413)
    expect(new ApiError({ status: 503, code: "x", message: "y" }).toResponse().status).toBe(503)
  })
})
