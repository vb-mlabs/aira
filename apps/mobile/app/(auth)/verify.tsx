import * as React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
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
  const qc = useQueryClient();
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
        // 700ms dwell so "You're verified" is readable, then invalidate
        // useMe — the (auth) gate then redirects to /(app). Single source
        // of routing truth lives in the gate, not here.
        setTimeout(() => {
          qc.invalidateQueries({ queryKey: ["auth", "me"] });
        }, 700);
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
          <Text className="font-display text-3xl text-foreground">
            You&apos;re verified.
          </Text>
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
