import * as React from "react";
import { Linking } from "react-native";

interface DrawerContextValue {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

// How long the cold-start peek stays open before auto-closing.
const PEEK_MS = 1000;

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  const value = React.useMemo<DrawerContextValue>(
    () => ({
      open,
      openDrawer: () => setOpen(true),
      closeDrawer: () => setOpen(false),
    }),
    [open],
  );

  // Universal-link peek: if the app cold-started via a link into
  // /listings/<slug>, briefly open the drawer so the user sees where
  // they landed in the category tree, then auto-close. Fires once on
  // mount only (Linking.getInitialURL resolves the URL that launched
  // the app; subsequent in-app navigations don't retrigger). Returns
  // null on Expo Go dev in most cases — that's fine, effect no-ops.
  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    void (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (cancelled || !initialUrl) return;
      // Match either apex-path (/listings/...) or Universal-Link host
      // form (https://airabynisarga.com/listings/...). Cheapest check
      // is a substring match on "/listings/" — no need to parse.
      if (!initialUrl.includes("/listings/")) return;
      setOpen(true);
      timer = setTimeout(() => {
        if (!cancelled) setOpen(false);
      }, PEEK_MS);
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
  );
}

export function useDrawer(): DrawerContextValue {
  const ctx = React.useContext(DrawerContext);
  if (!ctx) {
    // Fail loud in dev: a hamburger tap should never happen outside the
    // provider. Wrapping <AppDrawer /> + trigger buttons inside
    // <DrawerProvider> at app/_layout.tsx is the single source of truth.
    throw new Error("useDrawer must be used inside <DrawerProvider>");
  }
  return ctx;
}
