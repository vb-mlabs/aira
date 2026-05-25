import * as React from "react";
import { Modal, Pressable, View, Text } from "react-native";
import { Button } from "./Button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
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
          {description ? (
            <Text className="mb-4 text-base text-mutedForeground">
              {description}
            </Text>
          ) : null}
          <View className="mt-2 flex-row justify-end gap-2">
            <Button variant="ghost" size="sm" onPress={onClose}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? "destructive" : "primary"}
              size="sm"
              onPress={() => {
                onConfirm?.();
                onClose();
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
