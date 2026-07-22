"use client"

// Phone input with live per-country formatting via libphonenumber-js's
// AsYouType. Strips any non-digit / non-'+' character on the way in
// (so alphabets can't sneak into the DB) and re-formats the whole value
// after every keystroke, matching whichever country the number belongs
// to (detected from the leading + or defaultCountry). Numbers with no
// country context group as XXX-XXX-XXXX for the first 10 digits.
//
// Storage contract: the component's `value` prop is the FORMATTED
// string. If the caller needs pure digits (e.g. WhatsApp's wa.me/<digits>
// URL), strip non-digits at submit time.

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

export function PhoneInput({
  id,
  value,
  onChange,
  placeholder,
  defaultCountry = "IN",
}: PhoneInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Keep only digits and a leading + (the format detector uses the
    // + to switch to international mode). Anything else — alphabets,
    // stray punctuation, brackets, spaces — is dropped before it can
    // reach the formatter or the parent state.
    const cleaned = e.target.value.replace(/[^\d+]/g, "")
    // A `+` only counts as a country-code prefix at position 0. Any
    // interior + is noise.
    const normalized = cleaned.startsWith("+")
      ? "+" + cleaned.slice(1).replace(/\+/g, "")
      : cleaned.replace(/\+/g, "")
    const formatter = new AsYouType(defaultCountry)
    onChange(formatter.input(normalized))
  }

  return (
    <Input
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
    />
  )
}
