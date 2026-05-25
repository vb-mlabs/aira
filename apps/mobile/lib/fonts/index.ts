/**
 * Font loader — Geist via expo-font for web parity (Pass-4 design spec).
 *
 * Forks ship the Geist binaries in `mobile/assets/fonts/`. To keep the
 * scaffold lean, the binaries are NOT in the template; if they're absent
 * the loader returns `true` immediately so we don't block the splash forever.
 *
 * To enable Geist:
 *   1. Drop Geist-Regular.ttf + GeistMono-Regular.ttf into mobile/assets/fonts/
 *   2. Replace the body of this hook with:
 *
 *      import { useFonts } from "expo-font";
 *      export function useAppFonts() {
 *        const [loaded] = useFonts({
 *          Geist: require("../../assets/fonts/Geist-Regular.ttf"),
 *          GeistMono: require("../../assets/fonts/GeistMono-Regular.ttf"),
 *        });
 *        return loaded;
 *      }
 */
export function useAppFonts(): boolean {
  return true;
}
