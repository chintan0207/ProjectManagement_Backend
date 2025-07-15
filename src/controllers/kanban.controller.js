import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";

// 🟢 Boards
export const createKanbanBoard = asyncHandler(async (req, res) => {
  res.status(201).json(new ApiResponse(201, {}, "Kanban board created"));
});

export const getKanbanBoardsByProjectId = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Kanban boards fetched"));
});

export const updateKanbanBoard = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Kanban board updated"));
});

export const deleteKanbanBoard = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Kanban board deleted"));
});

export const restoreKanbanBoard = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Kanban board restored"));
});

// 🟢 Columns
export const createKanbanColumn = asyncHandler(async (req, res) => {
  res.status(201).json(new ApiResponse(201, {}, "Kanban column created"));
});

export const getKanbanColumnsByBoardId = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Columns fetched"));
});

export const updateKanbanColumn = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Column updated"));
});

export const deleteKanbanColumn = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Column deleted"));
});

// 🟢 Cards
export const createKanbanCard = asyncHandler(async (req, res) => {
  res.status(201).json(new ApiResponse(201, {}, "Card created"));
});

export const updateKanbanCard = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Card updated"));
});

export const deleteKanbanCard = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Card deleted"));
});

export const restoreKanbanCard = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Card restored"));
});
