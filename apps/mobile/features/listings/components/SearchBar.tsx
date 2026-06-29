import * as React from "react";
import { TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface SearchBarProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

const DEBOUNCE_MS = 300;

/** Debounced text input. The parent owns the debounced value (state lifted
 *  out so a re-render of the listings list doesn't lose the in-progress
 *  keystrokes). Internal state holds the raw input; we flush to onChange
 *  on a 300ms quiet period. */
export function SearchBar({
  value,
  onChange,
  placeholder = "Search businesses, cuisines, services…",
}: SearchBarProps) {
  const [raw, setRaw] = React.useState(value);

  // Sync external resets (e.g. category change) back into the input.
  React.useEffect(() => {
    setRaw(value);
  }, [value]);

  React.useEffect(() => {
    if (raw === value) return;
    const t = setTimeout(() => onChange(raw), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [raw, value, onChange]);

  return (
    <View
      className="flex-row items-center rounded-full border border-border bg-card px-3 py-2"
      style={{ gap: 8 }}
    >
      <MaterialCommunityIcons name="magnify" size={18} color="#735239" />
      <TextInput
        value={raw}
        onChangeText={setRaw}
        placeholder={placeholder}
        placeholderTextColor="#73523980"
        accessibilityLabel="Search businesses"
        className="flex-1 text-sm text-foreground"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
    </View>
  );
}
