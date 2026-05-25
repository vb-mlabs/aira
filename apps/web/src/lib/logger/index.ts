// Thin structured-logging wrapper. Three methods: info, warn, error.
//
// - info: console.log with structured shape — never persisted
// - warn: console.warn AND a row in error_log
// - error: console.error AND a row in error_log
//
// Persisting errors solves "Replit logs are ephemeral". The DB
// write is best-effort: if it fails (DB down), we fall back to console only —
// we don't want logger.error() itself to throw and bury the original error.
//
// Server-only on purpose: client code should use plain console; we don't ship
// DB writes to the browser.

import "server-only"
import { db } from "@/lib/db"
import { error_log } from "@mlabs/db/schema"

type Meta = Record<string, unknown> | undefined

function shape(level: "info" | "warn" | "error", message: string, meta: Meta) {
  return meta ? { level, message, ...meta } : { level, message }
}

async function persist(level: "warn" | "error", message: string, meta: Meta) {
  try {
    await db.insert(error_log).values({ level, message, meta: meta ?? null })
  } catch (err) {
    // Don't throw from the logger — bury the persistence error in console only.
    console.error("[logger] failed to persist error_log row", err)
  }
}

export const logger = {
  info(message: string, meta?: Meta): void {
    console.log(shape("info", message, meta))
  },

  warn(message: string, meta?: Meta): void {
    console.warn(shape("warn", message, meta))
    void persist("warn", message, meta)
  },

  error(message: string, meta?: Meta): void {
    console.error(shape("error", message, meta))
    void persist("error", message, meta)
  },
}

export type Logger = typeof logger
