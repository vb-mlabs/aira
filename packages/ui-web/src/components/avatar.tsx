"use client"

import { useState } from "react"
import { cn } from "../lib/utils"

const AVATAR_SIZE = {
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
  xl: "size-16",
} as const

const AVATAR_TEXT = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
} as const

export type AvatarSize = keyof typeof AVATAR_SIZE

interface AvatarProps {
  src: string | null | undefined
  name: string
  size?: AvatarSize
  className?: string
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const [errored, setErrored] = useState(false)

  if (src && !errored) {
    return (
      // Avatars are already-resized 256×256 JPEGs served by /api/v1/avatar
      // (or an external OAuth provider). next/image would add an optimisation
      // round-trip for zero win on an asset that small.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        data-slot="avatar"
        src={src}
        alt={name ? `${name}'s avatar` : ""}
        onError={() => setErrored(true)}
        className={cn(
          "shrink-0 rounded-full object-cover",
          AVATAR_SIZE[size],
          className,
        )}
      />
    )
  }

  return (
    <div
      data-slot="avatar-fallback"
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
        AVATAR_SIZE[size],
        AVATAR_TEXT[size],
        className,
      )}
    >
      {initials(name)}
    </div>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
