import * as React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// P1 soft-placeholder for the Post on AIRA tab. P2 replaces this with the
// real community board (browse posts + composer + post detail + comments).
// Copy locked during /mlabs-review — see
// .mstack/reviews/2026-06-29-mobile-parity-p1-listings-browse.md
// "Decisions locked".

export default function PostScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <View
          className="w-full max-w-sm rounded-3xl border border-border bg-card px-8 py-12"
          style={{ alignItems: "center" }}
        >
          <Text
            accessibilityRole="header"
            className="font-display text-3xl font-bold text-foreground"
            style={{ textAlign: "center" }}
          >
            Post on AIRA
          </Text>
          <Text
            className="mt-3 text-base text-mutedForeground"
            style={{ textAlign: "center" }}
          >
            Coming in the next update.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
