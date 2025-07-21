import { ActivityLog } from "../models/activityLog.model.js";

export const logActivity = async ({
  userId,
  action,
  organizationId = null,
  projectId = null,
  metadata = {},
}) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      organizationId,
      projectId,
      metadata,
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
};
