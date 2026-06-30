import * as React from "react";
import { Linking, Pressable, Text } from "react-native";
import { brand } from "@aira/config";

interface ReportButtonProps {
  kind: "post" | "comment";
  id: string;
}

/** Mailto-based content-report affordance — covers Apple Guideline 1.2
 *  (User-Generated Content) minimum bar without backend work. Tap opens
 *  the user's mail client with a templated subject + body referencing
 *  the post or comment id. P3 may upgrade to a proper in-app report
 *  flow with a moderation queue if TestFlight reviewer asks; for now
 *  this is the cheapest defense.
 *
 *  Decision logged 2026-06-29 in .mstack/learnings.jsonl. */
export function ReportButton({ kind, id }: ReportButtonProps) {
  function onPress() {
    const subject = `Report community ${kind} ${id}`;
    const body =
      `I'd like to report the ${kind} with id ${id}.\n\n` +
      `Reason:\n\n`;
    const url = `mailto:${brand.supportEmail}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    void Linking.openURL(url);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Report this ${kind}`}
      onPress={onPress}
      hitSlop={6}
    >
      <Text className="text-xs font-semibold text-mutedForeground underline">
        Report
      </Text>
    </Pressable>
  );
}
