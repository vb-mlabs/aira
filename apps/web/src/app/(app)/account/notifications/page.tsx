// /account/notifications — per-event email preference toggles. Currently
// two binary opt-outs (new direct messages, community responses). Reads
// via apiServerFetch through getPreferencesOp; the client toggle component
// mutates via PATCH /api/v1/profile/preferences so web + mobile share the
// contract.

import type { Metadata } from "next"
import { apiServerFetch } from "@aira/api/server"
import { getPreferencesOp } from "@/server/operations/user-preferences"
import { AccountBackLink } from "../_components/back-link"
import { PreferenceToggles } from "./_components/preference-toggles"

export const metadata: Metadata = {
  title: "Notifications",
}

export default async function NotificationsPage() {
  const res = await apiServerFetch(getPreferencesOp, { input: {} })
  const preferences = res.data!.preferences

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-10">
      <AccountBackLink />
      <header className="mb-6">
        <h1 className="font-display text-2xl text-foreground">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which events trigger an email. In-app notifications are always
          shown in your inbox.
        </p>
      </header>
      <PreferenceToggles initial={preferences} />
    </div>
  )
}
