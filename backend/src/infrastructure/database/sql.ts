import pg from "pg";
import { env } from "../../config/env.js";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
  console.error("Unexpected idle client error", err);
});

export async function checkDbConnection(): Promise<void> {
  const { rows } = await pool.query<{ now: Date }>("SELECT now()");
  console.log(`Database connected at ${rows[0]?.now.toISOString()}`);
}