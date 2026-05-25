-- Phase 5.5 P1 — freshness signals for conditional GET (If-Modified-Since).
--
-- Two new timestamp columns on user, both DB-trigger-maintained so app code
-- can NEVER race. Inserting a notification → bumps users.notifications_updated_at
-- inside the same transaction (same for messages → messages_updated_at).
--
-- The triggers are AFTER INSERT (not BEFORE) so:
--   - the new row's PK is already assigned,
--   - if the UPDATE fails (e.g. user row gone), the insert is rolled back,
--     so the timestamp can never get ahead of the actual data.
--
-- Atomicity contract is verified in tests/db-trigger-atomicity.test.ts.

ALTER TABLE "user" ADD COLUMN "notifications_updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "messages_updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint

CREATE OR REPLACE FUNCTION bump_user_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "user" SET notifications_updated_at = now() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE OR REPLACE FUNCTION bump_user_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- A new message in a conversation should refresh the inbox timestamp of
  -- every participant — that's what the inbox-list endpoint reads.
  UPDATE "user"
  SET messages_updated_at = now()
  WHERE id IN (
    SELECT user_id
    FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER notifications_bump_user_ts
AFTER INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION bump_user_notifications_updated_at();--> statement-breakpoint

CREATE TRIGGER messages_bump_user_ts
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION bump_user_messages_updated_at();
