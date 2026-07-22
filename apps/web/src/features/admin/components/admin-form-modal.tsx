"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"

interface AdminFormModalProps {
  title: string
  description?: string
  backHref: string
  children: React.ReactNode
}

export function AdminFormModal({ title, description, backHref, children }: AdminFormModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(true)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) router.push(backHref)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        {/* Centering wrapper. Popup itself is a static flex child so it
            has no transform on it — that matters because Google's Place
            Autocomplete dropdown inside the form uses `position: fixed`,
            and CSS `position: fixed` inside a transformed ancestor becomes
            containing-block-relative (i.e. modal-relative), not
            viewport-relative. That broke the dropdown's placement in the
            business address field. `pointer-events-none` + `-auto` keeps
            backdrop clicks passing through to Dialog's close handler. */}
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <Dialog.Popup className="pointer-events-auto flex w-[min(500px,92vw)] max-h-[90svh] flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div>
                <Dialog.Title className="font-display text-xl text-foreground">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close
                className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="Close"
              >
                <X className="size-4" aria-hidden />
              </Dialog.Close>
            </div>
            {/* pt-5 only (not py-5): the scroll container has no bottom
                padding so a form's sticky footer with `bottom-0` sits
                flush against the modal's inner bottom edge. Forms without
                a sticky footer add their own pb-5 to keep breathing room
                under their action row. */}
            <div className="overflow-y-auto px-6 pt-5">{children}</div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
