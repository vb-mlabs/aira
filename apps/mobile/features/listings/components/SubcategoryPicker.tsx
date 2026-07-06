import * as React from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Category } from "@aira/validators";

const MUTED = "#66503f";
const FOREGROUND = "#3D2814";
// Uses the actual primary olive from apps/mobile/tailwind.config.js
// (#496036) so the selected-row tint matches every other active/selected
// state in the app (VerifiedFilterChip, tab bar, etc.).
const ACTIVE_ROW_BG = "rgba(73,96,54,0.12)"; // primary at 12% alpha
const ACTIVE_ROW_BORDER = "rgba(73,96,54,0.32)";

// Visual constants for the anchored menu — matched to iOS UIMenu so a
// later swap to @react-native-menu/menu after a Dev Client build looks
// identical. Tightened for Radha's 2026-07-06 UAT feedback: menu now
// hugs the pill more closely (narrower + tighter gap) so it reads as
// a dropdown attached to the trigger, not a floating card.
const MENU_MIN_WIDTH = 200;
const MENU_MAX_HEIGHT = 320;
const MENU_ROW_HEIGHT = 40;
const MENU_GAP_BELOW_PILL = 4;
const MENU_PAD = 8; // all-around padding inside the menu card
const SCREEN_EDGE_INSET = 12;

interface SubcategoryPickerProps {
  /** Parent root of the sibling sub-cats. The picker offers "All
   *  Listings" + each sub. Pass even when the user is currently viewing
   *  a sub — the picker re-routes between siblings via the same parent
   *  root. */
  root: Category;
  /** Siblings under the same root. Empty disables the picker entirely
   *  (caller should not render it). */
  subs: Category[];
  /** Slug currently being viewed. Used to render the active row + the
   *  pill label. */
  currentSlug: string;
  /** Fired with the slug the user picked — caller routes via
   *  router.replace so the back-stack doesn't pile up siblings. */
  onSelect: (slug: string) => void;
}

interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Pill + anchored pull-down menu (iOS UIMenu / Android popup style).
 * Tap the pill, a rounded-rect menu drops down from the pill itself
 * with the options. Replaces the earlier bottom-sheet variant — feels
 * more native, doesn't take over the screen, doesn't compete with the
 * keyboard.
 *
 * Implementation is pure JS (no native module) so this works in stock
 * Expo Go without a Dev Client build, per the project's documented
 * iteration preference. Visual matches @react-native-menu/menu's
 * default style closely enough that a future swap to the native lib
 * (after a Dev Client build) is one component change with no UX
 * regression.
 *
 * Anchoring: `View.measure` reads the pill's on-screen page coords on
 * open; the Modal renders the menu as an absolutely positioned card at
 * those coords + the pill height + a small gap. Clamps to screen edges
 * so menus near the right side don't overflow.
 */
export function SubcategoryPicker({
  root,
  subs,
  currentSlug,
  onSelect,
}: SubcategoryPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [anchor, setAnchor] = React.useState<AnchorRect | null>(null);
  const pillRef = React.useRef<View | null>(null);

  const currentLabel = React.useMemo(() => {
    if (currentSlug === root.slug) return "All Listings";
    const sub = subs.find((s) => s.slug === currentSlug);
    return sub?.name ?? root.name;
  }, [currentSlug, root, subs]);

  function handleOpen() {
    // Measure the pill on the page to anchor the menu under it. We
    // intentionally measure on open (not on layout) so reading is
    // accurate even after orientation/scroll changes.
    pillRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }

  function handleSelect(slug: string) {
    setOpen(false);
    if (slug !== currentSlug) onSelect(slug);
  }

  // Compute menu geometry — width is max(pill width, MENU_MIN_WIDTH) so
  // the dropdown reads as tethered to the pill for compact triggers,
  // but grows for wider pills / longer labels. Center the menu
  // horizontally on the pill (pillCenter matches menuCenter) so the
  // dropdown reads as attached to the trigger; clamp to screen inset
  // if it would overflow either edge.
  const menuGeom = React.useMemo(() => {
    if (!anchor) return { left: 0, top: 0, width: MENU_MIN_WIDTH };
    const screenW = Dimensions.get("window").width;
    const width = Math.max(anchor.width, MENU_MIN_WIDTH);
    const pillCenter = anchor.x + anchor.width / 2;
    let left = pillCenter - width / 2;
    // Clamp to screen edges — left inset for short pills near screen
    // start, right inset for pills near screen end.
    if (left < SCREEN_EDGE_INSET) left = SCREEN_EDGE_INSET;
    if (left + width > screenW - SCREEN_EDGE_INSET) {
      left = screenW - width - SCREEN_EDGE_INSET;
    }
    return {
      left,
      top: anchor.y + anchor.height + MENU_GAP_BELOW_PILL,
      width,
    };
  }, [anchor]);

  const rows: { slug: string; label: string }[] = [
    { slug: root.slug, label: "All Listings" },
    ...subs.map((sub) => ({ slug: sub.slug, label: sub.name })),
  ];

  return (
    <>
      <Pressable
        ref={pillRef}
        accessibilityRole="button"
        accessibilityLabel={`Subcategory: ${currentLabel}. Tap to change.`}
        onPress={handleOpen}
        className="flex-row items-center self-start rounded-full border border-border bg-card px-3 py-1.5"
        style={{ gap: 4 }}
      >
        <Text className="text-xs font-semibold text-foreground">
          {currentLabel}
        </Text>
        <MaterialCommunityIcons
          name={open ? "chevron-up" : "chevron-down"}
          size={14}
          color={MUTED}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        {/* Transparent backdrop — tap anywhere outside the menu to
            dismiss. No dim layer; iOS UIMenu doesn't dim either. */}
        <Pressable
          accessibilityLabel="Dismiss subcategory menu"
          onPress={() => setOpen(false)}
          style={{ flex: 1 }}
        >
          <View
            style={{
              position: "absolute",
              left: menuGeom.left,
              top: menuGeom.top,
              width: menuGeom.width,
              maxHeight: MENU_MAX_HEIGHT,
              backgroundColor: "#FFFBF2",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(61,40,20,0.12)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.18,
              shadowRadius: 16,
              elevation: 8,
              overflow: "hidden",
            }}
          >
            <ScrollView
              bounces={false}
              contentContainerStyle={{ padding: MENU_PAD }}
            >
              {rows.map((row, idx) => (
                <MenuRow
                  key={row.slug}
                  label={row.label}
                  active={row.slug === currentSlug}
                  isLast={idx === rows.length - 1}
                  onPress={() => handleSelect(row.slug)}
                />
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

interface MenuRowProps {
  label: string;
  active: boolean;
  isLast: boolean;
  onPress: () => void;
}

function MenuRow({ label, active, isLast, onPress }: MenuRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: MENU_ROW_HEIGHT,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: isLast ? 0 : 4,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: active
          ? ACTIVE_ROW_BG
          : pressed
            ? "rgba(61,40,20,0.06)"
            : "transparent",
        borderWidth: active ? 1 : 0,
        borderColor: active ? ACTIVE_ROW_BORDER : "transparent",
      })}
    >
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 15,
          color: FOREGROUND,
          fontWeight: active ? "600" : "400",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
