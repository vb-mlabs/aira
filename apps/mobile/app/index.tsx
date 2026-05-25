import * as React from "react";
import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useMe } from "../features/auth/hooks";

/**
 * Root session gate. Runs inside the providers from _layout.tsx, so useMe()
 * is callable here (it isn't from RootLayout itself, which renders the
 * QueryClientProvider).
 *
 * Routing rules:
 *   - me.isPending → render null while the native splash stays visible
 *   - me.data.emailVerified === true → /(app)
 *   - me.isError with 401 (or any non-verified state) → /(auth)/welcome
 *
 * Non-401 errors (network unreachable, server 5xx) fall through to welcome
 * too — a user with no working backend can't reach (app) anyway, and the
 * welcome screen is a safe paint. The native splash is hidden as soon as the
 * query settles so the user never sees the gate frame itself.
 */
export default function IndexGate() {
  const me = useMe();

  React.useEffect(() => {
    if (!me.isPending) {
      SplashScreen.hideAsync().catch(() => {
        /* noop — already hidden */
      });
    }
  }, [me.isPending]);

  if (me.isPending) return null;

  if (me.data?.emailVerified) {
    return <Redirect href="/(app)" />;
  }

  // me.isError (401, network, 5xx) OR me.data without emailVerified.
  // Unverified-with-session users land on welcome and can navigate to
  // sign-up → check-email if they need to resend, or login otherwise.
  return <Redirect href="/(auth)/welcome" />;
}
