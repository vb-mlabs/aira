import * as React from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { brand } from "@aira/config";
import { BackButton } from "../../../components/nav/BackButton";
import { TopBar } from "../../../components/nav/TopBar";
import { externalWebUrl } from "../../../lib/external-web-url";

/**
 * /account/terms — Legal & Policies.
 *
 * Route path is kept as "terms" for backwards-compat with existing
 * installs and any deep links; the visible label ("Legal & Policies")
 * is what users see.
 *
 * Content lives on the marketing site under /legal so web + mobile
 * share one source of truth. Each row opens the apex URL in the
 * system browser via Linking.openURL. Apex only per the repo-wide
 * rule — imports `brand.url` from @aira/config; never hand-types the
 * host. Universal Links only match /verify* and /reset-password*, so
 * /legal URLs open externally as intended.
 *
 * Some anchors are shared with the Privacy & Data screen
 * (specifically #privacy and #deletion) — same target, different
 * framing per surface.
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

export default function TermsScreen() {
  const openLegal = (anchor: string) => {
    // externalWebUrl swaps apex → www so Android's intent filter
    // doesn't intercept and bounce us back into the app with
    // "unmatched routes". See lib/external-web-url.ts.
    void Linking.openURL(externalWebUrl(`${brand.url}/legal#${anchor}`));
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TopBar title="Legal & Policies" left={<BackButton />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Summary paragraph — mirrors the intro copy on the web /legal
            page so users see the same framing regardless of surface. */}
        <View className="px-5 pt-5">
          <Text className="text-sm leading-relaxed text-foreground">
            Review the policies that govern your use of {brand.name},
            business listings, paid placements, verification, reviews,
            community content, payments, and account deletion.
          </Text>
        </View>

        {/* Nine external links to the marketing site's /legal page.
            Grouped as a single card with hairline dividers to match the
            visual language of the Account hub. */}
        <View className="mx-5 mt-6 overflow-hidden rounded-xl">
          <LinkRow
            icon="file-document-outline"
            label="Terms of Use"
            accessibilityHint="Opens the terms of use on our website"
            onPress={() => openLegal("terms")}
          />
          <LinkRow
            icon="shield-lock-outline"
            label="Privacy Policy"
            accessibilityHint="Opens the privacy policy on our website"
            onPress={() => openLegal("privacy")}
          />
          <LinkRow
            icon="store-outline"
            label="Business Listing Disclaimer"
            accessibilityHint="Opens the business listing disclaimer on our website"
            onPress={() => openLegal("listing-disclaimer")}
          />
          <LinkRow
            icon="star-circle-outline"
            label="Sponsored Placement Policy"
            accessibilityHint="Opens the sponsored placement policy on our website"
            onPress={() => openLegal("sponsored")}
          />
          <LinkRow
            icon="check-decagram-outline"
            label={`How ${brand.name} Verification Works`}
            accessibilityHint="Opens how verification works on our website"
            onPress={() => openLegal("verification")}
          />
          <LinkRow
            icon="star-outline"
            label={`${brand.name} Stars & ${brand.name} Review Policy`}
            accessibilityHint="Opens the review policy on our website"
            onPress={() => openLegal("aira-review")}
          />
          <LinkRow
            icon="account-group-outline"
            label="Community Guidelines"
            accessibilityHint="Opens the community guidelines on our website"
            onPress={() => openLegal("community")}
          />
          <LinkRow
            icon="cash-refund"
            label="Refund & Cancellation Policy"
            accessibilityHint="Opens the refund and cancellation policy on our website"
            onPress={() => openLegal("refunds")}
          />
          <LinkRow
            icon="delete-outline"
            label="Account & Data Deletion"
            accessibilityHint="Opens the account and data deletion policy on our website"
            onPress={() => openLegal("deletion")}
            isLast
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
