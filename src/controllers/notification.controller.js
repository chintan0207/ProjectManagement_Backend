import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";

// ➤ Get all notifications for current user
export const getAllNotifications = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "User notifications fetched"));
});

// ➤ Mark a notification as read
export const markNotificationAsRead = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Notification marked as read"));
});

// ➤ Mark a notification as unread
export const markNotificationAsUnread = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Notification marked as unread"));
});

// ➤ Soft delete a notification
export const softDeleteNotification = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Notification soft deleted"));
});

// ➤ Restore a soft-deleted notification
export const restoreNotification = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Notification restored"));
});
