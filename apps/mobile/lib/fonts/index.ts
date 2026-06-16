import { useFonts } from "expo-font"
import { Lato_400Regular, Lato_700Bold } from "@expo-google-fonts/lato"
import {
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from "@expo-google-fonts/cormorant-garamond"

export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    "Lato-Regular": Lato_400Regular,
    "Lato-Bold": Lato_700Bold,
    "CormorantGaramond-SemiBold": CormorantGaramond_600SemiBold,
    "CormorantGaramond-Bold": CormorantGaramond_700Bold,
  })
  return loaded
}
