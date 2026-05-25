import * as React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { useResendVerify } from "../../features/auth/hooks";
import { useToast } from "../../components/ui/Toast";
import { brand } from "@mlabs/config";

const RESEND_COOLDOWN_SEC = 30;

/**
 * Post-signup screen — "We sent a link to {email}. Tap it on this phone to
 * continue." + Open Mail button + Resend after a 30s cooldown.
 */
export default function CheckEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (params.email as string | undefined) ?? "your inbox";
  const resend = useResendVerify();
  const toast = useToast();
  const [cooldown, setCooldown] = React.useState(RESEND_COOLDOWN_SEC);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const onResend = async () => {
    if (cooldown > 0 || !params.email) return;
    try {
      await resend.mutateAsync(params.email as string);
      toast.show({ message: "Verification email sent", kind: "success" });
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch {
      toast.show({ message: "Couldn't resend. Try again.", kind: "error" });
    }
  };

  const openMail = () => {
    Linking.openURL("message://").catch(() => {
      toast.show({ message: "No mail app installed", kind: "error" });
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View className="size-2 rounded-full bg-primary" />
          <Text className="text-base font-extrabold tracking-tight text-foreground">{brand.name}</Text>
        </View>
        <View className="mt-16">
          <Text
            accessibilityRole="header"
            className="text-4xl font-semibold text-foreground"
          >
            Check your email
          </Text>
          <Text className="mt-4 text-base text-mutedForeground">
            We sent a link to{" "}
            <Text className="font-medium text-foreground">{email}</Text>. Tap
            it on this phone to continue.
          </Text>
        </View>
      </View>
      <View className="px-6 pb-8 pt-4" style={{ gap: 12 }}>
        <Button
          fullWidth
          size="lg"
          onPress={openMail}
          accessibilityLabel="Open Mail app"
        >
          Open Mail
        </Button>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: cooldown > 0 }}
          disabled={cooldown > 0}
          onPress={onResend}
          className="items-center py-2"
        >
          <Text
            className={
              cooldown > 0
                ? "text-base text-mutedForeground"
                : "text-base font-medium text-foreground underline"
            }
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace("/(auth)/login")}
          className="items-center py-2"
        >
          <Text className="text-base text-foreground">Back to login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
