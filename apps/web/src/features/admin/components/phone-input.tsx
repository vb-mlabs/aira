"use client"

// Strict US phone input — numeric only, capped at 10 digits, live-formatted
// as XXX-XXX-XXXX. Any non-digit is stripped on the way in (alphabets,
// leading `+`, parentheses, spaces) so the DB never sees garbage. The
// display value is always re-derived from `value` via the same formatter,
// so:
//   - Pre-existing DB rows (raw digits, half-formatted strings, older
//     international entries) get normalized on mount, not just on typing.
//   - Formatting is idempotent — feeding an already-formatted string back
//     yields the same string, so React's controlled-input contract stays
//     stable.
//
// Storage contract: the parent's `value` state is the formatted string
// ("404-555-1234"). Callers that need pure digits (e.g. WhatsApp's
// wa.me/<digits> URL, which requires the +1 country code) strip
// non-digits at submit time — the caller decides whether to prepend "1".

import { Input } from "@aira/ui-web/input"
import { formatUSPhone } from "@/lib/format-phone"

interface PhoneInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function PhoneInput({
  id,
  value,
  onChange,
  placeholder,
}: PhoneInputProps) {
  // Derive the displayed value from `value` on every render — idempotent,
  // so already-formatted values pass through unchanged and stale DB
  // values (legacy Indian entries, +1-prefixed numbers, raw digits) get
  // reformatted on mount. formatUSPhone lives in @/lib/format-phone so
  // the storefront's read-side display uses the exact same rule.
  const displayValue = formatUSPhone(value)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(formatUSPhone(e.target.value))
  }

  return (
    <Input
      id={id}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
    />
  )
}
