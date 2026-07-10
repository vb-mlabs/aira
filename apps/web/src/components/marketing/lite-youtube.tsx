"use client"

// YouTube facade: renders a static poster + play overlay that opens a
// @base-ui/react Dialog with a youtube-nocookie iframe. Zero third-party JS
// on initial paint; the iframe only mounts when `open === true`, so closing
// the Dialog unmounts it immediately (audio stops before the exit animation
// completes). Poster URL uses `mqdefault.jpg` (native 16:9, guaranteed to
// exist for every video ID) served straight from i.ytimg.com — no
// next/image, so no `remotePatterns` config change needed.

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"

const POSTER_HOST = "https://i.ytimg.com"
const EMBED_HOST = "https://www.youtube-nocookie.com"

type LiteYouTubeProps = {
  videoId: string
  title: string
  posterAlt: string
  caption?: string
  className?: string
  captionClassName?: string
}

export function LiteYouTube({
  videoId,
  title,
  posterAlt,
  caption,
  className,
  captionClassName,
}: LiteYouTubeProps) {
  const [open, setOpen] = useState(false)
  const posterSrc = `${POSTER_HOST}/vi/${videoId}/mqdefault.jpg`
  const embedSrc = `${EMBED_HOST}/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
  const captionCls = captionClassName ?? "text-muted-foreground"

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className={`group relative block w-full cursor-pointer border-0 bg-transparent p-0 text-left transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2${className ? ` ${className}` : ""}`}
      >
        <span className="relative block aspect-video w-full overflow-hidden rounded-2xl shadow-[0_10px_30px_-10px_oklch(0.25_0.04_60_/_35%)]">
          <img
            src={posterSrc}
            alt={posterAlt}
            width={320}
            height={180}
            loading="lazy"
            className="block h-full w-full object-cover"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-brand-gold text-white shadow-[0_8px_20px_-6px_oklch(0.25_0.04_60_/_50%)] transition-transform group-hover:scale-110">
              <PlayIcon />
            </span>
          </span>
        </span>
        {caption ? (
          <span
            className={`mt-2 block text-center font-display text-sm italic ${captionCls}`}
          >
            {caption}
          </span>
        ) : null}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[color:oklch(0.25_0.04_60_/_70%)] backdrop-blur-sm data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-200" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(800px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-card shadow-[0_40px_80px_-20px_oklch(0.25_0.04_60_/_50%)] outline-none data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 transition-[transform,opacity] duration-200">
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <div className="relative aspect-video w-full bg-black">
            {open ? (
              <iframe
                src={embedSrc}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : null}
          </div>
          <Dialog.Close
            aria-label="Close video"
            className="absolute right-3 top-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-card/90 text-foreground shadow-[0_4px_12px_-2px_oklch(0.25_0.04_60_/_40%)] backdrop-blur-sm transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            <CloseIcon />
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="ml-0.5 size-6"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
