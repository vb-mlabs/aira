import * as React from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as IntentLauncher from "expo-intent-launcher";
import { AuthShell } from "../../components/AuthShell";
import { Button } from "../../components/ui/Button";
import { useResendVerify } from "../../features/auth/hooks";
import { useToast } from "../../components/ui/Toast";

const RESEND_COOLDOWN_SEC = 300;

/**
 * Post-signup screen — "We sent a link to {email}. Tap it on this phone to
 * continue." + Open Mail button + Resend after a 5-minute cooldown.
 *
 * Cooldown throttles the Resend button only — the verification link itself
 * is valid for 2 hours (see EMAIL_LINK_TTL_MINUTES in
 * packages/auth/src/server.ts). Users have historically confused this
 * countdown with the link expiry; keep them separate mentally.
 *
 * 5 min matches typical email delivery worst-case (recipient-side spam
 * checks + greylisting) — user has time to receive the first attempt
 * before Resend enables, so we don't invite them to spam the endpoint
 * on emails that were already on the way.
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
    // iOS: walk native mail-app schemes in preference order. try/catch
    // on Linking.openURL sidesteps LSApplicationQueriesSchemes.
    //
    // Android: use expo-intent-launcher to fire ACTION_MAIN with
    // CATEGORY_APP_EMAIL — Android's built-in "which email app" chooser
    // (or default app if one is set). Works with Gmail, Outlook,
    // Samsung Email, ProtonMail, whatever the user has installed.
    // Requires the native module which ships in this native build
    // (0.1.2+). Not OTA-safe; earlier builds fall through to the web
    // fallback below.
    //
    // Not using mailto: — it opens a compose screen, not the inbox, so
    // it's the wrong intent right after signup ("check your email").
    if (Platform.OS === "android") {
      try {
        await IntentLauncher.startActivityAsync(
          "android.intent.action.MAIN",
          { category: "android.intent.category.APP_EMAIL" },
        );
        return;
      } catch {
        // No email app installed on this device, or the intent was
        // rejected — fall through to the web fallback below.
      }
    } else {
      const candidates = [
        "message://",       // Apple Mail
        "googlegmail://",   // Gmail
        "ms-outlook://",    // Outlook
        "ymail://",         // Yahoo Mail
      ];
      for (const url of candidates) {
        try {
          await Linking.openURL(url);
          return;
        } catch {
          // scheme not handled on this device — try the next candidate
        }
      }
    }

    // Ultimate fallback: Gmail on the web. Every device has a browser.
    try {
      await Linking.openURL("https://mail.google.com");
    } catch {
      toast.show({ message: "Couldn't open a mail app", kind: "error" });
    }
  };

  // Unified "Open Mail" — both platforms now open the actual mail app
  // (iOS: scheme fallback chain; Android: ACTION_MAIN CATEGORY_APP_EMAIL
  // via expo-intent-launcher). Only falls through to Gmail web when no
  // mail app is installed at all.
  const openMailLabel = "Open Mail";

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
          accessibilityLabel={openMailLabel}
        >
          {openMailLabel}
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
            {cooldown > 0
              ? `Resend in ${formatCooldown(cooldown)}`
              : "Resend email"}
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

// Under 60s → "45s". At/above 60s → "4:53". Watching a 3-digit second
// counter tick down for 5 minutes reads as broken; m:ss reads as a
// familiar timer.
function formatCooldown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
