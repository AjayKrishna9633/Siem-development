import app from "./app.js";
import { env } from "./config/env.js";
import { pool, checkDbConnection } from "./infrasturcture/database/sql.js";

await checkDbConnection();

const server = app.listen(env.PORT, () => console.log(`Server running on :${env.PORT}`));

const shutdown = async () => {
  server.close();
  await pool.end();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);