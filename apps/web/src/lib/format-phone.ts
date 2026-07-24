// US phone number formatting. Shared between the admin PhoneInput
// (features/admin/components/phone-input.tsx) which formats on the way
// IN and the storefront business detail (features/listings/components/
// business-detail.tsx) which formats on the way OUT.
//
// Rule: strip everything that isn't a digit, take the last 10 digits
// (so legacy "+91 141 2345 6789" or "+1 404 555 1234" or leading-1
// entries all collapse to the 10-digit US portion), then insert dashes
// at positions 3 and 6 → XXX-XXX-XXXX. Partial input round-trips too:
// 5 digits → "404-55", 3 → "404", 0 → "".
//
// Idempotent: formatUSPhone("404-555-1234") === "404-555-1234".

const MAX_DIGITS = 10

export function formatUSPhone(raw: string | null | undefined): string {
  if (!raw) return ""
  // Take the LAST 10 digits — legacy rows may hold "+1 404 555 1234"
  // (11 digits: leading 1 = US country code) or "+91 …" (12+ digits:
  // Indian entries from before the US-only scope narrowing). Slicing
  // from the right gives the subscriber number in both cases.
  const allDigits = raw.replace(/\D/g, "")
  const digits =
    allDigits.length > MAX_DIGITS
      ? allDigits.slice(-MAX_DIGITS)
      : allDigits
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

/** Display variant — same 10-digit slicing but prefixes "+1 " when a
 *  full number is present. Used by every read-only surface (storefront
 *  business detail, admin business detail, anywhere phone/whatsapp is
 *  shown as text). Partial input (< 10 digits) skips the prefix so the
 *  caller can still render mid-type without a lonely "+1" artifact. */
export function formatUSPhoneWithCode(
  raw: string | null | undefined,
): string {
  const local = formatUSPhone(raw)
  const digitCount = local.replace(/\D/g, "").length
  return digitCount === MAX_DIGITS ? `+1 ${local}` : local
}

/** Canonical E.164 form for `href="tel:…"`. Dialers uniformly accept
 *  the fully-qualified `+14045551234` shape; the raw stored value
 *  (which may be `"404-555-1234"` post-form or `"+91 …"` legacy) can
 *  route ambiguously without a country prefix. Returns empty on 0
 *  digits so `<a href="tel:">` never emits a naked scheme. */
export function formatUSPhoneTel(raw: string | null | undefined): string {
  if (!raw) return ""
  const allDigits = raw.replace(/\D/g, "")
  const digits =
    allDigits.length > MAX_DIGITS
      ? allDigits.slice(-MAX_DIGITS)
      : allDigits
  if (digits.length === 0) return ""
  return `+1${digits}`
}
