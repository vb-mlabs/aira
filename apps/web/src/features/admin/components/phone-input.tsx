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
// Cursor preservation: formatting inserts dashes at positions 3 and 6,
// which shifts every digit right of the caret. Without intervention,
// React's controlled-input reset drops the caret to the end of the
// string every keystroke — the user sees the field "shift left" as
// their typing appears to jump to the end. handleChange records how
// many digits precede the caret in the RAW pre-format string, then
// on the next paint restores the caret to the position that follows
// the same number of digits in the FORMATTED string. Backspace,
// mid-string edits, and paste all round-trip cleanly.
//
// Storage contract: the parent's `value` state is the formatted string
// ("404-555-1234"). Callers that need pure digits (e.g. WhatsApp's
// wa.me/<digits> URL, which requires the +1 country code) strip
// non-digits at submit time — the caller decides whether to prepend "1".

import { Input } from "@aira/ui-web/input"
import { formatUSPhone } from "@/lib/format-phone"

const MAX_DIGITS = 10

interface PhoneInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/** Find the position in `formatted` that sits after `digitCount` digits.
 *  Used to place the caret at the "same logical spot" (measured in
 *  digits, not chars) after a reformat. */
function caretAfterNDigits(formatted: string, digitCount: number): number {
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]!)) {
      seen++
      if (seen === digitCount) return i + 1
    }
  }
  return formatted.length
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
    const el = e.target
    const rawValue = el.value
    const rawCaret = el.selectionStart ?? rawValue.length
    const rawDigitCount = rawValue.replace(/\D/g, "").length
    const currentDigitCount = displayValue.replace(/\D/g, "").length

    // Cap enforcement: if the field already has 10 digits and the user
    // tried to add more, reject the input entirely. Without this, the
    // formatter's tail-slice (needed for normalizing legacy DB rows
    // like "+91 …") would silently drop the leading digit — so typing
    // "1" after "385-489-9966" would produce "854-899-9661" and the
    // "3" would appear to vanish. React won't re-render when we pass
    // the same value, so we sync the DOM manually to undo the keypress.
    if (
      currentDigitCount >= MAX_DIGITS &&
      rawDigitCount > currentDigitCount
    ) {
      el.value = displayValue
      const restorePos = Math.max(0, rawCaret - (rawValue.length - displayValue.length))
      el.setSelectionRange(restorePos, restorePos)
      return
    }

    // How many digits precede the caret in what the user just typed?
    // This is what we anchor to across the reformat.
    const digitsBeforeCaret = rawValue.slice(0, rawCaret).replace(/\D/g, "")
      .length
    const formatted = formatUSPhone(rawValue)
    onChange(formatted)
    // React re-renders synchronously; the DOM value updates on commit.
    // requestAnimationFrame runs after that commit, giving us a moment
    // when el.value === formatted and we can set selection to the new
    // position. If the input has lost focus between now and then
    // (unlikely mid-type, defensive anyway), skip — an out-of-focus
    // setSelectionRange steals focus back on some browsers.
    requestAnimationFrame(() => {
      if (document.activeElement !== el) return
      const pos = caretAfterNDigits(formatted, digitsBeforeCaret)
      el.setSelectionRange(pos, pos)
    })
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
