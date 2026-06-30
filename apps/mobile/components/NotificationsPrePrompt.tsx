// F21 — push pre-prompt.
//
// Rendered in the post-login flow (apps/mobile/app/(app)/_layout.tsx) the
// first time after sign-in, before the home tab paints. Industry-standard
// "explain before the OS prompt fires" pattern.

import * as React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  dismissPushPrePrompt,
  requestPermissionAndRegister,
} from "../lib/push";
import { useThemeColors } from "../lib/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function NotificationsPrePrompt({ visible, onClose }: Props) {
  const colors = useThemeColors();
  const [busy, setBusy] = React.useState(false);
  const [hint, setHint] = React.useState<string | null>(null);

  async function handleEnable() {
    setBusy(true);
    setHint(null);
    const result = await requestPermissionAndRegister();
    setBusy(false);
    if (result.error) {
      setHint(result.error);
      // Stay on screen so the user can see the hint; close advances on
      // explicit confirm.
      return;
    }
    onClose();
  }

  async function handleLater() {
    await dismissPushPrePrompt();
    onClose();
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleLater}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            Stay in the loop
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            AIRA admins occasionally send updates about your listings —
            payment confirmations, listing reviews, renewal reminders. Enable
            notifications to get them on your lock screen.
          </Text>
          {hint && (
            <Text style={[styles.hint, { color: colors.destructive }]}>
              {hint}
            </Text>
          )}
          <Pressable
            disabled={busy}
            onPress={handleEnable}
            style={[
              styles.primary,
              { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text
                style={[styles.primaryLabel, { color: colors.primaryForeground }]}
              >
                Enable notifications
              </Text>
            )}
          </Pressable>
          <Pressable disabled={busy} onPress={handleLater} style={styles.secondary}>
            <Text
              style={[
                styles.secondaryLabel,
                { color: colors.mutedForeground, opacity: busy ? 0.6 : 1 },
              ]}
            >
              Maybe later
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  hint: {
    fontSize: 13,
    marginBottom: 12,
  },
  primary: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  secondary: {
    alignItems: "center",
    marginTop: 12,
  },
  secondaryLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
