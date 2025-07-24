import mongoose from "mongoose";
import { Task } from "../models/task.model.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { logActivity } from "../utils/log-activity.js";

export const createTask = asyncHandler(async (req, res) => {
  const { project, title, description, assignedTo, dueDate, priority, status } = req.body;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(project)) {
    throw new ApiError(400, "Invalid project ID");
  }

  let parsedDueDate = dueDate ? new Date(dueDate) : undefined;
  if (parsedDueDate && isNaN(parsedDueDate.getTime())) {
    throw new ApiError(400, "Invalid due date format");
  }

  const attachments = (req.files || []).map((file) => ({
    url: file.path,
    mimetype: file.mimetype,
    size: file.size,
  }));

  const task = await Task.create({
    project,
    title,
    description,
    assignedTo,
    assignedBy: userId,
    dueDate: parsedDueDate,
    priority,
    status,
    attachments,
  });

  await logActivity({
    userId,
    action: "create_task",
    projectId: project,
    metadata: { title: task.title },
  });

  res.status(201).json(new ApiResponse(201, { result: task }, "Task created"));
});

export const getTasksByProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  let {
    page = 1,
    limit = 10,
    sortOrder = "desc",
    sortField = "createdAt",
    search = "",
  } = req.query;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Invalid project ID");
  }

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const skip = (pageNumber - 1) * limitNumber;
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const matchStage = {
    project: new mongoose.Types.ObjectId(projectId),
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
        localField: "assignedTo",
        foreignField: "_id",
        as: "assignedToUser",
      },
    },
    {
      $unwind: {
        path: "$assignedToUser",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        title: 1,
        description: 1,
        dueDate: 1,
        priority: 1,
        status: 1,
        attachments: 1,
        createdAt: 1,
        updatedAt: 1,
        "assignedToUser.fullname": 1,
        "assignedToUser.email": 1,
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
                $ceil: { $divide: ["$total", limitNumber] },
              },
            },
          },
        ],
        data: [{ $skip: skip }, { $limit: limitNumber }],
      },
    },
  ];

  const result = await Task.aggregate(pipeline);

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
        { tasks: data, ...paginationData },
        data.length ? "Tasks fetched successfully" : "No tasks found",
      ),
    );
});

export const getTaskById = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  const task = await Task.findOne({ _id: taskId, isDeleted: false })
    .populate("assignedTo", "fullname email")
    .populate("assignedBy", "fullname email");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  res.status(200).json(new ApiResponse(200, { result: task }, "Task fetched"));
});

export const updateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  const {
    title,
    description,
    assignedTo,
    dueDate,
    priority,
    status,
    removeAttachmentIds = [], // Array of URLs to remove
  } = req.body;

  const task = await Task.findOne({ _id: taskId, isDeleted: false });
  if (!task) {
    throw new ApiError(404, "Task not found or already deleted");
  }

  let parsedDueDate;
  if (dueDate) {
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) {
      throw new ApiError(400, "Invalid due date format");
    }
    parsedDueDate = new Date(date.toISOString());
  }

  let remainingAttachments = task.attachments || [];
  if (Array.isArray(removeAttachmentIds) && removeAttachmentIds.length > 0) {
    remainingAttachments = remainingAttachments.filter(
      (att) => !removeAttachmentIds.includes(att.url),
    );
  }

  // Add new attachments
  let newAttachments = [];
  if (req.files && req.files.length > 0) {
    newAttachments = req.files.map((file) => ({
      url: file.path,
      mimetype: file.mimetype,
      size: file.size,
    }));
  }

  const updatedFields = {};
  if (title !== undefined) updatedFields.title = title;
  if (description !== undefined) updatedFields.description = description;
  if (assignedTo !== undefined) updatedFields.assignedTo = assignedTo;
  if (priority !== undefined) updatedFields.priority = priority;
  if (status !== undefined) updatedFields.status = status;
  if (parsedDueDate !== undefined) updatedFields.dueDate = parsedDueDate;
  updatedFields.attachments = [...remainingAttachments, ...newAttachments];

  // Update the task
  const updatedTask = await Task.findByIdAndUpdate(taskId, updatedFields, { new: true });

  await logActivity({
    userId: req.user._id,
    action: "update_task",
    projectId: updatedTask.project,
    metadata: { title: updatedTask.title },
  });

  res.status(200).json(new ApiResponse(200, { result: updatedTask }, "Task updated successfully"));
});

export const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  const task = await Task.findOneAndUpdate(
    { _id: taskId, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() },
    { new: true },
  );

  if (!task) {
    throw new ApiError(404, "Task not found or already deleted");
  }

  await logActivity({
    userId: req.user._id,
    action: "delete_task",
    projectId: task.project,
    metadata: { title: task.title },
  });

  res.status(200).json(new ApiResponse(200, {}, "Task deleted"));
});

export const restoreTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  const task = await Task.findOneAndUpdate(
    { _id: taskId, isDeleted: true },
    { isDeleted: false, deletedAt: null },
    { new: true },
  );

  if (!task) {
    throw new ApiError(404, "Task not found or already restored");
  }

  await logActivity({
    userId: req.user._id,
    action: "restore_task",
    projectId: task.project,
    metadata: { title: task.title },
  });

  res.status(200).json(new ApiResponse(200, {}, "Task restored"));
});
