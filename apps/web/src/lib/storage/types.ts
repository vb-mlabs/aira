// StorageAdapter interface — the only contract features should depend on.
// Drivers (Replit Object Storage, S3, Cloudinary, etc.) implement this shape.
//
// Storage abstraction is the one infra concern that genuinely
// has the same shape across providers, so the adapter pays for itself the first
// time a client wants to swap storage providers.

export interface UploadArgs {
  /** Object key (path-like, e.g. "avatars/user-abc123.jpg"). Must be unique. */
  key: string
  /** Raw bytes to store. */
  body: Buffer
  /** MIME type (used by the proxy route to set Content-Type when serving). */
  contentType: string
}

export interface UploadResult {
  /** Public URL where the object can be fetched. v1: a relative URL through
   *  /api/storage/[...key] proxy. (Replit Object Storage doesn't expose
   *  public URLs directly — see drivers/replit.ts comments.) */
  url: string
}

export interface StorageDriver {
  name: string
  upload(args: UploadArgs): Promise<UploadResult>
  delete(key: string): Promise<void>
  /** Stream the object's bytes (used by the proxy route). */
  download(key: string): Promise<{ body: Buffer; contentType?: string }>
  /** Build a fetchable URL for the key (typically `/api/storage/${key}`). */
  getUrl(key: string): string
}
