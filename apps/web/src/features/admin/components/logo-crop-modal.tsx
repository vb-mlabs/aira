"use client"

// LogoCropModal — WhatsApp-avatar-style square crop with zoom.
//
// Owns react-easy-crop, the zoom slider, the canvas-to-blob helper, and
// the POST to /api/v1/admin/businesses/[id]/logo. Emits `onSuccess`
// (with the new URL) so the parent LogoControl can refresh + close.
//
// Design notes:
// - Aspect locked to 1:1 (square) — server's cover-resize is a defensive
//   fallback if a caller ever sends a non-square blob, but the modal
//   itself guarantees square output.
// - zoom slider clamped 1–3× (react-easy-crop default). Wheel zoom on
//   desktop, pinch on touch — both come free from the lib.
// - Output MIME is image/png to preserve transparency end-to-end. The
//   server pipeline also outputs PNG (see business-image-pipeline.ts).

import { useState, useCallback, useEffect } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { Dialog } from "@base-ui/react/dialog"
import { X, Loader2 } from "lucide-react"
import { Button } from "@aira/ui-web/button"
import { cn } from "@aira/ui-web/utils"

interface LogoCropModalProps {
  businessId: string
  /** Object URL of the source file the admin picked. Owned by the caller
   *  (LogoControl) so we can revoke it on close without racing the picker. */
  imageSrc: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fires after a successful POST — parent runs router.refresh(). */
  onSuccess: (newUrl: string) => void
}

/** Draws the cropped region onto an off-screen canvas and returns a PNG
 *  Blob. Exported for direct testing without spinning up the modal. */
export async function cropImageToBlob(
  imageSrc: string,
  crop: Area,
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
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Canvas toBlob returned null"))
      else resolve(blob)
    }, "image/png")
  })
}

export function LogoCropModal({
  businessId,
  imageSrc,
  open,
  onOpenChange,
  onSuccess,
}: LogoCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset transient state each time the modal opens so a second logo
  // upload doesn't inherit the previous zoom/crop.
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      setError(null)
      setSaving(false)
    }
  }, [open])

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleSave() {
    if (!imageSrc || !croppedAreaPixels) return
    setError(null)
    setSaving(true)
    try {
      const blob = await cropImageToBlob(imageSrc, croppedAreaPixels)
      const form = new FormData()
      form.append("file", blob, "logo.png")
      const res = await fetch(
        `/api/v1/admin/businesses/${businessId}/logo`,
        { method: "POST", body: form },
      )
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error?.message ?? "Upload failed.")
      }
      const { url } = (await res.json()) as { url: string }
      onSuccess(url)
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
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(480px,94vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
            <Dialog.Title className="font-display text-lg text-foreground">
              Crop logo
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
                absolute-positions its own layers. 320px tall matches the
                Cropper's minimum useful size on desktop; on mobile the
                modal itself clamps to 94vw so the crop box shrinks
                proportionally via the aspect + fit. */}
            <div className="relative h-[320px] w-full overflow-hidden rounded-lg bg-muted">
              {imageSrc ? (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  restrictPosition={true}
                  showGrid={false}
                />
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <label
                htmlFor="logo-zoom"
                className="text-xs font-medium text-muted-foreground"
              >
                Zoom
              </label>
              <input
                id="logo-zoom"
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
                  "Save logo"
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
