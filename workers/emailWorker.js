import { Worker } from "bullmq";
import { redisConnection } from "../queues/redisConnection.js";
import { QueueMap } from "../queues/emailQueue.js";
import logger from "../src/utils/logger.js";
import {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  organizationInviteMailgenContent,
  sendMail,
} from "../src/utils/mail.js";

export const emailWorker = new Worker(
  QueueMap.EMAIL_QUEUE,
  async (job) => {
    const { type, email, username, verificationLink, resetLink, inviteLink, orgName } = job.data;

    logger.info(`📧 Processing ${type} email for ${email}`);

    try {
      if (type === "email-verification") {
        await sendMail({
          email,
          subject: "Email Verification",
          mailgenContent: emailVerificationMailgenContent(username, verificationLink),
        });

        logger.info(`✅ Verification email sent to ${email}`);
      } else if (type === "forgot-password") {
        await sendMail({
          email,
          subject: "Forgot Password",
          mailgenContent: forgotPasswordMailgenContent(username, resetLink),
        });

        logger.info(`✅ Forgot password email sent to ${email}`);
      } else if (type === "organization-invite") {
        await sendMail({
          email,
          subject: "You're invited to join an organization",
          mailgenContent: organizationInviteMailgenContent(inviteLink, orgName), // Can reuse `verificationLink` as `inviteLink`
        });

        logger.info(`✅ Organization invite sent to ${email}`);
      } else {
        logger.warn(`⚠️ Unknown email type: ${type}`);
        throw new Error("Unknown email job type");
      }
    } catch (error) {
      logger.error(`❌ Failed to send ${type} email to ${email}: ${error.message}`);
      throw new Error("Email sending failed");
    }
  },
  { connection: redisConnection },
);

// Optional: Worker event logging
emailWorker.on("completed", (job) => {
  logger.info(`🎉 Email job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  logger.error(`💥 Email job ${job.id} failed: ${err.message}`);
});

emailWorker.on("error", (err) => {
  logger.error(`💥 Email worker error: ${err.message}`);
});
