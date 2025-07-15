import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";

// ➤ Get current user's activity logs
export const getUserActivityLogs = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "User activity logs fetched"));
});

// ➤ Get organization-specific activity logs
export const getOrganizationActivityLogs = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Organization activity logs fetched"));
});

// ➤ Get project-specific activity logs
export const getProjectActivityLogs = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Project activity logs fetched"));
});

// ➤ Soft delete an activity log
export const softDeleteActivityLog = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Activity log soft deleted"));
});

// ➤ Restore a soft-deleted activity log
export const restoreActivityLog = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Activity log restored"));
});
