import { drizzle } from "drizzle-orm/node-postgres";

const databaseUrl =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";

const db = drizzle(databaseUrl);

export default db;
