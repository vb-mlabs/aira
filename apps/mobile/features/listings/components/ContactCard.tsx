import * as React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Business } from "@aira/validators";

interface ContactCardProps {
  business: Business;
}

interface RowProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
  onPress: () => void;
  /** Last row in the card drops the bottom border so the divider stack
   *  reads cleanly. */
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
          ? "flex-row items-center py-3"
          : "flex-row items-center border-b border-border py-3"
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

/** Contact card — phone, WhatsApp, website, address (tap → maps),
 *  hours (display-only). Rows hidden when their field is null. */
export function ContactCard({ business }: ContactCardProps) {
  const rows: { key: string; node: React.ReactNode }[] = [];

  if (business.phone) {
    rows.push({
      key: "phone",
      node: (
        <Row
          icon="phone"
          label="Call"
          value={business.phone}
          onPress={() => {
            void Linking.openURL(`tel:${business.phone}`);
          }}
        />
      ),
    });
  }
  if (business.whatsapp_number) {
    const digits = business.whatsapp_number.replace(/\D/g, "");
    rows.push({
      key: "whatsapp",
      node: (
        <Row
          icon="whatsapp"
          label="WhatsApp"
          value={business.whatsapp_number}
          onPress={() => {
            void Linking.openURL(`https://wa.me/${digits}`);
          }}
        />
      ),
    });
  }
  if (business.website) {
    rows.push({
      key: "website",
      node: (
        <Row
          icon="web"
          label="Website"
          value={business.website}
          onPress={() => {
            void Linking.openURL(business.website as string);
          }}
        />
      ),
    });
  }
  if (business.address) {
    rows.push({
      key: "address",
      node: (
        <Row
          icon="map-marker"
          label="Address"
          value={business.address}
          onPress={() => {
            void Linking.openURL(
              `https://maps.google.com/?q=${encodeURIComponent(
                business.address as string,
              )}`,
            );
          }}
        />
      ),
    });
  }
  if (business.hours) {
    rows.push({
      key: "hours",
      node: (
        <Row
          icon="clock-outline"
          label="Hours"
          value={business.hours}
          onPress={() => {}}
        />
      ),
    });
  }

  if (rows.length === 0) return null;

  return (
    <View className="rounded-xl bg-card px-4">
      {rows.map((row, i) => (
        <React.Fragment key={row.key}>
          {/* Inject isLast via cloning so the last row drops its border. */}
          {React.cloneElement(row.node as React.ReactElement<RowProps>, {
            isLast: i === rows.length - 1,
          })}
        </React.Fragment>
      ))}
    </View>
  );
}
