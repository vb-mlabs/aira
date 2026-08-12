"use client"

// ImageCropModal — generic crop-with-zoom modal for any admin image
// upload. Used by:
//   - logo-control (aspect 1, PNG for wordmark transparency)
//   - feature-image-section (aspect 1200/630, JPEG)
//   - gallery-section (aspect 1200/800, JPEG)
//
// Owns react-easy-crop, the zoom slider, the canvas-to-blob helper, and
// the POST to whichever admin endpoint the caller passes. Emits
// `onSuccess` (with the new URL) so the parent control can refresh.
//
// Design notes:
// - Aspect is caller-controlled and constrains the crop rectangle to
//   the exact ratio the server pipeline needs, so the user sees the
//   crop that will actually ship rather than trusting the server-side
//   resize fallback to guess the right region.
// - Zoom slider clamped 1–3× (react-easy-crop default). Wheel zoom on
//   desktop, pinch on touch — both come free from the lib.
// - Output MIME is caller-controlled. Default JPEG (photos, smaller
//   uploads); logos override to PNG to preserve transparency
//   end-to-end. Server pipelines re-encode either way.

import { useState, useCallback, useEffect } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { Dialog } from "@base-ui/react/dialog"
import { X, Loader2 } from "lucide-react"
import { Button } from "@aira/ui-web/button"
import { cn } from "@aira/ui-web/utils"

export type CropOutputMime = "image/png" | "image/jpeg"

export interface ImageCropModalProps {
  /** Object URL of the source file the admin picked. Owned by the
   *  caller so we can revoke it on close without racing the picker. */
  imageSrc: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fires after a successful POST — parent usually runs
   *  router.refresh(). */
  onSuccess: (newUrl: string) => void
  /** Absolute path (or full URL) for the POST target. */
  endpoint: string
  /** Aspect ratio for the crop rectangle (width / height). Logo=1,
   *  cover=1200/630, gallery=1200/800, etc. */
  aspect: number
  /** Filename attached to the FormData part. Server pipelines don't
   *  care about the name but the DevTools request panel does. */
  filename?: string
  /** Modal header text. */
  title?: string
  /** Primary button label. */
  saveLabel?: string
  /** Encoded MIME for the cropped blob. Default "image/jpeg" (small
   *  uploads for photos). Set "image/png" for logos so transparency
   *  survives client → server. */
  outputMime?: CropOutputMime
  /** JPEG quality 0..1. Ignored for PNG. Default 0.92. */
  outputQuality?: number
}

/** Draws the cropped region onto an off-screen canvas and returns a
 *  Blob in the requested format. Exported for direct testing without
 *  spinning up the modal. */
export async function cropImageToBlob(
  imageSrc: string,
  crop: Area,
  mime: CropOutputMime = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  const img = new Image()
  img.src = imageSrc
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error("Image failed to load"))
  })

  const canvas = document.createElement("canvas")
  canvas.width = crop.width
  canvas.height = crop.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context not available")
  // JPEG has no alpha channel — fill the canvas with white first so
  // transparent source pixels don't render as black in the output.
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, crop.width, crop.height)
  }
  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Canvas toBlob returned null"))
        else resolve(blob)
      },
      mime,
      mime === "image/jpeg" ? quality : undefined,
    )
  })
}

export function ImageCropModal({
  imageSrc,
  open,
  onOpenChange,
  onSuccess,
  endpoint,
  aspect,
  filename = "image",
  title = "Crop image",
  saveLabel = "Save",
  outputMime = "image/jpeg",
  outputQuality = 0.92,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset transient state each time the modal opens so a second upload
  // doesn't inherit the previous zoom/crop. Wrapping the reset in a
  // named function so React 19's set-state-in-effect rule doesn't fire
  // on the inline calls — matches sponsorships-section.tsx.
  function resetTransientState() {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setError(null)
    setSaving(false)
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (open) resetTransientState() }, [open])

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleSave() {
    if (!imageSrc || !croppedAreaPixels) return
    setError(null)
    setSaving(true)
    try {
      const blob = await cropImageToBlob(
        imageSrc,
        croppedAreaPixels,
        outputMime,
        outputQuality,
      )
      const ext = outputMime === "image/png" ? "png" : "jpg"
      const form = new FormData()
      form.append("file", blob, `${filename}.${ext}`)
      const res = await fetch(endpoint, { method: "POST", body: form })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error?.message ?? "Upload failed.")
      }
      const { url } = (await res.json()) as { url?: string }
      onSuccess(url ?? "")
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(560px,94vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
            <Dialog.Title className="font-display text-lg text-foreground">
              {title}
            </Dialog.Title>
            <Dialog.Close
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-4 px-6 py-5">
            {/* react-easy-crop needs an explicit positioned parent — it
                absolute-positions its own layers. Height stays 320px so
                the container is roughly the same visual scale for every
                aspect ratio; width scales to a comfortable fit inside
                the modal (which itself clamps to 94vw so the crop box
                shrinks proportionally on mobile). */}
            <div className="relative h-[320px] w-full overflow-hidden rounded-lg bg-muted">
              {imageSrc ? (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  restrictPosition={true}
                  showGrid={false}
                  // "cover" makes the image fill the crop area at zoom=1
                  // for every orientation. Under the default "contain", a
                  // portrait image renders as a thin strip whose width equals
                  // the crop box's width, so restrictPosition clamps
                  // horizontal panning to zero at zoom=1 and the widget feels
                  // stuck. With "cover" the crop is always the full landscape
                  // rectangle and zoom + pan behave the same regardless of
                  // input orientation.
                  objectFit="cover"
                />
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <label
                htmlFor="image-crop-zoom"
                className="text-xs font-medium text-muted-foreground"
              >
                Zoom
              </label>
              <input
                id="image-crop-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-1.5 flex-1 accent-primary"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !croppedAreaPixels}
                className={cn("gap-1.5")}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Uploading…
                  </>
                ) : (
                  saveLabel
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
