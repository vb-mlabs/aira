import * as React from "react";

interface DrawerContextValue {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

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
