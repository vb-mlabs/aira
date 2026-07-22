"use client"

// Phone input with live per-country formatting via libphonenumber-js's
// AsYouType. Strips any non-digit / non-'+' character on the way in
// (so alphabets can't sneak into the DB) and re-formats the whole value
// after every keystroke, matching whichever country the number belongs
// to (detected from the leading + or defaultCountry).
//
// The DISPLAY value is always re-derived from `value` via the same
// formatter, so:
//   - Pre-existing DB data (raw digits or half-formatted strings) gets
//     reformatted on mount, not just on user input.
//   - Formatting is idempotent — feeding an already-formatted string
//     back through the formatter yields the same string, so React's
//     controlled-input contract stays stable.
//
// Storage contract: the parent's `value` state is the FORMATTED string.
// If the caller needs pure digits (e.g. WhatsApp's wa.me/<digits> URL),
// strip non-digits at submit time.

import { AsYouType, type CountryCode } from "libphonenumber-js"
import { Input } from "@aira/ui-web/input"

interface PhoneInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /**
   * ISO-3166 country code used when the user hasn't typed a leading `+`.
   * The app's brand context is Indian so "IN" is the sensible default;
   * override at the call site if a specific form needs otherwise.
   */
  defaultCountry?: CountryCode
}

/**
 * 12-digit cap sized to the two countries this admin actually serves:
 * US (+1 + 10-digit subscriber = 11) and India (+91 + 10-digit
 * subscriber = 12). E.164's absolute max is 15 but the extra headroom
 * is only used by outlier German / Chinese landlines with extensions
 * — irrelevant here, and letting the field accept longer numbers just
 * hides typo entries that would never be dialable anyway.
 */
const MAX_DIGITS = 12

function formatPhone(raw: string, country: CountryCode): string {
  // Keep only digits and a leading + (the format detector uses the +
  // to switch to international mode). Anything else — alphabets, stray
  // punctuation, brackets, spaces — is dropped.
  const cleaned = raw.replace(/[^\d+]/g, "")
  // A `+` only counts as a country-code prefix at position 0. Any
  // interior + is noise.
  const withPlus = cleaned.startsWith("+")
  const digits = (withPlus ? cleaned.slice(1) : cleaned)
    .replace(/\+/g, "")
    .slice(0, MAX_DIGITS)
  const normalized = withPlus ? "+" + digits : digits
  return new AsYouType(country).input(normalized)
}

export function PhoneInput({
  id,
  value,
  onChange,
  placeholder,
  defaultCountry = "IN",
}: PhoneInputProps) {
  // Derive the displayed value by feeding `value` through the same
  // formatter used on input — idempotent, so already-formatted values
  // pass through unchanged and stale DB values get reformatted on mount.
  const displayValue = formatPhone(value, defaultCountry)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(formatPhone(e.target.value, defaultCountry))
  }

  return (
    <Input
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
    />
  )
}
