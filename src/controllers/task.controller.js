import mongoose from "mongoose";
import { ProjectMember } from "../models/projectmember.models.js";
import { Task } from "../models/task.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { SubTask } from "../models/subtask.models.js";
import { ApiResponse } from "../utils/api-response.js";
import fs from "fs";

export const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const { title, email, description } = req.body;
  const userId = req.user._id;

  const assignedToUser = await User.findOne({ email });
  if (!assignedToUser) {
    throw new ApiError(404, "Assigned user not found ");
  }

  const isProjectMember = await ProjectMember.findOne({
    user: assignedToUser._id,
    project: projectId,
  });

  if (!isProjectMember) {
    throw new ApiError(400, "Assigned User not a member of this project");
  }

  const task = await Task.create({
    title,
    description,
    project: projectId,
    assignedTo: assignedToUser._id,
    assignedBy: userId,
  });

  if (!task) {
    throw new ApiError(500, "Error while creating task");
  }

  let attachments = [];
  if (req.files && Array.isArray(req.files)) {
    for (const file of req.files) {
      const result = await uploadOnCloudinary(file.path);
      attachments.push({
        url: result?.secure_url,
        mimetype: file.mimetype,
        size: file.size,
      });
    }
  } else {
    console.log("No files uploaded or req.files is not an array");
  }
  task.attachments = attachments;
  await task.save();

  res.status(200).json(new ApiResponse(200, task, "Task Created Successfully"));
});

export const getTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const tasks = await Task.aggregate([
    {
      $match: { project: new mongoose.Types.ObjectId(projectId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "assignedTo",
        foreignField: "_id",
        as: "assignedTo",
      },
    },
    {
      $unwind: "$assignedTo",
    },
    {
      $lookup: {
        from: "users",
        localField: "assignedBy",
        foreignField: "_id",
        as: "assignedBy",
      },
    },
    {
      $unwind: "$assignedBy",
    },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        attachments: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        assignedTo: {
          _id: "$assignedTo._id",
          username: "$assignedTo.username",
          fullname: "$assignedTo.fullname",
          avatar: "$assignedTo.avatar",
        },
        assignedBy: {
          _id: "$assignedBy._id",
          username: "$assignedBy.username",
          fullname: "$assignedBy.fullname",
          avatar: "$assignedBy.avatar",
        },
      },
    },
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, tasks, tasks.length ? "Task fetched Successfully" : "No Task Available"));
});

export const getTaskById = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const existingTask = await Task.findById(taskId);
  if (!existingTask) {
    throw new ApiError("Task not found", 404);
  }

  const task = await Task.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(taskId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "assignedTo",
        foreignField: "_id",
        as: "assignedTo",
      },
    },
    {
      $unwind: "$assignedTo",
    },
    {
      $lookup: {
        from: "users",
        localField: "assignedBy",
        foreignField: "_id",
        as: "assignedBy",
      },
    },
    {
      $unwind: "$assignedBy",
    },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        attachments: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        assignedTo: {
          _id: "$assignedTo._id",
          username: "$assignedTo.username",
          fullname: "$assignedTo.fullname",
          avatar: "$assignedTo.avatar",
        },
        assignedBy: {
          _id: "$assignedBy._id",
          username: "$assignedBy.username",
          fullname: "$assignedBy.fullname",
          avatar: "$assignedBy.avatar",
        },
      },
    },
  ]);

  if (!task) {
    throw new ApiError("Task not found", 404);
  }

  res.status(200).json(new ApiResponse(200, task, "Task fetched Successfully"));
});

export const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const existingTask = await Task.findById(taskId);
  if (!existingTask) {
    throw new ApiError("Task not found", 404);
  }

  const clientSession = await mongoose.startSession();
  clientSession.startTransaction();

  try {
    await Task.findByIdAndDelete(taskId);
    await SubTask.deleteMany({ task: taskId });

    clientSession.commitTransaction();
  } catch (error) {
    clientSession.abortTransaction();
    console.error(`Error while deleting the task:${error}`);
    throw new ApiError(`Error while deleting the task:${error.message}`, 400);
  } finally {
    clientSession.endSession();
  }

  res.status(200).json(new ApiResponse(200, null, "Task Deleted Successfully"));
});

export const updateTask = asyncHandler(async (req, res) => {
  const { taskId, projectId } = req.params;
  const { title, description, email } = req.body;

  const updatePayload = {};

  if (title !== undefined) updatePayload.title = title;

  if (description !== "") updatePayload.description = description;

  if (email !== undefined) {
    const assignedToUser = await User.findOne({ email });

    if (!assignedToUser) {
      throw new ApiError("Assigned User not found", 400);
    }

    const isProjectMember = await ProjectMember.findOne({
      user: assignedToUser._id,
      project: projectId,
    });

    if (!isProjectMember) {
      throw new ApiError("Assigned User not a member of this project", 400);
    }
    updatePayload.assignedTo = assignedToUser._id;
  }

  const updateTask = await Task.findByIdAndUpdate(taskId, updatePayload, { new: true });
  if (!updateTask) {
    throw new ApiError("Task not found", 404);
  }

  res.status(200).json(new ApiResponse(200, updateTask, "Task Updated Successfully"));
});

