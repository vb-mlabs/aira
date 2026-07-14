import * as React from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { brand } from "@aira/config";
import { BackButton } from "../../../components/nav/BackButton";
import { TopBar } from "../../../components/nav/TopBar";

/**
 * /account/about — brand block + support email + marketing version
 * line. Version pulled via expo-constants (already installed at
 * ~18.0.13); the value comes from app.config.ts's `version` field
 * which we bump at each App Store / Play release. Useful for
 * TestFlight QA reporting bugs against a specific build.
 */

const VERSION = Constants.expoConfig?.version ?? "0.0.0";

export default function AboutScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TopBar title="About" left={<BackButton />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Brand hero — logo + wordmark + tagline */}
        <View className="items-center px-6 pt-8">
          <Image
            source={require("../../../assets/logo.png")}
            style={{ width: 110, height: 110 }}
            accessibilityLabel={`${brand.name} tree-of-life logo`}
          />
          <Text
            accessibilityRole="header"
            className="mt-4 font-display text-4xl font-bold text-primary"
          >
            {brand.name}
          </Text>
          <Text
            className="mt-1.5 text-xs font-bold uppercase text-foreground"
            style={{ letterSpacing: 2.5 }}
          >
            {brand.tagline.split(" & ").join(" · ")}
          </Text>
          <Text className="mt-1 text-xs text-mutedForeground">
            by {brand.parentName}
          </Text>
        </View>

        {/* About copy */}
        <View className="mx-5 mt-8">
          <Text className="text-sm leading-relaxed text-foreground">
            {brand.homepage.aboutBody}
          </Text>
        </View>

        {/* Support row */}
        <View className="mx-5 mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Email ${brand.name} support`}
            onPress={() => {
              void Linking.openURL(`mailto:${brand.supportEmail}`);
            }}
            className="flex-row items-center px-4"
            style={{ minHeight: 56, gap: 14 }}
          >
            <MaterialCommunityIcons
              name="email-outline"
              size={20}
              color="#4F653B"
            />
            <View className="flex-1">
              <Text className="text-xs text-mutedForeground">Support</Text>
              <Text className="text-sm text-foreground">
                {brand.supportEmail}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Version + legal entity footer */}
        <View className="items-center px-5 pt-10">
          <Text className="text-xs text-mutedForeground">
            Version {VERSION}
          </Text>
          <Text className="mt-1 text-xs text-mutedForeground">
            © {new Date().getFullYear()} {brand.legalEntity}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
