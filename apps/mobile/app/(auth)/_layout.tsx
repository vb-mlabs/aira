import * as React from "react";
import { Redirect, Stack } from "expo-router";
import { useMe } from "../../features/auth/hooks";

/**
 * Auth stack — no tab bar, no header (each screen draws its own wordmark
 * inline, per the locked design spec).
 *
 * Gate: a verified session bounces back to /(app). Unverified-with-session
 * users (signed up but haven't clicked the email link) stay inside (auth)
 * so they can reach check-email.tsx / verify.tsx — bouncing them on raw
 * me.data presence would make those screens unreachable.
 *
 * While me.isPending, render the stack rather than null so refetches on
 * sign-out / token rotation don't blank-frame mid-session — welcome (or
 * whichever auth route is current) is a safe paint.
 */
export default function AuthLayout() {
  const me = useMe();
  if (me.data?.emailVerified) {
    return <Redirect href="/(app)" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
