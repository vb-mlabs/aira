// /profile — sectioned-card layout per design decision D5.
// Server component; composes feature modules and passes only the trusted
// session user fields to the client sections.

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { user as userTable } from "@mlabs/db/schema"
import { requireUser } from "@/lib/auth/server"
import {
  AccountSection,
  DangerZoneSection,
  NotificationsSection,
  SecuritySection,
} from "@/features/profile"

export const metadata = { title: "Profile" }

export default async function ProfilePage() {
  const me = await requireUser()

  // Fetch the latest row directly — the session-cached user may lag a freshly
  // committed name/email/avatar change, and we render this page right after
  // those mutations.
  const [fresh] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      emailVerified: userTable.emailVerified,
      image: userTable.image,
    })
    .from(userTable)
    .where(eq(userTable.id, me.id))
    .limit(1)

  const user = fresh ?? {
    id: me.id,
    name: me.name,
    email: me.email,
    emailVerified: me.emailVerified,
    image: me.image ?? null,
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, security, and preferences.
        </p>
      </header>
      <AccountSection user={user} />
      <SecuritySection />
      <NotificationsSection />
      <DangerZoneSection user={{ email: user.email }} />
    </div>
  )
}
