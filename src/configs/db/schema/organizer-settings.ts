import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { userTable } from "./users";
import { ulid } from "ulid";

export const organizerSettingsTable = pgTable(
  "organizer_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" })
      .unique(),
    workingTimezone: text("working_timezone").notNull().default("UTC"),
    defaultMeetingDuration: integer("default_meeting_duration").notNull().default(30), // minutes
    preBookingBuffer: integer("pre_booking_buffer").notNull().default(0), // minutes
    postBookingBuffer: integer("post_booking_buffer").notNull().default(0), // minutes
    minBookingNotice: integer("min_booking_notice").notNull().default(2), // hours
    maxBookingAdvance: integer("max_booking_advance").notNull().default(14), // days
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    userIdIndex: index("organizer_settings_user_id_idx").on(table.userId),
  }),
);

export type OrganizerSettings = typeof organizerSettingsTable.$inferSelect;
export type NewOrganizerSettings = typeof organizerSettingsTable.$inferInsert;
