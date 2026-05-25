/**
 * Font loader — AIRA pairing: Lato (sans, body + UI) + Cormorant Garamond
 * (display, headings + wordmark). Both Google Fonts; both available via
 * @expo-google-fonts/* on Expo.
 *
 * The stubbed implementation returns `true` immediately so the splash doesn't
 * block. To enable real native font loading on mobile:
 *
 *   1. pnpm add @expo-google-fonts/lato @expo-google-fonts/cormorant-garamond expo-font
 *   2. Replace the body of this hook with:
 *
 *      import { useFonts } from "expo-font";
 *      import {
 *        Lato_400Regular,
 *        Lato_700Bold,
 *      } from "@expo-google-fonts/lato";
 *      import {
 *        CormorantGaramond_600SemiBold,
 *        CormorantGaramond_700Bold,
 *      } from "@expo-google-fonts/cormorant-garamond";
 *
 *      export function useAppFonts() {
 *        const [loaded] = useFonts({
 *          "Lato-Regular": Lato_400Regular,
 *          "Lato-Bold": Lato_700Bold,
 *          "CormorantGaramond-SemiBold": CormorantGaramond_600SemiBold,
 *          "CormorantGaramond-Bold": CormorantGaramond_700Bold,
 *        });
 *        return loaded;
 *      }
 *
 *  Then update the fontFamily mapping in scripts/gen-mobile-tailwind.ts
 *  (sans → "Lato", display → "CormorantGaramond") and regenerate the
 *  mobile tailwind config with `pnpm gen:mobile-tw`.
 */
export function useAppFonts(): boolean {
  return true;
}
