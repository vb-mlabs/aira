import * as React from "react";
import {
  Modal,
  Pressable,
  View,
  Text,
  type ModalProps,
} from "react-native";

export interface SheetProps extends Pick<ModalProps, "animationType"> {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * Bottom sheet primitive — slide-up modal anchored to the bottom of the
 * screen. Tapping the scrim closes. Matches shadcn's Sheet API at a high
 * level.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  animationType = "slide",
}: SheetProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close sheet"
        onPress={onClose}
        className="flex-1 bg-black/40"
      >
        <View className="mt-auto rounded-t-2xl bg-background p-6">
          {title ? (
            <Text className="mb-3 text-lg font-semibold text-foreground">
              {title}
            </Text>
          ) : null}
          <Pressable onPress={(e) => e.stopPropagation?.()}>
            {children}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
