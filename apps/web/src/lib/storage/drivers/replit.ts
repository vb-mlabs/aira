// Replit Object Storage driver — the MLabs default.
//
// Important: Replit Object Storage does NOT expose public URLs out of the box
// (it's GCS-backed, but Replit's wrapper doesn't surface signed URLs). So this
// driver returns relative URLs through our /api/storage/[...key] proxy route,
// which fetches the bytes from Replit and streams them to the browser. Cost:
// no CDN benefit, all reads go through our app. For MVP scale (sub-1k users),
// this is fine. To upgrade: swap drivers (Cloudinary, S3, R2 — same interface).

import "server-only"
import { Client } from "@replit/object-storage"
import { env } from "@/config/env"
import type { StorageDriver, UploadArgs, UploadResult } from "../types"

let _client: Client | null = null

function getClient(): Client {
  if (_client) return _client
  if (!env.REPLIT_OBJECT_STORAGE_BUCKET_ID) {
    throw new Error(
      "REPLIT_OBJECT_STORAGE_BUCKET_ID is required for the replit storage driver",
    )
  }
  _client = new Client({ bucketId: env.REPLIT_OBJECT_STORAGE_BUCKET_ID })
  return _client
}

// Tiny content-type cache so the proxy route doesn't have to round-trip
// through metadata storage. Keys are object names; value is the MIME type
// recorded at upload time. Lives only in memory; cold-start safe (the proxy
// also infers from extension as a fallback).
const _contentTypes = new Map<string, string>()

export const replitDriver: StorageDriver = {
  name: "replit",

  async upload(args: UploadArgs): Promise<UploadResult> {
    const client = getClient()
    const result = await client.uploadFromBytes(args.key, args.body)
    if (!result.ok) {
      throw new Error(`storage.upload failed: ${result.error.message}`)
    }
    _contentTypes.set(args.key, args.contentType)
    return { url: this.getUrl(args.key) }
  },

  async delete(key: string): Promise<void> {
    const client = getClient()
    const result = await client.delete(key)
    if (!result.ok) {
      throw new Error(`storage.delete failed: ${result.error.message}`)
    }
    _contentTypes.delete(key)
  },

  async download(key: string): Promise<{ body: Buffer; contentType?: string }> {
    const client = getClient()
    const result = await client.downloadAsBytes(key)
    if (!result.ok) {
      throw new Error(`storage.download failed: ${result.error.message}`)
    }
    return { body: result.value[0], contentType: _contentTypes.get(key) }
  },

  getUrl(key: string): string {
    return `/api/storage/${encodeURI(key)}`
  },
}
