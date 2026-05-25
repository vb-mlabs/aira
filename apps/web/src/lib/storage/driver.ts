// Driver registry. The MLabs default is Replit Object Storage; swap by
// editing this file (don't introduce a flag — every fork picks one driver
// at fork time, "configurable not customizable").

import "server-only"
import { replitDriver } from "./drivers/replit"
import type { StorageDriver } from "./types"

let _driver: StorageDriver | null = null

export function getStorageDriver(): StorageDriver {
  if (!_driver) _driver = replitDriver
  return _driver
}

/** Test-only: override the active driver. Reset to null between tests. */
export function _setDriverForTesting(driver: StorageDriver | null): void {
  _driver = driver
}
