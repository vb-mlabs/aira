import * as React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { brand } from "@aira/config";
import { BackButton } from "../../../components/nav/BackButton";
import { TopBar } from "../../../components/nav/TopBar";

/**
 * /account/safety-community — community standards summary + how to
 * report content and block users. Brand voice; not a full policy
 * document. Copy paraphrases the same values referenced elsewhere
 * (moderation clause in /account/terms, report/block flows in the
 * post/comment surfaces).
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

export default function SafetyCommunityScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TopBar title="Safety & Community" left={<BackButton />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-5 pt-5">
          <Text className="font-display text-2xl font-bold text-foreground">
            A kind, useful community
          </Text>
          <Text className="mt-2 text-sm text-mutedForeground">
            The short version of what we expect from every member — and
            what we do when something goes wrong.
          </Text>
        </View>

        <Section
          title="Community standards"
          body={`Be respectful and truthful. No harassment, hate speech, threats, or spam. No impersonating another person or business. Keep posts relevant to the ${brand.name} community.`}
        />
        <Section
          title="Reporting content"
          body="Tap the ⋯ menu on any post or comment and choose Report. Reports are private — the author isn't told who flagged them. A moderator reviews every report."
        />
        <Section
          title="Blocking someone"
          body="Open their profile and choose Block. You won't see their posts or comments, and they can't message you. Blocks are silent — the other person isn't notified."
        />
        <Section
          title="Moderation decisions"
          body="We may hide or remove content that violates these standards without notice. Repeat violations can lead to account suspension. Appeal any decision by emailing support — a human will look at it."
        />
        <Section
          title="Emergencies"
          body="If you're in immediate danger or someone else is, contact local emergency services. We can't respond to safety emergencies in-app."
        />
        <Section
          title="Contact"
          body={`Questions about safety or a moderation decision? Email ${brand.supportEmail}.`}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
