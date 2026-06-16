// User preferences — over-the-wire shape for /api/v1/profile/preferences.
// Shared by web RSC, web Client Components, and mobile so the toggle UI
// (web) and any future preference settings in Expo both read/write the
// same contract. Add a new boolean column to user → extend this schema in
// lockstep.

import { z } from "zod";

export const UserPreferencesSchema = z
  .object({
    email_on_message_received: z.boolean(),
    email_on_post_interest: z.boolean(),
  })
  .strict();
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const GetUserPreferencesInputSchema = z.object({}).strict();
export type GetUserPreferencesInput = z.infer<
  typeof GetUserPreferencesInputSchema
>;

export const GetUserPreferencesOutputSchema = z.object({
  preferences: UserPreferencesSchema,
});
export type GetUserPreferencesOutput = z.infer<
  typeof GetUserPreferencesOutputSchema
>;

// PATCH body: every field optional, but at least the boolean type guard.
// `.strict()` rejects unknown keys so a typo can't silently no-op.
export const UpdateUserPreferencesInputSchema = UserPreferencesSchema.partial();
export type UpdateUserPreferencesInput = z.infer<
  typeof UpdateUserPreferencesInputSchema
>;

export const UpdateUserPreferencesOutputSchema = z.object({
  preferences: UserPreferencesSchema,
});
export type UpdateUserPreferencesOutput = z.infer<
  typeof UpdateUserPreferencesOutputSchema
>;