export const createSubTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;
  const userId = req.user._id;

  const existingTask = await Task.findById(taskId);

  if (!existingTask) {
    throw new ApiError("Task not found", 404);
  }

  const subTask = await SubTask.create({
    title,
    task: taskId,
    createdBy: userId,
  });

  if (!subTask) {
    throw new ApiError("Error while creating subtask", 500);
  }

  res.status(200).json(new ApiResponse(200, subTask, "Subtask Created Successfully"));
});

export const updateSubTask = asyncHandler(async (req, res) => {
  const { title, isCompleted } = req.body;
  const { subTaskId } = req.params;

  const updatePayload = {};

  if (title !== undefined) updatePayload.title = title;
  if (isCompleted !== undefined) updatePayload.isCompleted = isCompleted;

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiError("At least one field is required to update", 400);
  }

  const updateSubTask = await SubTask.findByIdAndUpdate(subTaskId, updatePayload, { new: true }).select(
    "title isCompleted updatedAt",
  );

  if (!updateSubTask) {
    throw new ApiError("Failed to update the subtask", 500);
  }

  res.status(200).json(new ApiResponse(200, updateSubTask, "SubTask updated successfully"));
});

export const getSubTasks = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const subTasks = await SubTask.aggregate([
    {
      $match: { task: new mongoose.Types.ObjectId(taskId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    {
      $unwind: "$createdBy",
    },
    {
      $project: {
        _id: 1,
        title: 1,
        isCompleted: 1,
        createdAt: 1,
        updatedAt: 1,
        createdBy: {
          _id: "$createdBy._id",
          username: "$createdBy.username",
          fullname: "$createdBy.fullname",
          avatar: "$createdBy.avatar",
        },
      },
    },
  ]);
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subTasks,
        subTasks.length ? "Subtasks fetched successfully" : "No Subtask Available",
      ),
    );
});

export const getSubTaskById = asyncHandler(async (req, res) => {
  const { subTaskId } = req.params;

  const subTask = await SubTask.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(subTaskId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    {
      $unwind: "$createdBy",
    },
    {
      $project: {
        _id: 1,
        title: 1,
        isCompleted: 1,
        createdAt: 1,
        updatedAt: 1,
        createdBy: {
          _id: "$createdBy._id",
          username: "$createdBy.username",
          fullname: "$createdBy.fullname",
          avatar: "$createdBy.avatar",
        },
      },
    },
  ]);

  if (!subTask) {
    throw new ApiError("Subtask not found", 404);
  }

  res.status(200).json(new ApiResponse(200, subTask, "Subtask fetched successfully"));
});

export const deleteSubTask = asyncHandler(async (req, res) => {
  const { subTaskId } = req.params;

  const subTask = await SubTask.findByIdAndDelete(subTaskId);

  if (!subTask) {
    throw new ApiError("Subtask not found", 404);
  }
  res.status(200).json(new ApiResponse(200, null, "Subtask deleted successfully"));
});

export const addAttachments = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const attachments = req.files;

  const existingTask = await Task.findById(taskId);
  if (!existingTask) {
    throw new ApiError("Task not found", 404);
  }

  if (!attachments || attachments.length === 0) {
    throw new ApiError("Please add attachments", 400);
  }

  const existingAttachments = task.attachments?.length || 0;
  const newAttachments = attachments.length;

  if (existingAttachments + newAttachments > env.MAX_ATTACHMENTS) {
    attachments.forEach((file) => fs.unlinkSync(file.path));
    throw new ApiError(
      `Attachment limit exceeded. You can upload only ${env.MAX_ATTACHMENTS - existingAttachments} more.`,
      400,
    );
  }

  const addAttachmentsOnly = await Promise.all(
    attachments.map(async (file) => {
      const result = await uploadOnCloudinary(file.path);
      return {
        url: result.secure_url,
        mimetype: file.mimetype,
        size: file.size,
      };
    }),
  );

  existingTask.attachments.push(...addAttachmentsOnly);
  await existingTask.save();

  res.status(200).json(new ApiResponse(200, task.attachments, "Attachments added successfully"));
});

export const deleteAttachments = asyncHandler(async (req, res) => {
  const { aid } = req.params;

  const result = await Task.updateOne(
    { "attachments._id": aid },
    { $pull: { attachments: { _id: aid } } },
  );

  if (result.modifiedCount === 0) {
    throw new ApiError("Attachment not found", 400);
  }
  res.status(200).json(new ApiResponse(200, null, "Attachment Deleted Successfully"));
});
