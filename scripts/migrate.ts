import postgres from "postgres";
import { migrate } from "../src/server/migrate";

// Applies pending migrations to DATABASE_URL (use the same value as the app).
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const sql = postgres(url, { prepare: false, max: 1, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require" });
try {
  const applied = await migrate(sql);
  console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Database is up to date.");
} finally {
  await sql.end();
}
