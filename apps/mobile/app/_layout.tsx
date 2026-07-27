import * as React from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import * as SplashScreen from "expo-splash-screen";
import { ToastProvider } from "../components/ui/Toast";
import { DrawerProvider } from "../components/nav/DrawerProvider";
import { AppDrawer } from "../components/nav/AppDrawer";
import { useAppFonts } from "../lib/fonts";
import { installNotificationHandlers } from "../lib/notification-tap";
import "../global.css";

// Keep the splash up until fonts (Geist) finish loading. Pass-4 design spec
// mandates Geist for web parity. Falls back to system fonts if the binaries
// are absent (forks drop them into mobile/assets/fonts/).
SplashScreen.preventAutoHideAsync().catch(() => {
  /* noop — already hidden */
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        /* noop */
      });
    }
  }, [fontsLoaded]);

  // Push notification foreground behaviour + tap-to-open wiring.
  // Installed once at root — returns a cleanup fn but production
  // never calls it (the listener lives for the app's lifetime).
  // See apps/mobile/lib/notification-tap.ts for the full trace.
  React.useEffect(() => {
    return installNotificationHandlers();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ActionSheetProvider>
          <ToastProvider>
            <DrawerProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(app)" />
              </Stack>
              {/* Mounted at root so it overlays every route. AppDrawer
                  reads open state from DrawerProvider; trigger buttons
                  (HamburgerButton per tab-root screen) call
                  useDrawer().openDrawer(). */}
              <AppDrawer />
            </DrawerProvider>
          </ToastProvider>
        </ActionSheetProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
