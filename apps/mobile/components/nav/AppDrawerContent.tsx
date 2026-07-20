import * as React from "react";
import {
  Image,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { brand } from "@aira/config";
import { useDrawer } from "./DrawerProvider";
import { useCategories } from "../../features/listings/hooks";
import { getCategoryMeta } from "../../features/listings/category-meta";
import type { Category } from "@aira/validators";

// The parent-entity website; Globe icon in the footer points here rather
// than brand.url (users are already inside AIRA). Matches web sidebar's
// NISARGA_WEBSITE_URL constant at apps/web/src/app/(app)/_components/app-sidebar.tsx:38.
const NISARGA_WEBSITE_URL = "https://nisargacorp.com";

// Cream/olive tint set used across the drawer. Kept as sRGB literals
// because RN can't read CSS custom properties; mirrors the constants
// already in [category].tsx and the account hub.
const TINT_LIGHT = "#F3EBDD"; // sidebar-foreground (cream on olive)
const TINT_LIGHT_MUTED = "rgba(243,235,221,0.72)";
const TINT_LIGHT_HAIRLINE = "rgba(243,235,221,0.14)";
const TIER2_HEX = "#C97638"; // burnt-orange sub-cat pill accent

/**
 * Contents of the slide-in mobile drawer. Structurally 1:1 with the web
 * AppSidebar at apps/web/src/app/(app)/_components/app-sidebar.tsx:
 * header (logo + wordmark + "by Nisarga" + close ✕), Home row, Post on
 * AIRA row, category tree with expandable sub-groups, Contact footer
 * (mailto + Nisarga globe + "Operated by"). One deliberate divergence:
 * the Admin row is not rendered on mobile — mobile has no /admin route
 * and bearer-token sessions don't sync to web cookies, so a Linking
 * hop would drop admins into a signed-out browser.
 *
 * Auto-close on nav: usePathname() in a ref-guarded effect calls
 * closeDrawer() when the pathname changes — mirrors the web
 * MobileSidebar's lastPathname ref pattern. Guard runs setState exactly
 * once per change instead of every render.
 */
export function AppDrawerContent() {
  const { closeDrawer } = useDrawer();
  const cats = useCategories();
  const pathname = usePathname();
  const searchParams = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const lastPathname = React.useRef(pathname);

  React.useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    closeDrawer();
  }, [pathname, closeDrawer]);

  const roots = (cats.data?.categories ?? []).filter((c) => c.active !== false);
  const subsByRoot = cats.data?.subsByRoot ?? {};

  // Compute the origin href so category / sub taps can push with a
  // `?from=<encoded-current-screen>` param. useOriginAwareBack on the
  // category-listing screen honours this, so OS back gestures return
  // the user to whichever screen the drawer was opened from — same
  // treatment BusinessCard applies to biz-detail pushes.
  const from = React.useMemo(() => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === "from") continue;
      if (typeof v === "string" && v.length > 0) qs.set(k, v);
    }
    const query = qs.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  return (
    <ImageBackground
      source={require("../../assets/textures/sidebar-green.webp")}
      resizeMode="cover"
      style={{ flex: 1 }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      {/* paddingTop clears the status-bar / notch — AppDrawer's Modal is
          statusBarTranslucent so the ImageBackground paints edge-to-edge,
          and the header content insets below the safe zone. Minimum 24pt
          for platforms with no reported inset (small Android devices). */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: TINT_LIGHT_HAIRLINE,
          paddingHorizontal: 20,
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: 20,
        }}
      >
        <Image
          source={require("../../assets/logo.png")}
          style={{ width: 48, height: 48, flexShrink: 0 }}
          resizeMode="contain"
          accessibilityLabel={`${brand.name} logo`}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            className="font-display"
            style={{ color: TINT_LIGHT, fontSize: 24, lineHeight: 26 }}
          >
            {brand.name}
          </Text>
          <Text
            style={{
              color: TINT_LIGHT_MUTED,
              fontSize: 12,
              fontStyle: "italic",
              marginTop: 4,
            }}
          >
            by {brand.parentName}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={closeDrawer}
          hitSlop={8}
          style={{ padding: 4 }}
        >
          <Text style={{ color: TINT_LIGHT, fontSize: 22, lineHeight: 22 }}>
            ✕
          </Text>
        </Pressable>
      </View>

      {/* ── Nav body ──────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        <DrawerRow
          icon="home-outline"
          label="Home"
          active={pathname === "/" || pathname === "/(app)"}
          onPress={() => router.push("/(app)" as never)}
        />
        <DrawerRow
          icon="message-text-outline"
          label={`Post on ${brand.name}`}
          active={pathname?.startsWith("/post") ?? false}
          onPress={() => router.push("/(app)/post" as never)}
        />

        {roots.map((root) => {
          const subs = subsByRoot[root.id] ?? [];
          return subs.length === 0 ? (
            <DrawerRow
              key={root.id}
              icon={getCategoryMeta(root.slug).iconName}
              label={root.name}
              active={pathname?.startsWith(`/listings/${root.slug}`) ?? false}
              onPress={() =>
                router.push({
                  pathname: "/listings/[category]",
                  params: { category: root.slug, from },
                } as never)
              }
            />
          ) : (
            <CategoryGroup
              key={root.id}
              root={root}
              subs={subs}
              pathname={pathname ?? ""}
              from={from}
            />
          );
        })}
      </ScrollView>

      {/* ── Footer ────────────────────────────────────────── */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: TINT_LIGHT_HAIRLINE,
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 20,
          alignItems: "center",
        }}
      >
        <Text
          className="font-display"
          style={{ color: TINT_LIGHT, fontSize: 16, marginBottom: 12 }}
        >
          Contact Us
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <FooterIconButton
            icon="email-outline"
            accessibilityLabel="Email support"
            onPress={() =>
              void Linking.openURL(`mailto:${brand.supportEmail}`)
            }
          />
          <FooterIconButton
            icon="web"
            accessibilityLabel={`${brand.legalEntity} website`}
            onPress={() => void Linking.openURL(NISARGA_WEBSITE_URL)}
          />
        </View>
        <Text
          style={{
            color: TINT_LIGHT_MUTED,
            fontSize: 10,
            letterSpacing: 0.5,
            textAlign: "center",
          }}
        >
          Operated by {brand.legalEntity}
        </Text>
      </View>
    </ImageBackground>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Rows

