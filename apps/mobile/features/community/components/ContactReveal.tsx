import * as React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ContactRevealProps {
  phone: string | null;
  email: string | null;
}

/** Phone + email rows on the post detail screen. Always-visible (match
 *  web — locked review decision). Returns null when both fields are
 *  empty so the detail screen doesn't render an orphan header. */
export function ContactReveal({ phone, email }: ContactRevealProps) {
  const hasPhone = !!phone && phone.trim().length > 0;
  const hasEmail = !!email && email.trim().length > 0;
  if (!hasPhone && !hasEmail) return null;

  return (
    <View className="rounded-xl bg-card">
      <View className="px-4 pt-3 pb-1">
        <Text className="text-xs font-semibold uppercase tracking-wider text-mutedForeground">
          Contact the author
        </Text>
      </View>
      <View className="px-4 pb-3">
        {hasPhone ? (
          <Row
            icon="phone"
            label="Call"
            value={phone as string}
            onPress={() => {
              void Linking.openURL(`tel:${phone}`);
            }}
            isLast={!hasEmail}
          />
        ) : null}
        {hasEmail ? (
          <Row
            icon="email-outline"
            label="Email"
            value={email as string}
            onPress={() => {
              void Linking.openURL(`mailto:${email}`);
            }}
            isLast
          />
        ) : null}
      </View>
    </View>
  );
}

interface RowProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
  onPress: () => void;
  isLast?: boolean;
}

function Row({ icon, label, value, onPress, isLast }: RowProps) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      className={
        isLast
          ? "flex-row items-center py-2"
          : "flex-row items-center border-b border-border py-2"
      }
      style={{ gap: 12 }}
    >
      <View
        className="items-center justify-center rounded-full bg-muted"
        style={{ width: 32, height: 32 }}
      >
        <MaterialCommunityIcons name={icon} size={16} color="#4F653B" />
      </View>
      <View className="flex-1">
        <Text className="text-xs text-mutedForeground">{label}</Text>
        <Text className="text-sm text-foreground" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}
