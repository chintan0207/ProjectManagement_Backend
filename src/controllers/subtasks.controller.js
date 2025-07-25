import mongoose from "mongoose";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { SubTask } from "../models/subtask.model.js";
import { logActivity } from "../utils/log-activity.js";
import { ApiResponse } from "../utils/api-response.js";

export const createSubTask = asyncHandler(async (req, res) => {
  const { title } = req.body;
  const { taskId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  if (!title || title.trim() === "") {
    throw new ApiError(400, "Subtask title is required");
  }

  const subTask = await SubTask.create({
    taskId,
    title: title.trim(),
    createdBy: userId,
  });

  await logActivity({
    userId,
    action: "create_subtask",
    projectId: null, // You can pass parent task.project if needed
    metadata: { title: subTask.title },
  });

  res.status(201).json(new ApiResponse(201, { result: subTask }, "Subtask created"));
});

export const getSubTasksByTaskId = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  let { page, limit, sortOrder = "desc", sortField = "createdAt", search = "" } = req.query;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const usePagination = page !== undefined && limit !== undefined;
  const pageNumber = usePagination ? parseInt(page) : 1;
  const limitNumber = usePagination ? parseInt(limit) : 0;
  const skip = (pageNumber - 1) * limitNumber;

  const matchStage = {
    taskId: new mongoose.Types.ObjectId(taskId),
    isDeleted: false,
    ...(search.trim() && {
      title: { $regex: search, $options: "i" },
    }),
  };

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdByUser",
      },
    },
    {
      $unwind: {
        path: "$createdByUser",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        title: 1,
        isCompleted: 1,
        createdAt: 1,
        updatedAt: 1,
        "createdByUser.fullname": 1,
        "createdByUser.email": 1,
      },
    },
    {
      $sort: {
        [sortField]: sortDirection,
      },
    },
    {
      $facet: {
        metaData: [
          { $count: "total" },
          {
            $addFields: {
              page: pageNumber,
              limit: limitNumber,
              totalPages: {
                $ceil: { $divide: ["$total", limitNumber || 1] },
              },
            },
          },
        ],
        data: usePagination ? [{ $skip: skip }, { $limit: limitNumber }] : [],
      },
    },
  ];

  const result = await SubTask.aggregate(pipeline);

  const { metaData = [], data = [] } = result[0] || {};
  const paginationData = metaData[0] || {
    total: 0,
    page: pageNumber,
    limit: limitNumber,
    totalPages: 0,
  };

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { subtasks: data, ...paginationData },
        data.length ? "Subtasks fetched successfully" : "No subtasks found",
      ),
    );
});

export const updateSubTask = asyncHandler(async (req, res) => {
  const { subTaskId } = req.params;
  const { title, isCompleted } = req.body;

  if (!mongoose.Types.ObjectId.isValid(subTaskId)) {
    throw new ApiError(400, "Invalid subtask ID");
  }

  const subTask = await SubTask.findOne({ _id: subTaskId, isDeleted: false });
  if (!subTask) {
    throw new ApiError(404, "Subtask not found or already deleted");
  }

  if (title !== undefined) subTask.title = title.trim();
  if (isCompleted !== undefined) subTask.isCompleted = isCompleted;

  await subTask.save();

  await logActivity({
    userId: req.user._id,
    action: "update_subtask",
    projectId: null,
    metadata: { title: subTask.title },
  });

  res.status(200).json(new ApiResponse(200, { result: subTask }, "Subtask updated"));
});

export const getSubTaskById = asyncHandler(async (req, res) => {
  const { subTaskId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(subTaskId)) {
    throw new ApiError(400, "Invalid subtask ID");
  }

  const subTask = await SubTask.findOne({ _id: subTaskId, isDeleted: false });

  if (!subTask) {
    throw new ApiError(404, "Subtask not found or already deleted");
  }
  res.status(200).json(new ApiResponse(200, { result: subTask }, "Subtask fetched"));
});

export const softDeleteSubTask = asyncHandler(async (req, res) => {
  const { subTaskId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(subTaskId)) {
    throw new ApiError(400, "Invalid subtask ID");
  }

  const subTask = await SubTask.findOneAndUpdate(
    { _id: subTaskId, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() },
    { new: true },
  );

  if (!subTask) {
    throw new ApiError(404, "Subtask not found or already deleted");
  }

  await logActivity({
    userId: req.user._id,
    action: "delete_subtask",
    projectId: null,
    metadata: { title: subTask.title },
  });

  res.status(200).json(new ApiResponse(200, {}, "Subtask deleted"));
});

export const restoreSubTask = asyncHandler(async (req, res) => {
  const { subTaskId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(subTaskId)) {
    throw new ApiError(400, "Invalid subtask ID");
  }

  const subTask = await SubTask.findOneAndUpdate(
    { _id: subTaskId, isDeleted: true },
    { isDeleted: false, deletedAt: null },
    { new: true },
  );

  if (!subTask) {
    throw new ApiError(404, "Subtask not found or already restored");
  }

  await logActivity({
    userId: req.user._id,
    action: "restore_subtask",
    projectId: null,
    metadata: { title: subTask.title },
  });

  res.status(200).json(new ApiResponse(200, {}, "Subtask restored"));
});

export const getDeletedSubTasks = asyncHandler(async (req, res) => {
  const deletedSubtasks = await SubTask.find({ isDeleted: true }).sort({ deletedAt: -1 });

  res
    .status(200)
    .json(new ApiResponse(200, { result: deletedSubtasks }, "Deleted subtasks fetched"));
});
