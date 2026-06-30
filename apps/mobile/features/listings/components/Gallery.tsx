import * as React from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import type { BusinessImage } from "@aira/validators";

interface GalleryProps {
  images: BusinessImage[];
}

const AUTO_INTERVAL_MS = 3500;
const IMAGE_HEIGHT = 224; // matches web's h-56
const DOT_SIZE = 8;
const DOT_GAP = 6;
const DOT_ACTIVE_HEX = "#3D2814"; // foreground (dark brown)
const DOT_INACTIVE_HEX = "rgba(102,80,63,0.4)"; // mutedForeground at 40%
const PLACEHOLDER_BG = "#E2D5BC";

/**
 * Full-width auto-advancing business image carousel. Mirrors web's
 * BusinessImageCarousel (apps/web/src/features/listings/components/business-image-carousel.tsx):
 *
 * - Horizontal FlatList with pagingEnabled snaps between full-width
 *   images sized to the screen width × IMAGE_HEIGHT.
 * - Auto-advances every 3500ms when images.length > 1, calling
 *   flatListRef.scrollToIndex with the next wrapped index.
 * - Pauses auto-advance while the user drags (onScrollBeginDrag);
 *   resumes on drag end (onScrollEndDrag). Same touch behaviour as
 *   web's mouseenter/mouseleave + touchstart/touchend.
 * - Dot indicators below the carousel (only when images.length > 1).
 *   Each dot is a Pressable that calls scrollToIndex(i). Active dot
 *   uses the foreground color + 110% scale; inactive uses the
 *   mutedForeground color at 40% alpha.
 * - Single-image case renders a static full-width image, no dots,
 *   no auto-advance.
 * - Empty array returns null so an empty gallery doesn't render a
 *   blank band.
 *
 * Interval is stored in a ref + cleared in the effect cleanup so an
 * unmount during scroll never triggers a scrollToIndex on a disposed
 * FlatList. getItemLayout is set so scrollToIndex doesn't throw
 * "scrollToIndex out of range" during the initial layout pass — the
 * fixed item width makes layout deterministic without measuring.
 */
export function Gallery({ images }: GalleryProps) {
  const flatListRef = React.useRef<FlatList<BusinessImage>>(null);
  const isPausedRef = React.useRef(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const screenWidth = Dimensions.get("window").width;

  // Defensive sort — service already orders by sort_order but the
  // wire shape allows any order.
  const sorted = React.useMemo(
    () => [...(images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [images],
  );

  React.useEffect(() => {
    if (sorted.length <= 1) return;
    const id = setInterval(() => {
      if (isPausedRef.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % sorted.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [sorted.length]);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const offsetX = e.nativeEvent.contentOffset.x;
    const next = Math.round(offsetX / screenWidth);
    setActiveIndex(next);
  }

  function jumpTo(index: number) {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  }

  if (sorted.length === 0) return null;

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={sorted}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => {
          isPausedRef.current = true;
        }}
        onScrollEndDrag={() => {
          isPausedRef.current = false;
        }}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_data, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.url }}
            style={{
              width: screenWidth,
              height: IMAGE_HEIGHT,
              backgroundColor: PLACEHOLDER_BG,
            }}
            resizeMode="cover"
            accessibilityLabel="Gallery image"
          />
        )}
      />
      {sorted.length > 1 ? (
        <View
          className="flex-row items-center justify-center"
          style={{ gap: DOT_GAP, paddingVertical: 12 }}
        >
          {sorted.map((img, i) => {
            const active = i === activeIndex;
            return (
              <Pressable
                key={img.id}
                accessibilityRole="button"
                accessibilityLabel={`Go to image ${i + 1} of ${sorted.length}`}
                accessibilityState={{ selected: active }}
                onPress={() => jumpTo(i)}
                hitSlop={8}
                style={{
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  borderRadius: DOT_SIZE / 2,
                  backgroundColor: active
                    ? DOT_ACTIVE_HEX
                    : DOT_INACTIVE_HEX,
                  transform: [{ scale: active ? 1.1 : 1 }],
                }}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
