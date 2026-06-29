import * as React from "react";
import { Linking, Pressable, View } from "react-native";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";

interface SocialIconsProps {
  facebook_url?: string | null;
  instagram_url?: string | null;
  whatsapp_number?: string | null;
  phone?: string | null;
  website?: string | null;
  /** Card-density mode: drops the map pin, action-first ordering
   *  (Phone → WhatsApp → Website → IG/FB), caps at 4. Mirrors web's
   *  recent SocialLinks compact mode. Default true on mobile because
   *  every consumer in P1 is a card-density surface. */
  compact?: boolean;
}

const SIZE = 32;
const ICON_SIZE = 14;

function IconButton({
  bg,
  label,
  href,
  children,
}: {
  bg: string;
  label: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => {
        void Linking.openURL(href);
      }}
      hitSlop={4}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{ width: SIZE, height: SIZE, backgroundColor: bg }}
      >
        {children}
      </View>
    </Pressable>
  );
}

export function SocialIcons({
  facebook_url,
  instagram_url,
  whatsapp_number,
  phone,
  website,
  compact = true,
}: SocialIconsProps) {
  const waHref = whatsapp_number
    ? `https://wa.me/${whatsapp_number.replace(/\D/g, "")}`
    : null;

  const tel = phone ? (
    <IconButton key="tel" bg="#16A34A" label="Call" href={`tel:${phone}`}>
      <MaterialCommunityIcons
        name="phone"
        size={ICON_SIZE}
        color="white"
      />
    </IconButton>
  ) : null;

  const wa = waHref ? (
    <IconButton key="wa" bg="#25D366" label="WhatsApp" href={waHref}>
      <FontAwesome5 name="whatsapp" size={ICON_SIZE} color="white" />
    </IconButton>
  ) : null;

  const web = website ? (
    <IconButton key="web" bg="#6366F1" label="Website" href={website}>
      <MaterialCommunityIcons name="web" size={ICON_SIZE} color="white" />
    </IconButton>
  ) : null;

  const ig = instagram_url ? (
    <IconButton
      key="ig"
      bg="#E1306C"
      label="Instagram"
      href={instagram_url}
    >
      <FontAwesome5 name="instagram" size={ICON_SIZE} color="white" />
    </IconButton>
  ) : null;

  const fb = facebook_url ? (
    <IconButton key="fb" bg="#1877F2" label="Facebook" href={facebook_url}>
      <FontAwesome5 name="facebook-f" size={ICON_SIZE} color="white" />
    </IconButton>
  ) : null;

  // Compact mode: action-first, Instagram preferred for 4th slot, no map.
  const icons = compact
    ? [tel, wa, web, ig ?? fb].filter(Boolean).slice(0, 4)
    : [fb, ig, wa, web, tel].filter(Boolean);

  if (icons.length === 0) return null;

  return (
    <View className="flex-row items-center" style={{ gap: 6 }}>
      {icons}
    </View>
  );
}
