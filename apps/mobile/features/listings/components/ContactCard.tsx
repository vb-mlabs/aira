import * as React from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Business } from "@aira/validators";
import {
  formatUSPhoneTel,
  formatUSPhoneWithCode,
  formatWhatsappDigits,
} from "../../../lib/format-phone";

interface ContactCardProps {
  business: Business;
}

/**
 * Open native maps with turn-by-turn directions to `address`.
 *
 * Probes the platform-native URL scheme first (Apple Maps on iOS,
 * Google Maps Navigation on Android) — when the user has the app
 * installed, this lands them straight in directions mode from their
 * current location. When the scheme rejects (Google Maps not
 * installed on Android, or the iOS user disabled Maps somehow),
 * falls back to the universal Google Maps directions URL — which
 * opens the Google Maps app if installed and the browser otherwise.
 *
 * Catches `canOpenURL` rejections silently and proceeds to the
 * fallback so a misconfigured device never breaks the directions tap.
 */
async function openDirections(address: string): Promise<void> {
  const encoded = encodeURIComponent(address);
  const nativeUrl =
    Platform.OS === "ios"
      ? `maps://?daddr=${encoded}`
      : `google.navigation:q=${encoded}`;
  const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;

  try {
    const ok = await Linking.canOpenURL(nativeUrl);
    if (ok) {
      await Linking.openURL(nativeUrl);
      return;
    }
  } catch {
    // canOpenURL can throw on Android when the package query allowlist
    // doesn't include the target — fall through to the HTTPS URL.
  }
  await Linking.openURL(fallbackUrl);
}

interface RowProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
  onPress: () => void;
  /** Optional VoiceOver / TalkBack hint describing what the tap does.
   *  Only set on the directions row in P3 — other rows can adopt the
   *  hint later in a focused a11y pass. */
  accessibilityHint?: string;
  /** Last row in the card drops the bottom border so the divider stack
   *  reads cleanly. */
  isLast?: boolean;
}

function Row({
  icon,
  label,
  value,
  onPress,
  accessibilityHint,
  isLast,
}: RowProps) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={accessibilityHint}
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
    const phoneRaw = business.phone;
    rows.push({
      key: "phone",
      node: (
        <Row
          icon="phone"
          label="Call"
          value={formatUSPhoneWithCode(phoneRaw)}
          onPress={() => {
            void Linking.openURL(`tel:${formatUSPhoneTel(phoneRaw)}`);
          }}
        />
      ),
    });
  }
  if (business.whatsapp_number) {
    const waRaw = business.whatsapp_number;
    rows.push({
      key: "whatsapp",
      node: (
        <Row
          icon="whatsapp"
          label="WhatsApp"
          value={formatUSPhoneWithCode(waRaw)}
          onPress={() => {
            // wa.me REQUIRES the country code — bare 10 digits routes
            // to Romania (country code 4). formatWhatsappDigits always
            // returns "1XXXXXXXXXX" when the stored value has 10+ digits.
            void Linking.openURL(`https://wa.me/${formatWhatsappDigits(waRaw)}`);
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
    const address = business.address;
    rows.push({
      key: "address",
      node: (
        <Row
          icon="map-marker"
          label="Get directions"
          value={address}
          accessibilityHint={`Opens directions to ${address}`}
          onPress={() => {
            void openDirections(address);
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
