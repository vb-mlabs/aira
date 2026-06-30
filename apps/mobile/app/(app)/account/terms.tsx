import * as React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { brand } from "@aira/config";

/**
 * /account/terms — short terms of service text. Brand voice; not a
 * full legal TOS. The legal entity is named explicitly via
 * brand.legalEntity per the apex-only + no-brand-string-literal
 * conventions in CLAUDE.md.
 */

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

export default function TermsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen options={{ title: "Terms" }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-5 pt-5">
          <Text className="font-display text-2xl font-bold text-foreground">
            Terms of Service
          </Text>
          <Text className="mt-2 text-sm text-mutedForeground">
            Effective immediately on app install. Operated by{" "}
            {brand.legalEntity}.
          </Text>
        </View>

        <Section
          title="Use of the app"
          body={`${brand.name} is a community directory connecting neighbors with verified local businesses. You agree to use it respectfully — no harassment, no spam, no impersonation, no content that violates community standards.`}
        />
        <Section
          title="Your content"
          body="You retain ownership of posts and comments you publish. By posting on AIRA you give us a license to display your content within the app for as long as your account remains active or until you delete the content."
        />
        <Section
          title="Listings"
          body="Business listings are curated by the AIRA team. We may add, edit, or remove listings at our discretion. Verification badges indicate we've checked the business is real; they're not endorsements of quality."
        />
        <Section
          title="Moderation"
          body={`Posts and comments are moderated. We may remove content that violates community standards without notice. To report a post or comment, use the Report link or email ${brand.supportEmail}.`}
        />
        <Section
          title="Account termination"
          body="You can delete your account from the Account hub at any time. We may suspend or terminate accounts that violate these terms."
        />
        <Section
          title="Changes"
          body="We may update these terms. Material changes will be announced in-app. Continued use of the app after changes means you accept the new terms."
        />
        <Section
          title="Contact"
          body={`Questions? Email ${brand.supportEmail}.`}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
