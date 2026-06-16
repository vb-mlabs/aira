CREATE TYPE "public"."followup_outcome" AS ENUM('called', 'voicemail', 'no_answer', 'refused', 'paid', 'reschedule');--> statement-breakpoint
CREATE TABLE "subscription_followup" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"actor_id" text,
	"outcome" "followup_outcome" NOT NULL,
	"note" text,
	"scheduled_next" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_followup" ADD CONSTRAINT "subscription_followup_subscription_id_business_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."business_subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_followup" ADD CONSTRAINT "subscription_followup_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sf_subscription_created_idx" ON "subscription_followup" USING btree ("subscription_id","created_at");--> statement-breakpoint
CREATE INDEX "sf_scheduled_next_idx" ON "subscription_followup" USING btree ("scheduled_next") WHERE "subscription_followup"."scheduled_next" IS NOT NULL;