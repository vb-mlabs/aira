"use client"

// Sticky nav for the marketing landing page. Cream backdrop-blur, AIRA
// tree-of-life logo + wordmark left, "Join Waitlist" pill on the right.
// Sign-in / Sign-up links are hidden until the app is live; the waitlist
// Dialog collects email and POSTs to /api/v1/waitlist (consumer flow).

import { useId, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Dialog } from "@base-ui/react/dialog"
import { brand } from "@aira/config"

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string }

function WaitlistForm() {
  const emailId = useId()
  const honeypotId = useId()
  const [email, setEmail] = useState("")
  const [honeypot, setHoneypot] = useState("")
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status.kind === "submitting") return
    setStatus({ kind: "submitting" })

    try {
      const res = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "marketing-hero", _h: honeypot }),
      })

      if (res.ok) {
        setStatus({ kind: "success" })
        return
      }

      const payload = (await res.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      const msg = payload?.error?.message ?? "Something went wrong. Try again."
      setStatus({ kind: "error", message: msg })
    } catch {
      setStatus({ kind: "error", message: "Network error. Check your connection and try again." })
    }
  }

  if (status.kind === "success") {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground"
        >
          ✓
        </span>
        <h3 className="mt-4 font-display text-xl font-bold text-foreground">
          You&rsquo;re on the list!
        </h3>
        <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground">
          We&rsquo;ll email you once — the day AIRA opens in Atlanta.
        </p>
        <Dialog.Close className="mt-6 inline-flex items-center justify-center rounded-full border border-border bg-transparent px-6 py-[11px] font-sans text-sm font-bold tracking-[0.3px] text-foreground transition-colors hover:bg-muted">
          Close
        </Dialog.Close>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor={emailId}
          className="block text-[13px] font-semibold text-foreground"
        >
          Email Address
        </label>
        <input
          id={emailId}
          type="email"
          required
          autoComplete="email"
          placeholder="your.email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status.kind === "submitting"}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-60"
        />
      </div>

      {/* Honeypot — hidden from humans, must stay empty */}
      <label
        htmlFor={honeypotId}
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
      >
        Leave this field blank
      </label>
      <input
        id={honeypotId}
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
      />

      {status.kind === "error" ? (
        <div
          role="alert"
          className="inline-flex items-center gap-2 rounded-lg bg-[color:oklch(0.55_0.22_27_/_10%)] px-3 py-2 text-sm font-semibold text-destructive"
        >
          <span aria-hidden="true">⚠</span>
          <span>{status.message}</span>
        </div>
      ) : null}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={status.kind === "submitting"}
          className="flex-1 rounded-full bg-[image:var(--gradient-primary)] px-6 py-[13px] font-sans text-sm font-bold tracking-[0.3px] text-primary-foreground shadow-[var(--shadow-primary-glow)] transition-transform hover:-translate-y-px disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {status.kind === "submitting" ? "Joining…" : "Join Waitlist"}
        </button>
        <Dialog.Close className="inline-flex items-center justify-center rounded-full border border-border bg-transparent px-5 py-[13px] font-sans text-sm font-bold tracking-[0.3px] text-foreground transition-colors hover:bg-muted">
          Cancel
        </Dialog.Close>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        No spam, no resale. One email when AIRA launches.
      </p>
    </form>
  )
}

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-50 bg-[url('/marketing-images/textures/paper-cream.webp')] bg-cover bg-center">
      <div className="mx-auto flex h-20 max-w-[1180px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-[14px]">
          <Image
            src="/marketing-images/logo.png"
            alt="AIRA tree-of-life logo"
            width={44}
            height={44}
            priority
            className="size-11 rounded-full"
          />
          <span className="leading-[1.1]">
            <span className="block font-display text-[22px] font-bold tracking-[1.5px] text-foreground">
              AIRA
            </span>
            <span className="block text-[11px] tracking-[0.5px] text-muted-foreground">
              by {brand.parentName}
            </span>
          </span>
        </Link>

        <Dialog.Root>
          <Dialog.Trigger className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.5px] text-primary-foreground transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            Join Waitlist
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-50 bg-[color:oklch(0.25_0.04_60_/_60%)] backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
            <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-card shadow-[0_40px_80px_-20px_oklch(0.25_0.04_60_/_50%)] outline-none transition-[transform,opacity] duration-200 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
              <div className="px-8 py-7 text-card-foreground">
                <span className="block text-[11px] font-bold uppercase tracking-[3px] text-primary">
                  Early access
                </span>
                <Dialog.Title className="mt-1.5 font-display text-[24px] font-bold italic leading-tight text-foreground">
                  Be among the first to know
                </Dialog.Title>
                <Dialog.Description className="mt-1.5 text-[13px] text-muted-foreground">
                  We&rsquo;ll let you know the moment AIRA opens in Atlanta.
                </Dialog.Description>

                <WaitlistForm />
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </nav>
  )
}
