import { Queue } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(); // default localhost:6379

export const emailQueue = new Queue("email-queue", { connection });

emailQueue.on("error", (err) => {
  logger.error("Queue error:", err);
});
