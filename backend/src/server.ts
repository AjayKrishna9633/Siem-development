import app from "./app.js";
import { env } from "./config/env.js";
import { pool, checkDbConnection } from "./infrastructure/database/sql.js";
import { redisClient } from "./infrastructure/di/services.dependency.js";

await checkDbConnection();

const server = app.listen(env.PORT, () => console.log(`Server running on :${env.PORT}`));

const shutdown = async () => {
  console.log("Shutting down");
  server.close();
  await pool.end();
  await redisClient.quit();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);