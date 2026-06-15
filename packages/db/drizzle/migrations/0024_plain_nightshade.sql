ALTER TABLE "user" ADD COLUMN "email_on_message_received" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email_on_post_interest" boolean DEFAULT true NOT NULL;