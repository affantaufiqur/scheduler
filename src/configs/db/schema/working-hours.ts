import { pgTable, text, time, boolean, timestamp, index, unique } from "drizzle-orm/pg-core";
import { userTable } from "./users";
import { ulid } from "ulid";

export const workingHoursTable = pgTable(
  "working_hours",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    dayOfWeek: text("day_of_week").notNull(), // 0-6 where 0 = Sunday, 1 = Monday, etc.
    startTime: time("start_time").notNull(), // HH:mm format
    endTime: time("end_time").notNull(), // HH:mm format
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    userIdIndex: index("working_hours_user_id_idx").on(table.userId),
    userDayTimeUnique: unique("working_hours_user_day_time_unique").on(
      table.userId,
      table.dayOfWeek,
      table.startTime,
      table.endTime,
      table.deletedAt,
    ),
  }),
);

export type WorkingHours = typeof workingHoursTable.$inferSelect;
export type NewWorkingHours = typeof workingHoursTable.$inferInsert;
