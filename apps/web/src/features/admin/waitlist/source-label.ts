// Human label for the waitlist.source enum. The raw values are
// internal capture-point identifiers; this map keeps the table column
// human-readable. Kept in its own file so the consumer + business
// tables share one source of truth.

import type { WaitlistSource } from "@aira/validators"

export const SOURCE_LABEL: Record<WaitlistSource, string> = {
  "marketing-hero": "Hero form",
  "marketing-footer": "Footer form",
  "business-mailto": "Mailto link",
  "business-listing-cta": "Listing CTA",
}
