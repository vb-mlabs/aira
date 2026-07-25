import * as React from "react";
import { Input, type InputProps } from "./Input";
import { formatUSPhone } from "../../lib/format-phone";

// Strict US phone input for React Native — numeric-only, capped at 10
// digits, live-formatted as XXX-XXX-XXXX. Wraps the shared <Input>
// primitive so labels / hints / errors / focus styling all match the
// rest of the composer, and locks the props it needs to own
// (keyboardType, maxLength, onChangeText, value) via Omit so callers
// can't inadvertently override them.
//
// Mirror of the web admin PhoneInput at
// apps/web/src/features/admin/components/phone-input.tsx — same rule,
// same UX. Callers store the FORMATTED string ("404-555-1234") as
// their state value; if they need pure digits at submit, strip via
// `.replace(/\D/g, "")` at that point (the mobile listing detail's
// wa.me link does exactly this via formatWhatsappDigits).
//
// Cap enforcement: React Native's TextInput doesn't offer an
// "onKeyDown → preventDefault" seam like the web platform, but a
// controlled input with the value prop pinned to the formatted state
// achieves the same effect — attempting an 11th digit produces a
// change event whose head-sliced digits collapse back to the same 10
// we already had, so onChangeText fires with the identical value and
// React reconciles the native text back to XXX-XXX-XXXX.

const MAX_DIGITS = 10;
// XXX-XXX-XXXX = 10 digits + 2 dashes. Native TextInput's maxLength
// gives a second belt on top of the JS cap; without it, IME
// auto-suggest could try to paste longer strings.
const FORMATTED_MAX = 12;

interface PhoneInputProps
  extends Omit<
    InputProps,
    "keyboardType" | "value" | "onChangeText" | "maxLength"
  > {
  value: string;
  onChangeText: (formatted: string) => void;
}

export function PhoneInput({
  value,
  onChangeText,
  ...rest
}: PhoneInputProps) {
  // Derive display from the current value on every render — same trick
  // the web PhoneInput uses. Idempotent so already-formatted values
  // pass through unchanged, and legacy raw/prefixed stored numbers
  // ("4045551234", "+14045551234") normalize on mount without an
  // effect.
  const displayValue = formatUSPhone(value);

  const handleChangeText = React.useCallback(
    (raw: string) => {
      // Head-slice: keep the FIRST 10 digits the user typed, drop
      // anything past that. Different from the formatUSPhone helper's
      // tail-slice (used to normalize legacy +91/+1-prefixed rows on
      // render) — for typed input we want the earliest digits preserved
      // so a cap-hit doesn't shift the visible number left.
      const digits = raw.replace(/\D/g, "").slice(0, MAX_DIGITS);
      onChangeText(formatUSPhone(digits));
    },
    [onChangeText],
  );

  return (
    <Input
      {...rest}
      value={displayValue}
      onChangeText={handleChangeText}
      keyboardType="phone-pad"
      maxLength={FORMATTED_MAX}
      autoComplete="tel"
    />
  );
}
