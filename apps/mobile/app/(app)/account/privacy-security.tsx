import * as React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { brand } from "@aira/config";
import { useToast } from "../../../components/ui/Toast";
import { BackButton } from "../../../components/nav/BackButton";
import { TopBar } from "../../../components/nav/TopBar";
import { requestPermissionAndRegister } from "../../../lib/push";

/**
 * /account/privacy-security — picks up the "Enable notifications"
 * push-permission re-prompt row that used to live on the Account hub,
 * plus short privacy + security copy paraphrased from web's
 * /account/privacy-security page.
 */

function Row({
  icon,
  label,
  onPress,
  accessibilityHint,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      className="flex-row items-center border-b border-border bg-card px-4"
      style={{ minHeight: 60, gap: 14 }}
    >
      <MaterialCommunityIcons name={icon} size={22} color="#4F653B" />
      <Text className="flex-1 text-base text-foreground">{label}</Text>
      <Text className="text-base text-mutedForeground">›</Text>
    </Pressable>
  );
}

function Section({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <View className="px-5 pt-5">
      <Text className="text-xs font-semibold uppercase tracking-wider text-mutedForeground">
        {title}
      </Text>
      <Text className="mt-2 text-sm leading-relaxed text-foreground">
        {body}
      </Text>
    </View>
  );
}

export default function PrivacySecurityScreen() {
  const toast = useToast();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TopBar title="Privacy & Security" left={<BackButton />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Relocated "Enable notifications" row from the legacy hub —
            this is the only non-content thing on the page. */}
        <View className="mt-4 overflow-hidden">
          <Row
            icon="bell-ring-outline"
            label="Enable notifications"
            accessibilityHint="Opens the system prompt and registers this device for push"
            onPress={async () => {
              const result = await requestPermissionAndRegister();
              if (result.granted) {
                toast.show({
                  message: "Notifications enabled",
                  kind: "success",
                });
              } else {
                toast.show({
                  message:
                    result.error ??
                    `Enable in Settings → ${brand.name} → Notifications`,
                  kind: "error",
                });
              }
            }}
          />
        </View>

        <Section
          title="What we collect"
          body={`Your email and account profile, posts and comments you write on ${brand.name}, businesses you favorite, and your notification preferences.`}
        />
        <Section
          title="How we use it"
          body="To deliver the app — show you the right businesses, route community comments, and send notifications you opt into. We don't sell your data to third parties."
        />
        <Section
          title="Your controls"
          body="Sign out or delete your account from the hub. Revoke push notifications anytime in your device's system settings. Edit or delete your community posts from My Posts."
        />
        <Section
          title="Contact"
          body={`Questions about your data? Email ${brand.supportEmail}.`}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
