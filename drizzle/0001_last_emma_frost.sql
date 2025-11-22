CREATE TABLE "organizer_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"working_timezone" text DEFAULT 'UTC' NOT NULL,
	"default_meeting_duration" integer DEFAULT 30 NOT NULL,
	"pre_booking_buffer" integer DEFAULT 0 NOT NULL,
	"post_booking_buffer" integer DEFAULT 0 NOT NULL,
	"min_booking_notice" integer DEFAULT 2 NOT NULL,
	"max_booking_advance" integer DEFAULT 14 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organizer_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "organizer_settings" ADD CONSTRAINT "organizer_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organizer_settings_user_id_idx" ON "organizer_settings" USING btree ("user_id");