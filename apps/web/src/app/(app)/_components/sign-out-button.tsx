"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@aira/ui-web/utils"
import { signOut } from "@/lib/auth/client"

interface SignOutButtonProps {
  /** Override the default text-link styling (e.g. for the account page's
   *  outline button variant). When omitted, the muted text-link look is used. */
  className?: string
}

export function SignOutButton({ className }: SignOutButtonProps = {}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await signOut()
        router.push("/login")
        router.refresh()
      }}
      className={cn(
        className ??
          "text-sm text-muted-foreground hover:text-foreground disabled:opacity-60",
      )}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  )
}
