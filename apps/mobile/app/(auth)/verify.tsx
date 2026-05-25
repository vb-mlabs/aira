import * as React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { useResendVerify, useVerifyEmail } from "../../features/auth/hooks";
import { brand } from "@mlabs/config";

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
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View className="size-2 rounded-full bg-primary" />
          <Text className="text-base font-extrabold tracking-tight text-foreground">{brand.name}</Text>
        </View>
        <View className="mt-16 items-center" style={{ gap: 16 }}>
          {status === "pending" ? (
            <>
              <ActivityIndicator size="large" />
              <Text className="text-base text-mutedForeground">
                Verifying your email…
              </Text>
            </>
          ) : null}
          {status === "success" ? (
            <Text className="text-2xl font-semibold text-foreground">
              You're verified.
            </Text>
          ) : null}
          {status === "error" ? (
            <>
              <Text
                accessibilityRole="header"
                className="text-2xl font-semibold text-foreground"
              >
                Link expired
              </Text>
              <Text className="text-base text-mutedForeground">
                The verification link is no longer valid.
              </Text>
              <View className="mt-4 w-full">
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
                  className="mt-4 items-center"
                >
                  <Text className="text-base text-foreground">
                    Back to login
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
