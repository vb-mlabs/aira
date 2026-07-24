// WhatsApp number normalization for the admin business forms.
//
// Storefront builds wa.me/<digits> links from `business.whatsapp_number`
// (see apps/web/src/features/listings/components/social-icons.tsx).
// wa.me requires the digits to include the country code, otherwise
// WhatsApp interprets the leading digit as the country prefix and
// routes to the wrong country (e.g. `wa.me/4045551234` → country
// code 4 = Romania, wrong number).
//
// The admin forms accept 10 US digits (XXX-XXX-XXXX). This helper
// strips non-digits and prepends "1" (US country code) before storage,
// so the admin's field says "404-555-1234" but the DB row holds
// "14045551234" and the storefront link resolves correctly.

const US_COUNTRY_CODE = "1"

/** Convert an admin-typed WhatsApp number (any format the PhoneInput
 *  might display: "4045551234", "404-555-1234", "(404) 555-1234", or
 *  even a legacy pre-cleanup value) to a wa.me-safe digit string with
 *  the US country code prepended. Returns null when the input is empty
 *  or has zero digits — matches the storefront's truthiness guard
 *  which skips rendering the WhatsApp icon for null values. */
export function toWhatsappE164(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 0) return null
  // Already prefixed with the US country code — leave it alone. Covers
  // three cases: legacy rows saved before this normalization landed,
  // rows the admin re-saved without editing the field (value round-
  // tripped through the form), and any manual paste like "14045551234".
  if (digits.length === 11 && digits.startsWith(US_COUNTRY_CODE)) {
    return digits
  }
  return US_COUNTRY_CODE + digits
}

/** Reverse of toWhatsappE164 — turn a stored `14045551234` back into
 *  the 10-digit `4045551234` the admin form displays. Any other stored
 *  shape (empty, non-US-prefixed) round-trips as its digit content so
 *  the field never blanks out unexpectedly. */
export function fromWhatsappE164(stored: string | null | undefined): string {
  if (!stored) return ""
  const digits = stored.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith(US_COUNTRY_CODE)) {
    return digits.slice(1)
  }
  return digits
}
