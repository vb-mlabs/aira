import * as React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// P1 placeholder. T3 replaces this with the real categories grid driven by
// listCategoriesOp. Kept minimal so the tab is visible + tappable from T1
// onward (so the layout never shifts on the user between P1 commits).

export default function CategoriesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <Text
          accessibilityRole="header"
          className="font-display text-3xl text-foreground"
        >
          Categories
        </Text>
      </View>
    </SafeAreaView>
  );
}
