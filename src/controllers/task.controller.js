import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";

// ➤ Create a new task
export const createTask = asyncHandler(async (req, res) => {
  res.status(201).json(new ApiResponse(201, {}, "Task created"));
});

// ➤ Get all tasks in a project
export const getTasksByProject = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Tasks fetched for project"));
});

// ➤ Get a single task by ID
export const getTaskById = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Task fetched"));
});

// ➤ Update a task
export const updateTask = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Task updated"));
});

// ➤ Delete a task (soft delete)
export const deleteTask = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Task deleted"));
});

// ➤ Restore a soft-deleted task
export const restoreTask = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Task restored"));
});
