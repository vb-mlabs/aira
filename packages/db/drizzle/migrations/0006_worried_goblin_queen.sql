CREATE TABLE "webhook_event" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "webhook_event_event_type_idx" ON "webhook_event" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "webhook_event_processed_at_idx" ON "webhook_event" USING btree ("processed_at");