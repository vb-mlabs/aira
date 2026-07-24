// US phone number formatting for the mobile app. Mirror of
// apps/web/src/lib/format-phone.ts — kept in lockstep on purpose so
// the storefront + admin (web) and listing detail (mobile) display
// the same number the same way. If either surface's rule changes,
// change both.
//
// Rule: strip everything that isn't a digit, take the last 10 digits
// (so legacy "+91 141 2345 6789" or "+1 404 555 1234" or leading-1
// entries all collapse to the 10-digit US portion), then insert dashes
// at positions 3 and 6 → XXX-XXX-XXXX.
//
// Idempotent: formatUSPhone("404-555-1234") === "404-555-1234".

const MAX_DIGITS = 10;

export function formatUSPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const allDigits = raw.replace(/\D/g, "");
  const digits =
    allDigits.length > MAX_DIGITS ? allDigits.slice(-MAX_DIGITS) : allDigits;
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Display variant — prepends "+1 " when the full 10 digits are
 *  present. Used by every read-only surface (listing detail contact
 *  card, business card, anywhere phone/whatsapp is shown as text).
 *  Partial input (< 10 digits) skips the prefix so a mid-composition
 *  render never has a lonely "+1" artifact. */
export function formatUSPhoneWithCode(
  raw: string | null | undefined,
): string {
  const local = formatUSPhone(raw);
  const digitCount = local.replace(/\D/g, "").length;
  return digitCount === MAX_DIGITS ? `+1 ${local}` : local;
}

/** Canonical E.164 form for `href="tel:…"`. Dialers uniformly accept
 *  the fully-qualified `+14045551234` shape; the raw stored value
 *  (which may be `"404-555-1234"` post-form or `"+91 …"` legacy) can
 *  route ambiguously without a country prefix. Returns empty on 0
 *  digits so `tel:` never dispatches a naked scheme. */
export function formatUSPhoneTel(raw: string | null | undefined): string {
  if (!raw) return "";
  const allDigits = raw.replace(/\D/g, "");
  const digits =
    allDigits.length > MAX_DIGITS ? allDigits.slice(-MAX_DIGITS) : allDigits;
  if (digits.length === 0) return "";
  return `+1${digits}`;
}

/** Bare-digits form (leading `1` = US country code, no `+`) for
 *  wa.me/<digits>. WhatsApp's deep link REQUIRES the country code —
 *  `wa.me/4045551234` routes to Romania (country code 4). Returns
 *  empty on 0 digits. */
export function formatWhatsappDigits(
  raw: string | null | undefined,
): string {
  const tel = formatUSPhoneTel(raw);
  return tel.startsWith("+") ? tel.slice(1) : tel;
}
