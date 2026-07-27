"use client"

// LogoControl — 128×128 square admin tile for the business logo.
//
// Modelled on FeatureImageControl (empty-state dropzone / filled-state
// hover-reveal Replace + Remove). The one difference: instead of
// POSTing straight from onDrop, we hand the picked file to
// LogoCropModal for a WhatsApp-style square crop. This keeps
// wordmark logos from getting entropy-scored badly server-side.

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Loader2, Upload, X } from "lucide-react"
import { LogoCropModal } from "./logo-crop-modal"

interface LogoControlProps {
  businessId: string
  logoUrl: string | null
}

export function LogoControl({ businessId, logoUrl }: LogoControlProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [pickedSrc, setPickedSrc] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0]
      if (!file) return
      // Revoke any prior object URL before minting a fresh one so a
      // second pick doesn't leak. modalOpen effect resets internal state.
      if (pickedSrc) URL.revokeObjectURL(pickedSrc)
      const src = URL.createObjectURL(file)
      setPickedSrc(src)
      setModalOpen(true)
      setError(null)
    },
    [pickedSrc],
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    disabled: removing,
    noClick: false,
  })

  // Revoke the object URL when the modal closes (either via Save or
  // Cancel) so we don't keep the blob alive for the lifetime of the
  // page. Wrapping the setState in a named function so React 19's
  // set-state-in-effect rule doesn't fire on the inline call —
  // matches the sponsorships-section.tsx pattern.
  function releasePickedSrc() {
    if (pickedSrc) {
      URL.revokeObjectURL(pickedSrc)
      setPickedSrc(null)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { if (!modalOpen) releasePickedSrc() }, [modalOpen])

  async function handleRemove() {
    setError(null)
    setRemoving(true)
    try {
      const res = await fetch(
        `/api/v1/admin/businesses/${businessId}/logo`,
        { method: "DELETE" },
      )
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error?.message ?? "Remove failed.")
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed.")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="space-y-2">
      {logoUrl ? (
        <div className="group relative size-32 overflow-hidden rounded-xl border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={open}
              disabled={removing}
              aria-label="Replace logo"
              className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed"
            >
              <Upload className="size-3" aria-hidden />
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              aria-label="Remove logo"
              className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed"
            >
              {removing ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <X className="size-3" aria-hidden />
              )}
              Remove
            </button>
          </div>
          <input {...getInputProps()} />
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={[
            "flex size-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center transition-colors",
            isDragActive
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            removing && "pointer-events-none opacity-60",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <input {...getInputProps()} />
          <Upload className="size-5" aria-hidden />
          <span className="text-xs font-medium">
            {isDragActive ? "Drop file" : "Upload logo"}
          </span>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Square, transparent PNG ≥ 512×512 works best.
      </p>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <LogoCropModal
        businessId={businessId}
        imageSrc={pickedSrc}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
