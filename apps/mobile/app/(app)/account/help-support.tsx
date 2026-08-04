import * as React from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { brand } from "@aira/config";
import { BackButton } from "../../../components/nav/BackButton";
import { TopBar } from "../../../components/nav/TopBar";

/**
 * /account/help-support — short FAQ + one-tap contact rows for support
 * and bug reports. Both rows open the system mail composer; the bug
 * report prefills a subject that includes the marketing version + OS
 * so the person receiving it can spot the platform without asking.
 */

const VERSION = Constants.expoConfig?.version ?? "0.0.0";

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

function ContactRow({
  icon,
  label,
  detail,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      className="flex-row items-center border-b border-border bg-card px-4"
      style={{ minHeight: 60, gap: 14 }}
    >
      <MaterialCommunityIcons name={icon} size={22} color="#4F653B" />
      <View className="flex-1">
        <Text className="text-xs text-mutedForeground">{label}</Text>
        <Text className="text-sm text-foreground">{detail}</Text>
      </View>
      <Text className="text-base text-mutedForeground">›</Text>
    </Pressable>
  );
}

export default function HelpSupportScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TopBar title="Help & Support" left={<BackButton />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-5 pt-5">
          <Text className="font-display text-2xl font-bold text-foreground">
            How can we help?
          </Text>
          <Text className="mt-2 text-sm text-mutedForeground">
            Answers to the questions we get most — and the fastest way
            to reach a person if you need one.
          </Text>
        </View>

        <Section
          title="Getting started"
          body={`After signing in, browse businesses by category or search from the Home tab. Tap the heart on any listing to save it to Favorites. Community posts live under the Post tab.`}
        />
        <Section
          title="I can't sign in"
          body="Make sure you've verified your email — check your inbox (and spam) for the link we sent when you signed up. Forgot your password? Use the Forgot password link on the sign-in screen to reset it."
        />
        <Section
          title="I got a notification I don't recognize"
          body="Tap the notification to open it, then check the source. If it looks like spam or impersonation, use the Report action. See Safety & Community for how reports are handled."
        />
        <Section
          title="Managing my listing"
          body={`Business owners: My Listings shows what you manage. To claim or edit a business you own but don't yet manage, email ${brand.supportEmail} with the listing name and proof of ownership.`}
        />

        {/* Contact rows — mailto: opens the system composer. Bug row
            prefills a subject so we can immediately see the app
            version + platform without a round-trip. */}
        <View className="mx-5 mt-6 overflow-hidden rounded-xl">
          <ContactRow
            icon="email-outline"
            label="Email support"
            detail={brand.supportEmail}
            onPress={() => {
              void Linking.openURL(`mailto:${brand.supportEmail}`);
            }}
          />
          <ContactRow
            icon="bug-outline"
            label="Report a bug"
            detail={`Include what you were doing when it broke`}
            onPress={() => {
              const subject = encodeURIComponent(
                `[bug] ${brand.name} v${VERSION}`,
              );
              const body = encodeURIComponent(
                `\n\n---\nApp version: ${VERSION}\nPlease describe what you were doing when the issue happened.`,
              );
              void Linking.openURL(
                `mailto:${brand.supportEmail}?subject=${subject}&body=${body}`,
              );
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
