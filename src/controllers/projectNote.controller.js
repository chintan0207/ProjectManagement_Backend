import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";

// ➤ Create new project note
export const createProjectNote = asyncHandler(async (req, res) => {
  res.status(201).json(new ApiResponse(201, {}, "Project note created"));
});

// ➤ Get all notes under a project
export const getProjectNotes = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Project notes fetched"));
});

// ➤ Get single note by ID
export const getProjectNoteById = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project note fetched by ID"));
});

// ➤ Update project note
export const updateProjectNote = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project note updated"));
});

// ➤ Soft delete project note
export const softDeleteProjectNote = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project note soft deleted"));
});

// ➤ Restore soft-deleted project note
export const restoreProjectNote = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project note restored"));
});

// ➤ List soft-deleted project notes (admin only)
export const getDeletedProjectNotes = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Deleted project notes fetched"));
});
