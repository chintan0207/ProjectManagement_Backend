import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";

// ➤ Create new subtask
export const createSubTask = asyncHandler(async (req, res) => {
  res.status(201).json(new ApiResponse(201, {}, "Subtask created"));
});

// ➤ Get all subtasks for a task
export const getSubTasksByTaskId = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Subtasks fetched for task"));
});

// ➤ Update subtask (title, isCompleted)
export const updateSubTask = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Subtask updated"));
});

// ➤ Soft delete subtask
export const softDeleteSubTask = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Subtask soft deleted"));
});

// ➤ Restore subtask
export const restoreSubTask = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Subtask restored"));
});

// ➤ Get all deleted subtasks (admin only)
export const getDeletedSubTasks = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Deleted subtasks fetched"));
});
