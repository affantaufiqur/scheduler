CREATE TABLE "working_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"day_of_week" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "working_hours_user_day_time_unique" UNIQUE("user_id","day_of_week","start_time","end_time","deleted_at")
);
--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "working_hours_user_id_idx" ON "working_hours" USING btree ("user_id");