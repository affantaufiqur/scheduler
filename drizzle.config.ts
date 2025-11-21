import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const URL = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/postgres";
const HOST = process.env.DATABASE_HOST || "localhost";
const PORT = Number(process.env.DATABASE_PORT!) || 5432;
const USER = process.env.DATABASE_USER || "postgres";
const PASSWORD = process.env.DATABASE_PASSWORD || "password";
const DATABASE = process.env.DATABASE_NAME || "postgres";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/configs/db/schema/",
  dialect: "postgresql",
  dbCredentials: {
    url: URL,
    host: HOST,
    port: PORT,
    user: USER,
    password: PASSWORD,
    database: DATABASE,
    ssl: false,
  },
});
