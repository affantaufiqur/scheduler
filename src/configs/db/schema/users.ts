import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { ulid } from "ulid";

export const userTable = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  username: varchar("username").notNull().unique(),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  timezone: varchar("timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
