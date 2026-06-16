// /profile — edit-profile screen. Security, notifications, and danger zone
// now live at their own /account/* sub-pages; this page is just the
// AccountSection (display name + avatar) plus a "<- Account" back link.
// Reads via apiServerFetch so the in-process call goes through the same
// auth + Zod validation pipeline that mobile uses for GET /api/v1/profile.

import { apiServerFetch } from "@aira/api/server"
import { getProfileOp } from "@/server/operations/users"
import { AccountSection } from "@/features/profile"
import { AccountBackLink } from "../account/_components/back-link"

export const metadata = { title: "Profile" }

export default async function ProfilePage() {
  const res = await apiServerFetch(getProfileOp, { input: {} })
  // apiServerFetch redirects on auth.idle_timeout and throws ApiError on
  // other failures — by the time we reach this line, res.data is set.
  const user = res.data!.user

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
      <AccountBackLink />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your display name and avatar.
        </p>
      </header>
      <AccountSection user={user} />
    </div>
  )
}
