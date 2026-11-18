import pg from "pg";
import { migrate } from "../src/migrate.js";

const URL = process.env.TEST_DATABASE_URL ?? "postgres://roofline:roofline@localhost:5432/roofline_test";

/** Fresh schema in the dedicated test database only (never the dev database). */
export async function freshDb(): Promise<pg.Pool> {
  if (!/roofline_test/.test(URL)) throw new Error("refusing to reset a non-test database");
  const pool = new pg.Pool({ connectionString: URL });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migrate(pool);
  return pool;
}
