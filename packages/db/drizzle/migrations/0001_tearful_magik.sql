CREATE TABLE "error_log" (
	"id" text PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"meta" jsonb,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "error_log_level_idx" ON "error_log" USING btree ("level");--> statement-breakpoint
CREATE INDEX "error_log_at_idx" ON "error_log" USING btree ("at");