// @vitest-environment node
//
// Pure-Zod schema contracts for the auth surface (A4). These schemas are
// shared by web (RHF resolvers) and mobile (client-side validation before
// hitting /api/auth/*). Regressions here would mismatch what Better Auth
// accepts and surface as a bad UX.

import { describe, expect, it } from "vitest"
import {
  ForgotPasswordSchema,
  LoginSchema,
  ResetPasswordSchema,
  SignUpSchema,
} from "@mlabs/validators"

describe("SignUpSchema", () => {
  it("accepts a valid payload", () => {
    const res = SignUpSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "longenough1",
    })
    expect(res.success).toBe(true)
  })

  it("rejects short passwords (matches Better Auth's minPasswordLength = 8)", () => {
    const res = SignUpSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "short",
    })
    expect(res.success).toBe(false)
  })

  it("rejects malformed emails", () => {
    expect(
      SignUpSchema.safeParse({
        name: "A",
        email: "not-an-email",
        password: "longenough1",
      }).success,
    ).toBe(false)
  })

  it("trims and rejects empty names", () => {
    const trimmed = SignUpSchema.safeParse({
      name: "  Alice  ",
      email: "a@b.com",
      password: "longenough1",
    })
    expect(trimmed.success).toBe(true)
    if (trimmed.success) expect(trimmed.data.name).toBe("Alice")

    expect(
      SignUpSchema.safeParse({
        name: "   ",
        email: "a@b.com",
        password: "longenough1",
      }).success,
    ).toBe(false)
  })
})

describe("LoginSchema", () => {
  it("accepts a valid pair", () => {
    expect(
      LoginSchema.safeParse({
        email: "bob@example.com",
        password: "x",
      }).success,
    ).toBe(true)
  })

  it("login does not require min password length (server is source of truth)", () => {
    // Lets a legacy account with a shorter password still attempt login;
    // the auth backend decides.
    expect(
      LoginSchema.safeParse({
        email: "bob@example.com",
        password: "1",
      }).success,
    ).toBe(true)
  })

  it("rejects missing fields", () => {
    expect(LoginSchema.safeParse({ email: "bob@example.com" }).success).toBe(false)
    expect(LoginSchema.safeParse({ password: "x" }).success).toBe(false)
  })
})

describe("ForgotPasswordSchema", () => {
  it("validates email only", () => {
    expect(ForgotPasswordSchema.safeParse({ email: "c@d.example" }).success).toBe(true)
    expect(ForgotPasswordSchema.safeParse({ email: "x" }).success).toBe(false)
  })
})

describe("ResetPasswordSchema", () => {
  const ok = {
    token: "tok_abc",
    password: "longenough1",
    confirmPassword: "longenough1",
  }

  it("accepts a valid payload", () => {
    expect(ResetPasswordSchema.safeParse(ok).success).toBe(true)
  })

  it("rejects mismatched confirmation with the confirmPassword field path", () => {
    const res = ResetPasswordSchema.safeParse({ ...ok, confirmPassword: "different" })
    expect(res.success).toBe(false)
    if (!res.success) {
      // Critical UX: the error must be attached to confirmPassword so RHF
      // surfaces it on the right field.
      expect(res.error.issues[0]?.path).toEqual(["confirmPassword"])
    }
  })

  it("rejects short new password", () => {
    expect(
      ResetPasswordSchema.safeParse({
        token: "t",
        password: "short",
        confirmPassword: "short",
      }).success,
    ).toBe(false)
  })

  it("requires a non-empty token (defends the deep-link landing screen)", () => {
    expect(
      ResetPasswordSchema.safeParse({
        token: "",
        password: "longenough1",
        confirmPassword: "longenough1",
      }).success,
    ).toBe(false)
  })
})
