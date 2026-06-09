"use client"

// Hamburger trigger + slide-in drawer wrapping AdminSidebar for mobile
// (< md). Mirrors the user-facing MobileSidebar exactly.

import { Menu } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { AdminSidebar } from "./admin-sidebar"

export function AdminMobileSidebar() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const lastPathname = useRef(pathname)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (lastPathname.current === pathname) return
    lastPathname.current = pathname
    setOpen(false)
  }, [pathname])

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

      {mounted &&
        open &&
        createPortal(
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
              aria-label="Admin menu"
            >
              <AdminSidebar onClose={() => setOpen(false)} />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
