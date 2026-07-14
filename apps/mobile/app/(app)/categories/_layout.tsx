import * as React from "react";
import { Stack } from "expo-router";

/**
 * Stack layout for /(app)/categories/*.
 *
 * Native header is hidden — every screen renders a shared JS-rendered
 * <TopBar /> at the top of its own JSX (see
 * apps/mobile/components/nav/TopBar.tsx). This avoids iOS 26's
 * UINavigationBar bar-button "Liquid Glass" capsule that appears
 * behind custom headerLeft/headerRight views on native-stack. The
 * Home tab is unaffected because it uses bottom-tabs' JS-rendered
 * header, which never had this issue.
 */
export default function CategoriesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
