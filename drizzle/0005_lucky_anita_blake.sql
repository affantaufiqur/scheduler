ALTER TABLE "bookings" ADD COLUMN "status" text DEFAULT 'scheduled' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "attendant_timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");