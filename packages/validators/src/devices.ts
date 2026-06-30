// Push-token registration shapes shared between the mobile registration
// utility and the /api/v1/profile/push-token route handler.
//
// expo_push_token format is `ExponentPushToken[XXX]` or `ExpoPushToken[XXX]`
// — Expo Push Service treats both as equivalent; the validator accepts
// either prefix.

import { z } from "zod";

const ExpoPushTokenSchema = z
  .string()
  .min(1)
  .regex(
    /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/,
    "Expected an Expo push token of the form ExponentPushToken[...]",
  );

export const DevicePlatformSchema = z.enum(["ios", "android"]);
export type DevicePlatform = z.infer<typeof DevicePlatformSchema>;

export const RegisterPushTokenInputSchema = z
  .object({
    expo_push_token: ExpoPushTokenSchema,
    platform: DevicePlatformSchema,
  })
  .strict();
export type RegisterPushTokenInput = z.infer<
  typeof RegisterPushTokenInputSchema
>;

export const UnregisterPushTokenInputSchema = z
  .object({
    expo_push_token: ExpoPushTokenSchema,
  })
  .strict();
export type UnregisterPushTokenInput = z.infer<
  typeof UnregisterPushTokenInputSchema
>;

export const PushTokenMutationOutputSchema = z.object({
  ok: z.literal(true),
});
export type PushTokenMutationOutput = z.infer<
  typeof PushTokenMutationOutputSchema
>;
