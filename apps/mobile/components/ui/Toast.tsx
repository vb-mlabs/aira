import * as React from "react";
import { Animated, Pressable, Text, View } from "react-native";

/**
 * Bottom-anchored toast. 3s success / 6s error, dismiss-on-tap.
 *
 * Single context-based API:
 *   const { show } = useToast();
 *   show({ message: "Saved", kind: "success" });
 */

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  show: (toast: { message: string; kind?: ToastKind }) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<ToastItem | null>(null);
  const opacity = React.useRef(new Animated.Value(0)).current;

  const dismiss = React.useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [opacity]);

  const show = React.useCallback<ToastContextValue["show"]>(
    ({ message, kind = "info" }) => {
      const id = nextId++;
      setToast({ id, message, kind });
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      const ms = kind === "error" ? 6000 : 3000;
      setTimeout(() => {
        // Only auto-dismiss if still the same toast.
        setToast((cur) => (cur?.id === id ? null : cur));
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }, ms);
    },
    [opacity]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={{ opacity }}
          className="absolute inset-x-4 bottom-10 items-center"
        >
          <Pressable
            accessibilityRole="alert"
            onPress={dismiss}
            className={[
              "rounded-lg px-4 py-3",
              toast.kind === "error"
                ? "bg-destructive"
                : toast.kind === "success"
                  ? "bg-success"
                  : "bg-foreground",
            ].join(" ")}
          >
            <Text className="text-base text-primaryForeground">
              {toast.message}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    // Soft fallback so screens don't crash if rendered outside provider in tests.
    return {
      show: () => {
        /* noop */
      },
    };
  }
  return ctx;
}

// Standalone (non-context) toast view kept for tests / preview.
export function Toast({
  message,
  kind = "info",
}: {
  message: string;
  kind?: ToastKind;
}) {
  return (
    <View
      accessibilityRole="alert"
      className={[
        "self-center rounded-lg px-4 py-3",
        kind === "error"
          ? "bg-destructive"
          : kind === "success"
            ? "bg-success"
            : "bg-foreground",
      ].join(" ")}
    >
      <Text className="text-base text-primaryForeground">{message}</Text>
    </View>
  );
}
