import * as React from "react";
import { Pressable, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useActionSheet } from "@expo/react-native-action-sheet";
import type { Category } from "@aira/validators";

// Mirrors packages/config/src/design.ts light theme mutedForeground. RN
// can't read CSS vars; kept inline until the theme/tokens.ts sync in
// TODOS lands. See the SubcategoryPicker parity fix note for context.
const MUTED = "#66503f";
// AIRA warm-brown foreground so the selected-row check reads consistently
// on the sheet (iOS honors `tintColor` on ActionSheetIOS; Android uses
// the JS renderer which respects textStyle).
const PRIMARY = "#496036";

interface SubcategoryPickerProps {
  /** Parent root of the sibling sub-cats. The sheet offers "All
   *  Listings" + each sub. Pass even when the user is currently
   *  viewing a sub — the sheet re-routes between siblings via the same
   *  parent root. */
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

/**
 * Pill trigger + native bottom action sheet. On iOS this calls into
 * `UIAlertController` .actionSheet via ActionSheetIOS (indistinguishable
 * from Instagram / Apple Photos / X). On Android the Expo package
 * renders a Material bottom sheet in JS. Works in Expo Go — no native
 * module install, no Dev Client build.
 *
 * Replaced a ~250-line custom Modal + anchor-math implementation that
 * was reimplementing UIMenu in JavaScript. The action-sheet UX is the
 * standard "pick one of a few" pattern on both platforms and doesn't
 * fight the keyboard or screen edges. Radha's 2026-07-06 UAT feedback.
 */
export function SubcategoryPicker({
  root,
  subs,
  currentSlug,
  onSelect,
}: SubcategoryPickerProps) {
  const { showActionSheetWithOptions } = useActionSheet();

  const currentLabel = React.useMemo(() => {
    if (currentSlug === root.slug) return "All Listings";
    const sub = subs.find((s) => s.slug === currentSlug);
    return sub?.name ?? root.name;
  }, [currentSlug, root, subs]);

  function handleOpen() {
    const rows: { slug: string; label: string }[] = [
      { slug: root.slug, label: "All Listings" },
      ...subs.map((sub) => ({ slug: sub.slug, label: sub.name })),
    ];
    const options = [...rows.map((r) => r.label), "Cancel"];
    const cancelButtonIndex = options.length - 1;

    // Leave all rows tappable (Instagram / X pattern) — the pill
    // already shows the current selection, so extra in-sheet indication
    // is redundant. If the user taps the current row we no-op below.
    showActionSheetWithOptions(
      {
        // Category name alone — action sheet titles render bold by
        // system convention on both iOS (UIAlertController) and
        // Android (JS renderer), so the name reads as the sheet's
        // header without needing a "Browse" verb.
        title: root.name,
        options,
        cancelButtonIndex,
        tintColor: PRIMARY,
        userInterfaceStyle: "light",
      },
      (idx) => {
        if (idx === undefined || idx === cancelButtonIndex) return;
        const picked = rows[idx];
        if (picked && picked.slug !== currentSlug) onSelect(picked.slug);
      },
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Subcategory: ${currentLabel}. Tap to change.`}
      onPress={handleOpen}
      className="flex-row items-center self-start rounded-full border border-border bg-card px-3 py-1.5"
      style={{ gap: 4 }}
    >
      <Text className="text-xs font-semibold text-foreground">
        {currentLabel}
      </Text>
      <MaterialCommunityIcons name="chevron-down" size={14} color={MUTED} />
    </Pressable>
  );
}
