// Transitional shim — binds @mlabs/db/audit's createAudit factory to the
// app's singleton db so existing callers can keep importing `audit` from
// this path. Phase 5 (apps/web rewire) replaces this with a per-app
// composition root.

import "server-only"
import { createAudit } from "@mlabs/db/audit"
import { db } from "./index"

export type {
  AuditMeta,
  AuditClient,
  AuditOpts,
  AuditFn,
} from "@mlabs/db/audit"
export { clientFromHeaders } from "@mlabs/db/audit"

export const audit = createAudit(db)
