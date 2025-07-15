import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";

// ➤ Get all invite tokens (admin view)
export const getAllInviteTokens = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "All invite tokens fetched"));
});

// ➤ Create and send an invite token
export const createInviteToken = asyncHandler(async (req, res) => {
  res.status(201).json(new ApiResponse(201, {}, "Invite token created and sent"));
});

// ➤ Get invite details by token
export const getInviteDetails = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Invite token details retrieved"));
});

// ➤ Accept invite using token
export const acceptInviteToken = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Invite accepted successfully"));
});

// ➤ Soft delete invite token
export const softDeleteInviteToken = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Invite token deleted"));
});
