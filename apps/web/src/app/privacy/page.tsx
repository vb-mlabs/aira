// /privacy is retained as a permanent redirect to keep any external
// links, search-engine results, and older marketing collateral live.
// The single source of truth is /legal (see apps/web/src/app/legal/page.tsx).
// Delete this route once analytics show no meaningful referrals.

import { permanentRedirect } from "next/navigation"

export default function PrivacyRedirect() {
  permanentRedirect("/legal#privacy")
}
