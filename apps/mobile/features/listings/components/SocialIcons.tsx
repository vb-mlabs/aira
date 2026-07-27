import * as React from "react";
import { Linking, Pressable, View } from "react-native";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  formatUSPhoneTel,
  formatWhatsappDigits,
} from "../../../lib/format-phone";

interface SocialIconsProps {
  facebook_url?: string | null;
  instagram_url?: string | null;
  whatsapp_number?: string | null;
  phone?: string | null;
  website?: string | null;
  /** Free-form address. When set + compact=false, adds a Google Maps
   *  directions pin. In compact mode the map is deprioritised (see
   *  order note below). */
  address?: string | null;
  /** Card-density mode: caps at 4 icons. Priority is action-first with
   *  WhatsApp + Directions demoted to the tail so they're the first to
   *  drop when the row overflows — a business with Phone, Website,
   *  Instagram, Facebook AND WhatsApp shows the first four and hides
   *  WhatsApp; adding Directions pushes it out too. Mirrors the mobile
   *  BusinessCard slot budget.
   *
   *  Detail surfaces (BusinessHero) pass compact=false to keep all six
   *  channels visible with no cap. */
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
  address,
  compact = true,
}: SocialIconsProps) {
  // wa.me REQUIRES the country code (bare 10 digits routes to Romania,
  // country code 4) — formatWhatsappDigits guarantees "1XXXXXXXXXX"
  // for stored 10-digit US values. tel: uses full E.164 for
  // unambiguous dialer routing across iOS + Android.
  const waHref = whatsapp_number
    ? `https://wa.me/${formatWhatsappDigits(whatsapp_number)}`
    : null;
  const telHref = phone ? `tel:${formatUSPhoneTel(phone)}` : null;
  const mapsHref = address
    ? `https://maps.google.com/?q=${encodeURIComponent(address)}`
    : null;

  const tel = telHref ? (
    <IconButton key="tel" bg="#16A34A" label="Call" href={telHref}>
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

  const map = mapsHref ? (
    <IconButton key="map" bg="#EA4335" label="Directions" href={mapsHref}>
      <MaterialCommunityIcons
        name="map-marker"
        size={ICON_SIZE}
        color="white"
      />
    </IconButton>
  ) : null;

  // Compact (card) mode: action-first, cap at 4. WhatsApp + Directions
  // sit at the tail so they're the first to drop when the row overflows.
  // A business with tel+web+ig+fb+wa+map shows the first four and hides
  // wa+map — the "channels an admin cares most about" cluster survives.
  //
  // Detail (compact=false): full set, no cap. Order mirrors the web
  // BusinessCard's detail row and keeps the ig-before-wa grouping
  // (socials → messaging → website → phone → map) so users scan them in
  // the same left-to-right rhythm on both platforms.
  const icons = compact
    ? [tel, web, ig, fb, wa, map].filter(Boolean).slice(0, 4)
    : [fb, ig, wa, web, tel, map].filter(Boolean);

  if (icons.length === 0) return null;

  return (
    <View className="flex-row items-center" style={{ gap: 6 }}>
      {icons}
    </View>
  );
}
