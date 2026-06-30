CREATE TABLE "business_favorite" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_favorite" ADD CONSTRAINT "business_favorite_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_favorite" ADD CONSTRAINT "business_favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_favorite_uq" ON "business_favorite" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE INDEX "business_favorite_user_idx" ON "business_favorite" USING btree ("user_id","created_at");