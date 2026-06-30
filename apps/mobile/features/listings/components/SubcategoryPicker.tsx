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
const ACCENT = "#4F653B";

// Visual constants for the anchored menu — matched to iOS UIMenu so a
// later swap to @react-native-menu/menu after a Dev Client build looks
// identical. Width is a comfortable read for short labels; tall lists
// scroll internally.
const MENU_WIDTH = 240;
const MENU_MAX_HEIGHT = 320;
const MENU_ROW_HEIGHT = 44;
const MENU_GAP_BELOW_PILL = 6;
const SCREEN_EDGE_INSET = 12;

interface SubcategoryPickerProps {
  /** Parent root of the sibling sub-cats. The picker offers "All <root>"
   *  + each sub. Pass even when the user is currently viewing a sub —
   *  the picker re-routes between siblings via the same parent root. */
  root: Category;
  /** Siblings under the same root. Empty disables the picker entirely
   *  (caller should not render it). */
  subs: Category[];
  /** Slug currently being viewed. Used to render the active row + the
   *  pill label. */
  currentSlug: string;
  /** Per-slug visible-business count, sourced from useCategories(). */
  counts: Record<string, number>;
  /** Fired with the slug the user picked — caller routes via
   *  router.replace so the back-stack doesn't pile up siblings. */
  onSelect: (slug: string) => void;
}

interface AnchorRect {
  x: number;
  y: number;
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
  counts,
  onSelect,
}: SubcategoryPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [anchor, setAnchor] = React.useState<AnchorRect | null>(null);
  const pillRef = React.useRef<View | null>(null);

  const currentLabel = React.useMemo(() => {
    if (currentSlug === root.slug) return `All ${root.name}`;
    const sub = subs.find((s) => s.slug === currentSlug);
    return sub?.name ?? root.name;
  }, [currentSlug, root, subs]);

  function handleOpen() {
    // Measure the pill on the page to anchor the menu under it. We
    // intentionally measure on open (not on layout) so reading is
    // accurate even after orientation/scroll changes.
    pillRef.current?.measureInWindow((x, y, _width, height) => {
      setAnchor({ x, y, height });
      setOpen(true);
    });
  }

  function handleSelect(slug: string) {
    setOpen(false);
    if (slug !== currentSlug) onSelect(slug);
  }

  // Compute menu position clamped to the screen. Anchor to the LEFT
  // edge of the pill by default; if that would overflow the right edge,
  // anchor to the right edge of the pill instead.
  const menuPos = React.useMemo(() => {
    if (!anchor) return { left: 0, top: 0 };
    const screenW = Dimensions.get("window").width;
    let left = anchor.x;
    if (left + MENU_WIDTH > screenW - SCREEN_EDGE_INSET) {
      left = Math.max(SCREEN_EDGE_INSET, screenW - MENU_WIDTH - SCREEN_EDGE_INSET);
    }
    return {
      left,
      top: anchor.y + anchor.height + MENU_GAP_BELOW_PILL,
    };
  }, [anchor]);

  const rows: { slug: string; label: string }[] = [
    { slug: root.slug, label: `All ${root.name}` },
    ...subs.map((sub) => ({ slug: sub.slug, label: sub.name })),
  ];

  return (
    <>
      <Pressable
        ref={pillRef}
        accessibilityRole="button"
        accessibilityLabel={`Subcategory: ${currentLabel}. Tap to change.`}
        onPress={handleOpen}
        className="flex-row items-center self-start rounded-full border border-border bg-card px-3"
        style={{ minHeight: 36, gap: 6 }}
      >
        <Text className="text-sm font-semibold text-foreground">
          {currentLabel}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={MUTED} />
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
              left: menuPos.left,
              top: menuPos.top,
              width: MENU_WIDTH,
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
            <ScrollView bounces={false}>
              {rows.map((row, idx) => (
                <MenuRow
                  key={row.slug}
                  label={row.label}
                  count={counts[row.slug]}
                  active={row.slug === currentSlug}
                  showDivider={idx < rows.length - 1}
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
  count?: number;
  active: boolean;
  showDivider: boolean;
  onPress: () => void;
}

function MenuRow({
  label,
  count,
  active,
  showDivider,
  onPress,
}: MenuRowProps) {
  const countLabel = typeof count === "number" ? String(count) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        countLabel ? `${label}, ${countLabel} listed` : label
      }
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: MENU_ROW_HEIGHT,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: pressed ? "rgba(61,40,20,0.06)" : "transparent",
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: "rgba(61,40,20,0.08)",
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
      {countLabel ? (
        <Text style={{ fontSize: 13, color: MUTED, fontWeight: "600" }}>
          {countLabel}
        </Text>
      ) : null}
      {active ? (
        <MaterialCommunityIcons name="check" size={18} color={ACCENT} />
      ) : (
        <View style={{ width: 18 }} />
      )}
    </Pressable>
  );
}
