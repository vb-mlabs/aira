import * as React from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { brand } from "@aira/config";
import { BackButton } from "../../../components/nav/BackButton";
import { TopBar } from "../../../components/nav/TopBar";

/**
 * /account/about — brand hero + platform summary + operator/legal
 * disclaimer + one info card (website / support / version) + one card
 * of external legal + in-app support links + copyright footer.
 *
 * Version pulled via expo-constants (already installed at ~18.0.13);
 * the value comes from app.config.ts's `version` field which we bump at
 * each App Store / Play release. Useful for TestFlight QA reporting
 * bugs against a specific build. Copyright year uses `new Date()` so
 * it doesn't rot — resets automatically each January.
 *
 * `brand.url` is imported for the website + legal links per the
 * apex-only outbound-URL rule; the host is never hand-typed here.
 */

const ICON_COLOR = "#4F653B";
const MUTED_ICON_COLOR = "#7A6B4E";

const VERSION = Constants.expoConfig?.version ?? "0.0.0";
/** brand.url with the scheme stripped, for display next to the Website
 *  row without repeating "https://" in the UI. */
const WEBSITE_HOST = brand.url.replace(/^https?:\/\//, "");

function InfoRow({
  icon,
  label,
  value,
  onPress,
  external,
  isLast,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
  onPress?: () => void;
  /** Show `open-in-new` trailing icon (leaves the app). Chevron `›`
   *  when internal, nothing when non-interactive (Version row). */
  external?: boolean;
  isLast?: boolean;
}) {
  const isInteractive = !!onPress;
  const body = (
    <>
      <MaterialCommunityIcons name={icon} size={22} color={ICON_COLOR} />
      <View className="flex-1">
        <Text className="text-xs text-mutedForeground">{label}</Text>
        <Text className="text-sm text-foreground">{value}</Text>
      </View>
      {isInteractive ? (
        external ? (
          <MaterialCommunityIcons
            name="open-in-new"
            size={18}
            color={MUTED_ICON_COLOR}
          />
        ) : (
          <Text className="text-base text-mutedForeground">›</Text>
        )
      ) : null}
    </>
  );
  const rowClass = isLast
    ? "flex-row items-center bg-card px-4"
    : "flex-row items-center border-b border-border bg-card px-4";
  if (!isInteractive) {
    return (
      <View className={rowClass} style={{ minHeight: 60, gap: 14 }}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole={external ? "link" : "button"}
      accessibilityLabel={label}
      accessibilityValue={{ text: value }}
      onPress={onPress}
      className={rowClass}
      style={{ minHeight: 60, gap: 14 }}
    >
      {body}
    </Pressable>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  external,
  accessibilityHint,
  isLast,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
  external?: boolean;
  accessibilityHint?: string;
  isLast?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={external ? "link" : "button"}
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
      {external ? (
        <MaterialCommunityIcons
          name="open-in-new"
          size={18}
          color={MUTED_ICON_COLOR}
        />
      ) : (
        <Text className="text-base text-mutedForeground">›</Text>
      )}
    </Pressable>
  );
}

export default function AboutScreen() {
  const openUrl = (url: string) => {
    void Linking.openURL(url);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TopBar title="About" left={<BackButton />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Brand hero — logo + wordmark. Tagline/parent-name lines were
            dropped in the About redesign; the operator identity now
            lives in the summary paragraph below where it belongs
            legally ("operated by Nisarga Group LLC"). */}
        <View className="items-center px-6 pt-8">
          <Image
            source={require("../../../assets/logo.png")}
            style={{ width: 96, height: 96 }}
            accessibilityLabel={`${brand.name} tree-of-life logo`}
          />
          <Text
            accessibilityRole="header"
            className="mt-3 font-display text-3xl font-bold text-primary"
          >
            {brand.name}
          </Text>
        </View>

        {/* Summary + disclaimer. Two paragraphs, second is muted to
            visually rank the operator/scope disclaimer below the
            positioning statement without hiding it. */}
        <View className="mx-5 mt-6" style={{ gap: 12 }}>
          <Text className="text-sm leading-relaxed text-foreground">
            {brand.name} by {brand.parentName} is a community business
            discovery platform operated by {brand.legalEntity}.{" "}
            {brand.name} helps people discover Indian and South Asian
            businesses, services, and resources in an organized and
            accessible way.
          </Text>
          <Text className="text-sm leading-relaxed text-mutedForeground">
            {brand.name} provides business information and discovery
            tools. {brand.name} is not the provider of the products or
            services offered by listed businesses.
          </Text>
        </View>

        {/* Info card — Website / Support / Version. Website + Support
            are interactive (open browser / mail composer); Version is
            display-only. */}
        <View className="mx-5 mt-6 overflow-hidden rounded-xl">
          <InfoRow
            icon="web"
            label="Website"
            value={WEBSITE_HOST}
            external
            onPress={() => openUrl(brand.url)}
          />
          <InfoRow
            icon="email-outline"
            label="Support"
            value={brand.supportEmail}
            external
            onPress={() => openUrl(`mailto:${brand.supportEmail}`)}
          />
          <InfoRow
            icon="cellphone"
            label="Version"
            value={VERSION}
            isLast
          />
        </View>

        {/* Links card — legal (external) + in-app Help & Support. */}
        <View className="mx-5 mt-4 overflow-hidden rounded-xl">
          <LinkRow
            icon="file-document-outline"
            label="View Legal & Policies"
            accessibilityHint="Opens the full legal and policies page on our website"
            external
            onPress={() => openUrl(`${brand.url}/legal`)}
          />
          <LinkRow
            icon="shield-lock-outline"
            label="Privacy Policy"
            accessibilityHint="Opens the privacy policy on our website"
            external
            onPress={() => openUrl(`${brand.url}/legal#privacy`)}
          />
          <LinkRow
            icon="lifebuoy"
            label="Help & Support"
            accessibilityHint="Opens the in-app help and support screen"
            onPress={() => router.push("/account/help-support" as never)}
            isLast
          />
        </View>

        {/* Copyright footer — year is dynamic so it doesn't rot. Legal
            entity from brand config. */}
        <View className="items-center px-5 pt-8">
          <Text className="text-xs text-mutedForeground">
            © {new Date().getFullYear()} {brand.legalEntity}. All rights
            reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
