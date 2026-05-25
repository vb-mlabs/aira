"use server"

// Dev-only helpers. Removed before v1 ship.
//
// seedPartner — creates (idempotently) a fake "partner" user with a known
// password so devs can open a second browser context and sign in as them.
// seedDM — opens (or reuses) a 1:1 between the current user and the partner,
// then sends a starter message. Useful for poking at the inbox + thread UI
// without having to manage two real signups.

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { user as userTable } from "@mlabs/db/schema"
import { messages } from "@mlabs/services"
import { getCallerContext } from "@/lib/auth/server"

const PARTNER_EMAIL = "dev-partner@example.test"
const PARTNER_PASSWORD = "dev-partner-pass-1234"
const PARTNER_NAME = "Dev Partner"

export async function seedPartner(): Promise<{
  email: string
  password: string
}> {
  // Check whether the partner exists. Better Auth would 400 on duplicate
  // signups; we only create when missing.
  const [existing] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, PARTNER_EMAIL))
    .limit(1)

  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        email: PARTNER_EMAIL,
        password: PARTNER_PASSWORD,
        name: PARTNER_NAME,
      },
    })
    // Force verification so the partner can be DM'd. In real flow this
    // happens after the user clicks the link; here we bypass.
    await db
      .update(userTable)
      .set({ emailVerified: true })
      .where(eq(userTable.email, PARTNER_EMAIL))
  }

  return { email: PARTNER_EMAIL, password: PARTNER_PASSWORD }
}

export async function seedDM(): Promise<void> {
  const ctx = await getCallerContext()
  await seedPartner()
  const { id } = await messages.openOrCreate1to1(db, ctx, {
    otherEmail: PARTNER_EMAIL,
  })
  await messages.sendMessage(db, ctx, {
    conversationId: id,
    body: `Test message at ${new Date().toLocaleTimeString()}`,
  })
}
