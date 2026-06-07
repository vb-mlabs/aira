// /profile — sectioned-card layout per design decision D5.
// Server component; composes feature modules and passes only the trusted
// user fields to the client sections. Reads via apiServerFetch so the
// in-process call goes through the same auth + Zod validation pipeline
// that mobile uses for GET /api/v1/profile.

import { apiServerFetch } from "@aira/api/server"
import { getProfileOp } from "@/server/operations/users"
import {
  AccountSection,
  DangerZoneSection,
  NotificationsSection,
  SecuritySection,
} from "@/features/profile"

export const metadata = { title: "Profile" }

export default async function ProfilePage() {
  const res = await apiServerFetch(getProfileOp, { input: {} })
  // apiServerFetch redirects on auth.idle_timeout and throws ApiError on
  // other failures — by the time we reach this line, res.data is set.
  const user = res.data!.user

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
