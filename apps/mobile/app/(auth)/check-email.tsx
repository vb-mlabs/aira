import * as React from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AuthShell } from "../../components/AuthShell";
import { Button } from "../../components/ui/Button";
import { useResendVerify } from "../../features/auth/hooks";
import { useToast } from "../../components/ui/Toast";

const RESEND_COOLDOWN_SEC = 60;

/**
 * Post-signup screen — "We sent a link to {email}. Tap it on this phone to
 * continue." + Open Mail button + Resend after a 60s cooldown.
 *
 * Cooldown throttles the Resend button only — the verification link itself
 * is valid for 2 hours (see EMAIL_LINK_TTL_MINUTES in
 * packages/auth/src/server.ts). Users have historically confused this
 * countdown with the link expiry; keep them separate mentally.
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

  const openMail = async () => {
    // Try native mail apps in preference order, then fall back to Gmail
    // web. `Linking.openURL` throws when the scheme has no handler, so a
    // try/catch loop lets us walk the list without needing
    // LSApplicationQueriesSchemes in Info.plist — keeps this change
    // OTA-eligible instead of forcing a store rebuild.
    //
    // Not using mailto: — it opens a compose screen, not the inbox, so
    // it's the wrong intent right after signup ("check your email").
    const candidates =
      Platform.OS === "ios"
        ? [
            "message://",       // Apple Mail
            "googlegmail://",   // Gmail
            "ms-outlook://",    // Outlook
            "ymail://",         // Yahoo Mail
          ]
        : ["googlegmail://"];   // Android: Gmail app registers this scheme

    for (const url of candidates) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // scheme not handled on this device — try the next candidate
      }
    }

    // Ultimate fallback: Gmail on the web. Every device has a browser.
    try {
      await Linking.openURL("https://mail.google.com");
    } catch {
      toast.show({ message: "Couldn't open a mail app", kind: "error" });
    }
  };

  return (
    <AuthShell>
      <View>
        <Text
          accessibilityRole="header"
          className="font-display text-4xl text-foreground"
        >
          Check your email
        </Text>
        <Text className="mt-4 text-base text-mutedForeground">
          We sent a link to{" "}
          <Text className="font-medium text-foreground">{email}</Text>. Tap it
          on this phone to continue.
        </Text>
      </View>
      <View className="mt-8" style={{ gap: 12 }}>
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
    </AuthShell>
  );
}
