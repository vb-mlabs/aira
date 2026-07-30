import * as React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AuthShell } from "../../components/AuthShell";
import { Button } from "../../components/ui/Button";
import { useResendVerify, useVerifyEmail } from "../../features/auth/hooks";

type Status = "pending" | "success" | "error";

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const token = (params.token as string | undefined) ?? "";
  const email = (params.email as string | undefined) ?? "";
  const verify = useVerifyEmail();
  const resend = useResendVerify();
  const [status, setStatus] = React.useState<Status>("pending");

  // Auto-run verification on mount.
  React.useEffect(() => {
    let cancelled = false;
    if (!token) {
      setStatus("error");
      return;
    }
    verify
      .mutateAsync(token)
      .then(() => {
        if (cancelled) return;
        setStatus("success");
        // Better Auth verified server-side + (with autoSignInAfter-
        // Verification: true) created a session. But the mobile client
        // uses credentials:"omit" on every fetch (OTA #3 iOS cookie
        // residue fix) and verifyEmailRequest doesn't capture the
        // set-auth-token response header, so the session token never
        // reaches SecureStore. Result: user is verified but not signed
        // in from the app's perspective. Earlier design (invalidate
        // useMe → gate redirects) silently broke because gate saw no
        // session.
        //
        // Simplest reliable UX: dwell on "You're verified" briefly,
        // then send the user to the login screen with their email
        // prefilled semantics preserved (the email param drives the
        // prefill path via useLocalSearchParams on the login side
        // when we wire that; for now just navigate). One tap sign-in
        // and they land on /(app). Not the seamless auto-sign-in
        // Better Auth intended, but honest and unbreakable.
        setTimeout(() => {
          router.replace("/(auth)/login");
        }, 1200);
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthShell>
      <View className="mt-8 items-center" style={{ gap: 16 }}>
        {status === "pending" ? (
          <>
            <ActivityIndicator size="large" />
            <Text className="font-display text-3xl text-foreground">
              Verifying your email…
            </Text>
            <Text className="text-base text-mutedForeground">Hang tight.</Text>
          </>
        ) : null}
        {status === "success" ? (
          <>
            <Text
              accessibilityRole="header"
              className="font-display text-3xl text-foreground"
            >
              You&apos;re verified.
            </Text>
            <Text className="text-base text-mutedForeground">
              Taking you to sign in…
            </Text>
            <View className="mt-4 w-full">
              <Button
                fullWidth
                size="lg"
                onPress={() => router.replace("/(auth)/login")}
                accessibilityLabel="Continue to sign in"
              >
                Continue to sign in
              </Button>
            </View>
          </>
        ) : null}
        {status === "error" ? (
          <>
            <Text
              accessibilityRole="header"
              className="font-display text-3xl text-foreground"
            >
              Link expired
            </Text>
            <Text className="text-base text-mutedForeground">
              The verification link is no longer valid.
            </Text>
            <View className="mt-4 w-full" style={{ gap: 16 }}>
              <Button
                fullWidth
                size="lg"
                loading={resend.isPending}
                onPress={() => {
                  if (email) resend.mutate(email);
                }}
                accessibilityLabel="Resend verification email"
              >
                Resend verification email
              </Button>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.replace("/(auth)/login")}
                className="items-center"
              >
                <Text className="text-base text-foreground">
                  Back to login
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    </AuthShell>
  );
}
