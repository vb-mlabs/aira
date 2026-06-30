import * as React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Category } from "@aira/validators";

const MUTED = "#66503f";
const FOREGROUND = "#3D2814";
const ACCENT = "#4F653B";

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

/**
 * Pill + bottom sheet that lets users switch between a root and its
 * sub-categories without leaving the listings screen. Replaces the
 * earlier /categories/[root] drill-down sub-page.
 *
 * Behavior:
 *   - Pill at top of screen shows the current cat's name + chevron-down.
 *   - Tap → opens a sliding bottom sheet with "All <RootName>" + each
 *     sub-cat row, counts on the right, current row highlighted.
 *   - Tap a row → onSelect(slug) and the sheet closes.
 *   - Sheet dismisses on backdrop tap, Android back button, or row tap.
 *
 * No new deps — uses the platform `<Modal>` with a fade-in backdrop and
 * a slide-up animation. Wide enough for the longest sub-cat name plus
 * the count; scrollable if the list overflows the screen.
 */
export function SubcategoryPicker({
  root,
  subs,
  currentSlug,
  counts,
  onSelect,
}: SubcategoryPickerProps) {
  const [open, setOpen] = React.useState(false);

  const currentLabel = React.useMemo(() => {
    if (currentSlug === root.slug) return `All ${root.name}`;
    const sub = subs.find((s) => s.slug === currentSlug);
    return sub?.name ?? root.name;
  }, [currentSlug, root, subs]);

  function handleSelect(slug: string) {
    setOpen(false);
    if (slug !== currentSlug) onSelect(slug);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Subcategory: ${currentLabel}. Tap to change.`}
        onPress={() => setOpen(true)}
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
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityLabel="Dismiss subcategory picker"
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        >
          {/* Sheet body — inner Pressable swallows the tap so picking
              a row doesn't close-then-fire the backdrop dismiss. */}
          <Pressable onPress={(e) => e.stopPropagation()} style={{ marginTop: "auto" }}>
            <View
              style={{
                backgroundColor: "#FFFBF2",
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingBottom: 32,
                maxHeight: "70%",
              }}
            >
              {/* Drag grabber */}
              <View className="items-center pt-2 pb-1">
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "rgba(61,40,20,0.25)",
                  }}
                />
              </View>
              <Text
                className="px-5 pt-2 pb-1 text-base font-semibold"
                style={{ color: FOREGROUND }}
              >
                Filter by subcategory
              </Text>
              <ScrollView>
                <PickerRow
                  label={`All ${root.name}`}
                  count={counts[root.slug]}
                  active={currentSlug === root.slug}
                  onPress={() => handleSelect(root.slug)}
                />
                {subs.map((sub) => (
                  <PickerRow
                    key={sub.id}
                    label={sub.name}
                    count={counts[sub.slug]}
                    active={currentSlug === sub.slug}
                    onPress={() => handleSelect(sub.slug)}
                  />
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

interface PickerRowProps {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
}

function PickerRow({ label, count, active, onPress }: PickerRowProps) {
  const countLabel = typeof count === "number" ? String(count) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        countLabel ? `${label}, ${countLabel} listed` : label
      }
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className="flex-row items-center border-b border-border px-5"
      style={{ minHeight: 52, gap: 12 }}
    >
      <Text
        className="flex-1 text-base"
        style={{
          color: FOREGROUND,
          fontWeight: active ? "600" : "400",
        }}
      >
        {label}
      </Text>
      {countLabel ? (
        <Text className="text-sm font-semibold" style={{ color: MUTED }}>
          {countLabel}
        </Text>
      ) : null}
      {active ? (
        <MaterialCommunityIcons name="check" size={20} color={ACCENT} />
      ) : null}
    </Pressable>
  );
}
