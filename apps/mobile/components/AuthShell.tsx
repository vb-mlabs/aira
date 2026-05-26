import * as React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { brand } from "@aira/config";

// Shared shell for every (auth)/* screen on mobile except welcome.tsx
// (welcome is a brand-hero composition that stands alone).
//
// Owns the chrome — safe area, keyboard handling, scroll behavior, the
// centred tree-of-life logo header at 80x80, and the "AIRA by Nisarga"
// attribution footer. Each consuming screen renders only its own
// heading / form / inline links between logo and footer.
//
// Asymmetric to web: web's (auth)/layout.tsx wraps every page
// automatically via Next.js's layout convention. Expo Router's
// _layout.tsx is a navigator (Stack/Tabs) and can't compose into screen
// bodies, so the same shared chrome lives in this component, imported
// per screen.
export function AuthShell({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-6">
            <View className="items-center pt-4 pb-6">
              <Image
                source={require("../assets/logo.png")}
                style={{ width: 80, height: 80 }}
                accessibilityLabel={`${brand.name} logo`}
              />
            </View>
            {children}
          </View>
          <View className="items-center px-6 pb-6 pt-4">
            <Text className="text-xs text-mutedForeground">
              {brand.name} by {brand.parentName}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
