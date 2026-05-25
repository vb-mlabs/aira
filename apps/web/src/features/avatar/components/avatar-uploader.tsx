"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@mlabs/ui-web/button"

interface AvatarUploaderProps {
  currentUrl: string | null
  userName: string
}

const ACCEPT = "image/jpeg,image/png,image/webp"

// Renders the current avatar (or initials fallback), an "Upload" button that
// triggers the hidden file input, and "Remove" for when one exists. POSTs
// to /api/avatar — the server-side pipeline (sharp resize, storage swap) is
// owned by features/avatar/server/pipeline.
export function AvatarUploader({ currentUrl, userName }: AvatarUploaderProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function pickFile() {
    setError(null)
    inputRef.current?.click()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-uploading the same file
    if (!file) return

    startTransition(async () => {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/v1/avatar", { method: "POST", body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Upload failed." }))
        setError(body.error ?? "Upload failed.")
        return
      }
      router.refresh()
    })
  }

  function handleRemove() {
    startTransition(async () => {
      const res = await fetch("/api/v1/avatar", { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed." }))
        setError(body.error ?? "Failed.")
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Avatar</p>
      <div className="flex items-center gap-4">
        <Preview url={currentUrl} name={userName} />
        <div className="flex gap-2">
          <Button type="button" onClick={pickFile} disabled={pending}>
            {pending ? "Uploading…" : currentUrl ? "Replace" : "Upload"}
          </Button>
          {currentUrl && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              disabled={pending}
            >
              Remove
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleChange}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        JPEG, PNG, or WebP. Up to 5 MB. We resize to 256×256.
      </p>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function Preview({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      // Avatar is a server-resized, public 256×256 JPEG served by our own
      // proxy route — using <img> rather than next/image avoids an extra
      // optimization round-trip on what's already a tiny asset.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`${name}'s avatar`}
        width={64}
        height={64}
        className="size-16 rounded-full object-cover ring-1 ring-border"
      />
    )
  }
  return (
    <div
      aria-hidden="true"
      className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground text-lg font-medium"
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
