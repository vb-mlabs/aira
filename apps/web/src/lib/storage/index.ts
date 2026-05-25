// Public storage API. Use the named exports rather than reaching for the
// driver directly. Driver is selected by env (REPLIT_OBJECT_STORAGE_BUCKET_ID
// presence) — to add another driver, register it in driver.ts.

import "server-only"
import { getStorageDriver } from "./driver"
import type { UploadArgs, UploadResult } from "./types"

export type { StorageDriver, UploadArgs, UploadResult } from "./types"
export { _setDriverForTesting } from "./driver"

export const storage = {
  async upload(args: UploadArgs): Promise<UploadResult> {
    return getStorageDriver().upload(args)
  },
  async delete(key: string): Promise<void> {
    return getStorageDriver().delete(key)
  },
  async download(key: string) {
    return getStorageDriver().download(key)
  },
  getUrl(key: string): string {
    return getStorageDriver().getUrl(key)
  },
}
