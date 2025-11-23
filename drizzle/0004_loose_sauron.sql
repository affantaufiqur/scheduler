CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"organizer_id" text NOT NULL,
	"attendant_name" text NOT NULL,
	"attendant_email" text NOT NULL,
	"metadata" jsonb,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_organizer_id_idx" ON "bookings" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "bookings_organizer_start_time_idx" ON "bookings" USING btree ("organizer_id","start_time");