import { Queue } from "bullmq";
import { redisConnection } from "./redisConnection.js";
import logger from "../src/utils/logger.js";

export const QueueMap = {
  EMAIL_QUEUE: "EMAIL_QUEUE",
  NOTIFICATION_QUEUE: "NOTIFICATION_QUEUE",
};

export const emailQueue = new Queue(QueueMap.EMAIL_QUEUE, {
  connection: redisConnection,
});

export const notificationQueue = new Queue(QueueMap.NOTIFICATION_QUEUE, {
  connection: redisConnection,
});

emailQueue.on("error", (err) => {
  logger.error("Queue error:", err);
});

notificationQueue.on("error", (err) => {
  logger.error("Queue error:", err);
});
