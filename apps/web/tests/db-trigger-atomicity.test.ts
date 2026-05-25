// @vitest-environment node
//
// Phase 5.5 P1 — DB-trigger atomicity contract.
//
// We can't boot a real Postgres in Vitest, but we CAN assert the migration
// SQL we ship installs the AFTER INSERT triggers on notifications + messages
// and bumps users.notifications_updated_at / messages_updated_at in the same
// transaction. The shape of the SQL is the test artefact — a regression on
// the migration would silently break conditional GET in prod.
//
// (The real-database E2E proof lives in a CI Postgres job; not in scope for
// Lane B.)

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// Resolve workspace root from this test file's location so the test passes
// regardless of whether vitest runs from the monorepo root or apps/web.
const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKSPACE_ROOT = resolve(__dirname, "..", "..", "..")

const migration = readFileSync(
  resolve(
    WORKSPACE_ROOT,
    "packages/db/drizzle/migrations/0005_add_user_notification_timestamps.sql",
  ),
  "utf8",
)

describe("migration 0005 — notification timestamp triggers", () => {
  it("adds notifications_updated_at column on user (NOT NULL with default)", () => {
    expect(migration).toMatch(
      /ALTER TABLE "user" ADD COLUMN "notifications_updated_at" timestamp DEFAULT now\(\) NOT NULL/,
    )
  })

  it("adds messages_updated_at column on user (NOT NULL with default)", () => {
    expect(migration).toMatch(
      /ALTER TABLE "user" ADD COLUMN "messages_updated_at" timestamp DEFAULT now\(\) NOT NULL/,
    )
  })

  it("installs AFTER INSERT trigger on notifications that bumps the user column", () => {
    expect(migration).toMatch(
      /CREATE TRIGGER notifications_bump_user_ts\s+AFTER INSERT ON notifications/,
    )
    // The bump must happen inside the same statement scope, not asynchronously.
    expect(migration).toMatch(
      /UPDATE "user" SET notifications_updated_at = now\(\) WHERE id = NEW\.user_id/,
    )
  })

  it("installs AFTER INSERT trigger on messages that bumps every participant", () => {
    expect(migration).toMatch(
      /CREATE TRIGGER messages_bump_user_ts\s+AFTER INSERT ON messages/,
    )
    // Bump every user_id in conversation_participants for this conversation —
    // both sides of a 1:1 see the inbox refresh.
    expect(migration).toMatch(
      /UPDATE "user"\s+SET messages_updated_at = now\(\)\s+WHERE id IN \(\s*SELECT user_id\s+FROM conversation_participants\s+WHERE conversation_id = NEW\.conversation_id\s*\)/,
    )
  })

  it("triggers run AFTER INSERT (race-safe: NEW row is committed-visible)", () => {
    // BEFORE INSERT would let the timestamp move before the row is real —
    // a poller could see the new ts, race back to query notifications, and
    // miss the row that hasn't been written yet. The locked decision is AFTER.
    expect(migration).not.toMatch(/BEFORE INSERT ON notifications/)
    expect(migration).not.toMatch(/BEFORE INSERT ON messages/)
  })

  it("journal is updated so drizzle-kit migrate picks it up", () => {
    const journal = readFileSync(
      resolve(
        WORKSPACE_ROOT,
        "packages/db/drizzle/migrations/meta/_journal.json",
      ),
      "utf8",
    )
    expect(journal).toContain("0005_add_user_notification_timestamps")
  })
})
