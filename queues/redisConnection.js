import { Redis } from "ioredis";
import { config } from "dotenv";
import logger from "../src/utils/logger.js";

config();

export const redisConnection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redisConnection.on("error", (err) => {
  logger.error("Redis error:", err);
});
