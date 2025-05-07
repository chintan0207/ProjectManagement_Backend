import { ProjectMember } from "../models/projectmember.models.js";
import { Task } from "../models/task.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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

export const getTasks = asyncHandler(async (req, res) => {});

export const getTaskById = asyncHandler(async (req, res) => {});

export const deleteTask = asyncHandler(async (req, res) => {});

export const updateTask = asyncHandler(async (req, res) => {});

export const createSubTask = asyncHandler(async (req, res) => {});

export const getSubTasks = asyncHandler(async (req, res) => {});

export const getSubTaskById = asyncHandler(async (req, res) => {});

export const deleteSubTask = asyncHandler(async (req, res) => {});

export const updateSubTask = asyncHandler(async (req, res) => {});

export const markAsCompleted = asyncHandler(async (req, res) => {});
