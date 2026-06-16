// /account/privacy-security — password change + account deletion. Reuses
// the existing SecuritySection and DangerZoneSection components that
// previously lived inside /profile; the section components themselves are
// unchanged. Server component fetches the user via the same in-process
// op pipeline /profile uses.

import type { Metadata } from "next"
import { apiServerFetch } from "@aira/api/server"
import { getProfileOp } from "@/server/operations/users"
import {
  SecuritySection,
  DangerZoneSection,
} from "@/features/profile"
import { AccountBackLink } from "../_components/back-link"

export const metadata: Metadata = {
  title: "Privacy & security",
}

export default async function PrivacySecurityPage() {
  const res = await apiServerFetch(getProfileOp, { input: {} })
  const user = res.data!.user

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
      <AccountBackLink />
      <header>
        <h1 className="font-display text-2xl text-foreground">
          Privacy & security
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your password and account.
        </p>
      </header>
      <SecuritySection />
      <DangerZoneSection user={{ email: user.email }} />
    </div>
  )
}
