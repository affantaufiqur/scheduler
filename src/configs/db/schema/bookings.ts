import { pgTable, text, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { userTable } from "./users";
import { ulid } from "ulid";

export const bookingsTable = pgTable(
  "bookings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    organizerId: text("organizer_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    attendantName: text("attendant_name").notNull(),
    attendantEmail: text("attendant_email").notNull(),
    metadata: jsonb("metadata"), // For additional attendees
    title: text("title").notNull(),
    description: text("description"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    organizerIdIndex: index("bookings_organizer_id_idx").on(table.organizerId),
    organizerStartTimeIndex: index("bookings_organizer_start_time_idx").on(
      table.organizerId,
      table.startTime,
    ),
  }),
);

export type Booking = typeof bookingsTable.$inferSelect;
export type NewBooking = typeof bookingsTable.$inferInsert;