interface DrawerRowProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  active: boolean;
  onPress: () => void;
}

function DrawerRow({ icon, label, active, onPress }: DrawerRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: TINT_LIGHT_HAIRLINE,
        backgroundColor: active ? "rgba(243,235,221,0.10)" : "transparent",
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={TINT_LIGHT}
        style={{ opacity: 0.9 }}
      />
      <Text
        style={{
          color: TINT_LIGHT,
          fontSize: 14,
          flex: 1,
          fontWeight: active ? "700" : "400",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface CategoryGroupProps {
  root: Category;
  subs: Category[];
  pathname: string;
  from: string;
}

function CategoryGroup({ root, subs, pathname, from }: CategoryGroupProps) {
  const parentActive = pathname.startsWith(`/listings/${root.slug}`);
  const anyChildActive = subs.some((s) =>
    pathname.startsWith(`/listings/${s.slug}`),
  );
  const routeActive = parentActive || anyChildActive;
  const [clickOpen, setClickOpen] = React.useState(routeActive);
  const open = clickOpen || routeActive;
  const meta = getCategoryMeta(root.slug);

  // Single tap on a root with subs = toggle expand (no navigation).
  // Roots without subs render via DrawerRow (which does navigate on tap).
  // Sub-rows below still navigate. Diverges from web's parallel behaviour
  // where the parent row navigates and the chevron button toggles —
  // mobile taps are less precise so we consolidate to one tappable region.
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={root.name}
        accessibilityHint={
          open
            ? `Collapse ${root.name} subcategories`
            : `Expand ${root.name} subcategories`
        }
        accessibilityState={{ expanded: open }}
        onPress={() => setClickOpen((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: TINT_LIGHT_HAIRLINE,
          backgroundColor: routeActive
            ? "rgba(243,235,221,0.10)"
            : "transparent",
        }}
      >
        <MaterialCommunityIcons
          name={meta.iconName}
          size={18}
          color={TINT_LIGHT}
          style={{ opacity: 0.9 }}
        />
        <Text
          style={{
            color: TINT_LIGHT,
            fontSize: 14,
            flex: 1,
            fontWeight: parentActive ? "700" : "400",
          }}
          numberOfLines={1}
        >
          {root.name}
        </Text>
        <MaterialCommunityIcons
          name={open ? "chevron-down" : "chevron-right"}
          size={14}
          color={TINT_LIGHT_MUTED}
        />
      </Pressable>
      {open
        ? subs.map((sub) => {
            const childActive = pathname.startsWith(`/listings/${sub.slug}`);
            return (
              <Pressable
                key={sub.id}
                accessibilityRole="button"
                accessibilityLabel={sub.name}
                onPress={() =>
                  router.push({
                    pathname: "/listings/[category]",
                    params: { category: sub.slug, from },
                  } as never)
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingLeft: 48,
                  paddingRight: 20,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: TINT_LIGHT_HAIRLINE,
                  backgroundColor: TIER2_HEX,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: TINT_LIGHT,
                    opacity: 0.6,
                  }}
                />
                <Text
                  style={{
                    color: TINT_LIGHT,
                    fontSize: 12,
                    flex: 1,
                    fontWeight: childActive ? "700" : "400",
                  }}
                  numberOfLines={1}
                >
                  {sub.name}
                </Text>
              </Pressable>
            );
          })
        : null}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Footer icon buttons

interface FooterIconButtonProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  accessibilityLabel: string;
  onPress: () => void;
}

function FooterIconButton({
  icon,
  accessibilityLabel,
  onPress,
}: FooterIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: TINT_LIGHT_HAIRLINE,
        backgroundColor: "rgba(243,235,221,0.10)",
      }}
    >
      <MaterialCommunityIcons name={icon} size={16} color={TINT_LIGHT} />
    </Pressable>
  );
}
