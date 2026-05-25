// Shared auth payload schemas — consumed by web + mobile clients and the
// /api/* handlers that proxy them through Better Auth.
//
// Pure Zod; no Drizzle imports (enforced by @mlabs/eslint-config's
// no-drizzle-in-schemas rule — pattern covers packages/validators/).
// Mirrors Better Auth's defaults (min password length 8 — see
// @mlabs/auth's config).

import { z } from "zod";

/** Inline-rule shared by signup + reset: matches Better Auth's minPasswordLength. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const emailSchema = z.email("Enter a valid email");

export const SignUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    /** Token from the email link's ?token= query param. */
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
