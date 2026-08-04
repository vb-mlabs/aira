import * as React from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { brand } from "@aira/config";
import { BackButton } from "../../../components/nav/BackButton";
import { TopBar } from "../../../components/nav/TopBar";

/**
 * /account/privacy-security — Privacy & Data.
 *
 * Route path is kept as "privacy-security" for backwards-compat with
 * existing installs and any deep links; the visible label ("Privacy &
 * Data") is what users see.
 *
 * Content lives on the marketing site under /legal so web + mobile
 * share one source of truth for the policy text. Each row opens the
 * apex URL in the system browser (Linking.openURL). Apex only per the
 * repo-wide rule — imports `brand.url` from @aira/config; never
 * hand-types the host. Universal Links only match /verify* and
 * /reset-password* (see apps/web/public/.well-known/*), so /legal
 * URLs open externally as intended.
 */

const ICON_COLOR = "#4F653B";

function LinkRow({
  icon,
  label,
  onPress,
  accessibilityHint,
  isLast,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
  isLast?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      className={
        isLast
          ? "flex-row items-center bg-card px-4"
          : "flex-row items-center border-b border-border bg-card px-4"
      }
      style={{ minHeight: 60, gap: 14 }}
    >
      <MaterialCommunityIcons name={icon} size={22} color={ICON_COLOR} />
      <Text className="flex-1 text-base text-foreground">{label}</Text>
      {/* Trailing "opens externally" affordance instead of the › chevron
          the internal HubRow uses — signals to screen-readers and sighted
          users alike that this leaves the app. */}
      <MaterialCommunityIcons
        name="open-in-new"
        size={18}
        color="#7A6B4E"
      />
    </Pressable>
  );
}

export default function PrivacySecurityScreen() {
  const openUrl = (url: string) => {
    void Linking.openURL(url);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TopBar title="Privacy & Data" left={<BackButton />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Summary paragraph — mirrors the intro copy on the web /legal
            page so users see the same framing regardless of surface. */}
        <View className="px-5 pt-5">
          <Text className="text-sm leading-relaxed text-foreground">
            Learn what information {brand.name} may collect, how it is
            used, the choices available to you, and how to request
            access, correction, or deletion of your information.
          </Text>
        </View>

        {/* Four external links to the marketing site's /legal page.
            Grouped as a single card with hairline dividers to match the
            visual language of the Account hub. */}
        <View className="mx-5 mt-6 overflow-hidden rounded-xl">
          <LinkRow
            icon="file-document-outline"
            label="Privacy Policy"
            accessibilityHint="Opens the privacy policy on our website"
            onPress={() => openUrl(`${brand.url}/legal#privacy`)}
          />
          <LinkRow
            icon="tune"
            label="Privacy Choices & Data Requests"
            accessibilityHint="Opens privacy choices and data-request info on our website"
            onPress={() => openUrl(`${brand.url}/legal#privacy-choices`)}
          />
          <LinkRow
            icon="delete-outline"
            label="Account Deletion Information"
            accessibilityHint="Opens account deletion information on our website"
            onPress={() => openUrl(`${brand.url}/legal#deletion`)}
          />
          <LinkRow
            icon="email-outline"
            label="Contact Privacy Support"
            accessibilityHint={`Opens the mail composer to ${brand.supportEmail}`}
            onPress={() => {
              const subject = encodeURIComponent(
                `Privacy request — ${brand.name}`,
              );
              openUrl(`mailto:${brand.supportEmail}?subject=${subject}`);
            }}
            isLast
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
