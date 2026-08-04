import * as React from "react";
import { Modal, Pressable, ScrollView, View, Text } from "react-native";
import { Button } from "./Button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Body content. A plain string is wrapped in the standard muted-text
   *  paragraph style; pass JSX for multi-paragraph or link-embedded
   *  bodies (styling is then the caller's responsibility). */
  description?: React.ReactNode;
  /** Primary action label; tap fires `onConfirm`. */
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
}

/**
 * Dialog primitive — centered modal with title, optional description, and
 * confirm / cancel buttons. Use for destructive confirmations
 * ("Delete account?", "Sign out?").
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
}: DialogProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss dialog"
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/40 p-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          className="w-full max-w-md rounded-xl bg-background p-6"
        >
          <Text
            accessibilityRole="header"
            className="mb-2 text-lg font-semibold text-foreground"
          >
            {title}
          </Text>
          {description !== undefined && description !== null ? (
            // ScrollView so long bodies (multi-paragraph, embedded
            // links) don't push the buttons off-screen on small
            // devices. maxHeight caps the scrollable area so the modal
            // itself stays bounded to a comfortable read length.
            <ScrollView
              className="mb-4"
              style={{ maxHeight: 360 }}
              contentContainerStyle={{ gap: 10 }}
            >
              {typeof description === "string" ? (
                <Text className="text-base text-mutedForeground">
                  {description}
                </Text>
              ) : (
                description
              )}
            </ScrollView>
          ) : null}
          <View className="mt-2 flex-row justify-end gap-2">
            <Button variant="ghost" size="sm" onPress={onClose}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? "destructive" : "primary"}
              size="sm"
              onPress={async () => {
                // Await onConfirm so async work (mutations, network) finishes
                // before the modal dismisses — otherwise the confirm fires,
                // the dialog closes on the same tick, and the caller's
                // spinner/toast state has nowhere to attach. finally so a
                // rejected mutation still dismisses the dialog cleanly.
                try {
                  await onConfirm?.();
                } finally {
                  onClose();
                }
              }}
            >
              {confirmLabel}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
