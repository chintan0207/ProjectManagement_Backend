import { Worker } from "bullmq";
import Redis from "ioredis";
import { emailVerificationMailgenContent, sendMail } from "../src/utils/mail.js";
import logger from "../src/utils/logger.js";

const connection = new Redis();

const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    logger.info(`Email job : ${job}`);
    const { email, username, verifyUrl } = job.data;
    logger.info(`Email job started: ${job.id}`);

    // Call your actual sendMail function
    await sendMail({
      email,
      subject: "Email Verification",
      mailgenContent: emailVerificationMailgenContent(username, verifyUrl),
    });

    logger.info(`Email job completed: ${job.id}`);
  },
  { connection },
);

// Handle errors properly
emailWorker.on("failed", (job, err) => {
  logger.error(`Email job failed: ${job.id}`, err);
});

emailWorker.on("error", (err) => {
  logger.error("Worker error:", err);
});

emailWorker.on("completed", (job) => {
  logger.info(`Email job completed: ${job.id}`);
});

export default emailWorker;
  