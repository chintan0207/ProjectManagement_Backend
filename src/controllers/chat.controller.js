import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";

// ➤ Create a new chat room
export const createChatRoom = asyncHandler(async (req, res) => {
  res.status(201).json(new ApiResponse(201, {}, "Chat room created"));
});

// ➤ Get chat room by project ID
export const getChatRoomByProjectId = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Chat room fetched"));
});

// ➤ Get chat room with messages
export const getChatRoomWithMessages = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Chat room and messages fetched"));
});

// ➤ Soft delete chat room
export const softDeleteChatRoom = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Chat room deleted"));
});

// ➤ Send a message
export const sendMessage = asyncHandler(async (req, res) => {
  res.status(201).json(new ApiResponse(201, {}, "Message sent"));
});

// ➤ Get all messages in a chat room
export const getMessagesInRoom = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Messages fetched"));
});

// ➤ Mark a message as read
export const markMessageAsRead = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Message marked as read"));
});

// ➤ Soft delete a message
export const softDeleteMessage = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Message deleted"));
});

// ➤ Restore a deleted message
export const restoreDeletedMessage = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Message restored"));
});
