import { pgTable, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { userTable } from "./users";
import { ulid } from "ulid";

export const blackoutDatesTable = pgTable(
  "blackout_dates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    date: timestamp("date", { withTimezone: true }).notNull(), // The specific date that is blocked
    reason: text("reason"), // Optional reason for the blackout (e.g., holiday, personal day)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    userIdIndex: index("blackout_dates_user_id_idx").on(table.userId),
    userDateUnique: unique("blackout_dates_user_date_unique").on(
      table.userId,
      table.date,
      table.deletedAt
    ),
  }),
);

export type BlackoutDates = typeof blackoutDatesTable.$inferSelect;
export type NewBlackoutDates = typeof blackoutDatesTable.$inferInsert;
