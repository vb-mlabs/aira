"use server"

// Dev-only seed action. Delete src/app/dev/ before v1 ship.
//
// Note: this seeds a notification for the CURRENT user (ctx.userId ===
// args.userId). The service's createNotification doesn't authz-check that
// pairing — its comment is explicit: "Caller is responsible for
// authorization". Dev-only callers that know they're notifying themselves
// (or trusted system flows) are the intended consumers; the
// admin-impersonation case will route through @mlabs/services/admin when
// that lands.

import { notifications } from "@mlabs/services"
import { db } from "@/lib/db"
import { getCallerContext } from "@/lib/auth/server"

export async function seedTestNotification() {
  const ctx = await getCallerContext()
  const stamp = new Date().toLocaleTimeString()
  await notifications.createNotification(db, ctx, {
    userId: ctx.userId,
    body: {
      kind: "generic",
      title: `Test notification at ${stamp}`,
      message:
        "This is a seeded notification for development. The bell should reflect it within 5 seconds.",
      href: "/notifications",
    },
  })
}
