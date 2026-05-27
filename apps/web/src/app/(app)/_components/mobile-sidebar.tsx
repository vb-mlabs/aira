"use client"

// Combined hamburger trigger + slide-in drawer for mobile (< md). The
// drawer wraps the same AppSidebar used by the desktop layout, so the
// menu content stays in one place. Auto-closes on route change so
// tapping a category navigates and dismisses the overlay in one move.

import { Menu } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "./app-sidebar"

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const lastPathname = useRef(pathname)

  // Close after navigation. The ref guard means setOpen runs exactly once
  // per pathname change instead of on every render — the react-hooks rule
  // for setState-in-effect would otherwise flag the unconditional call.
  useEffect(() => {
    if (lastPathname.current === pathname) return
    lastPathname.current = pathname
    setOpen(false)
  }, [pathname])

  // Body scroll lock + ESC to close when open.
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-full text-foreground hover:bg-muted"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="absolute inset-y-0 left-0 w-[85vw] max-w-[320px] shadow-[var(--shadow-drawer)]"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
          >
            <AppSidebar onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
