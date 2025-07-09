import mongoose from "mongoose";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { checkAdmin, checkProjectMember } from "../utils/checkRole.js";
import { UserRoleEnum } from "../utils/constant.js";

const getProjects = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  let {
    page = 1,
    limit = 10,
    sortOrder = "desc",
    sortField = "createdAt",
    search = "",
  } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const skip = (pageNumber - 1) * limitNumber;
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const memberProjects = await ProjectMember.find({ user: userId }).select("project");
  const projectsIds = memberProjects.map((ele) => ele.project);

  const pipeline = [
    {
      $match: {
        $or: [{ _id: { $in: projectsIds } }, { createdBy: userId }],
      },
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

    // Apply search AFTER "createdBy" fields are available
    ...(search.trim()
      ? [
          {
            $match: {
              $or: [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { "createdBy.username": { $regex: search, $options: "i" } },
                { "createdBy.fullname": { $regex: search, $options: "i" } },
                { "createdBy.email": { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
      : []),

    {
      $lookup: {
        from: "projectmembers",
        localField: "_id",
        foreignField: "project",
        as: "members",
      },
    },

    {
      $addFields: {
        totalMembers: { $size: "$members" },
      },
    },

    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        "createdBy.avatar": 1,
        "createdBy.username": 1,
        "createdBy.fullname": 1,
        "createdBy.email": 1,
        totalMembers: 1,
        isDeleted: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },

    {
      $sort: {
        [sortField]: sortDirection,
      },
    },

    // Pagination and metadata
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

  const stringSortFields = [
    "name",
    "description",
    "createdBy.username",
    "createdBy.fullname",
    "createdBy.email",
  ];

  const resultData = stringSortFields.includes(sortField)
    ? await Project.aggregate(pipeline).collation({ locale: "en", strength: 2 })
    : await Project.aggregate(pipeline);

  const { metaData = [], data: projects = [] } = resultData[0] || {};

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
        { projects, ...paginationData },
        projects.length ? "Projects fetched successfully" : "No projects found",
      ),
    );
});

const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(projectId),
      },
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
      $unwind: {
        path: "$createdBy",
        preserveNullAndEmptyArrays: true, // Added here
      },
    },
    {
      $lookup: {
        from: "projectmembers",
        localField: "_id",
        foreignField: "project",
        as: "members",
      },
    },
    {
      $addFields: {
        totalMembers: { $size: "$members" },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        "createdBy.avatar": 1,
        "createdBy.username": 1,
        "createdBy.fullname": 1,
        "createdBy.email": 1,
        totalMembers: 1,
        isDeleted: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  res.status(200).json(new ApiResponse(200, project, "Project get successfully"));
});

const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user._id;

  if (!name || !description) {
    throw new ApiError(400, "Name and description are required");
  }

  const project = await Project.findOne({ name });
  if (project) {
    throw new ApiError(400, "Project with this name already exists");
  }

  const clientSession = await mongoose.startSession();
  clientSession.startTransaction();
  let newProject;
  try {
    newProject = await Project.create(
      [
        {
          name,
          description,
          createdBy: userId,
        },
      ],
      { session: clientSession },
    );

    const projectMember = await ProjectMember.create(
      [
        {
          role: UserRoleEnum.ADMIN,
          project: newProject[0]._id,
          user: userId,
        },
      ],
      { session: clientSession },
    );

    if (!projectMember[0]) {
      throw new Error("Failed to assign the creator as a member");
    }

    await clientSession.commitTransaction();
  } catch (error) {
    await clientSession.abortTransaction();
    if (error.code === 11000) {
      throw new ApiError("Project name must be unique per user", 400);
    }
    throw new ApiError(`Error while creating project: ${error.message}`, 500);
  } finally {
    await clientSession.endSession();
  }

  res.status(200).json(new ApiResponse(200, newProject[0], "Project created successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { projectId } = req.params;

  if (!name || !description) {
    throw new ApiError("Name and description are required");
  }

  const updatedProject = await Project.findByIdAndUpdate(
    projectId,
    {
      $set: {
        name,
        description,
      },
    },
    {
      new: true,
    },
  );

  if (!updateProject) {
    throw new ApiError(404, "Project not found");
  }

  res.status(200).json(new ApiResponse(200, updatedProject, "Project updated successfully"));
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const clientSession = await mongoose.startSession();
  clientSession.startTransaction();

  try {
    await Project.findByIdAndDelete(projectId, {
      session: clientSession,
    });
    await ProjectMember.deleteMany(
      { project: projectId },
      {
        session: clientSession,
      },
    );

    await Task.deleteMany(
      { project: projectId },
      {
        session: clientSession,
      },
    );
    await ProjectNote.deleteMany(
      { project: projectId },
      {
        session: clientSession,
      },
    );

    await clientSession.commitTransaction();
  } catch (error) {
    await clientSession.abortTransaction();

    throw new ApiError(`Error while deleting project: ${error.message}`, 500);
  } finally {
    await clientSession.endSession();
  }

  res.status(200).json(new ApiResponse(200, "Project deleted successfully"));
});

const addMemberToProject = asyncHandler(async (req, res) => {
  const { role, user } = req.body;
  const { projectId } = req.params;

  if (!role || !user) {
    throw new ApiError(400, "All fields are required");
  }

  const member = await ProjectMember.findOne({ project: projectId, user });
  if (member) {
    throw new ApiError(400, "User is already a member of this project");
  }

  const projectMember = await ProjectMember.create({
    role,
    project: projectId,
    user,
  });

  if (!projectMember) {
    throw new ApiError(400, "Failed to add member to the project");
  }

  res.status(200).json(new ApiResponse(200, projectMember, "Member added successfully"));
});

const getProjectMembers = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findOne({ _id: projectId });
  if (!project) {
    throw new ApiError(404, "project not found or invalid id");
  }

  const projectMembers = await ProjectMember.find({
    project: projectId,
  }).populate({
    path: "user",
    select: "username email avatar fullName _id",
  });

  if (!projectMembers) {
    throw new ApiError(400, "This project has no members");
  }

  res.status(200).json(new ApiResponse(200, projectMembers, "Project-members get successfully"));
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { role, user } = req.body;

  if (!projectId || !user) {
    throw new ApiError(400, "All fields are required");
  }

  const newMember = await ProjectMember.findOneAndUpdate(
    { project: projectId, user: user },
    { $set: { role: role } },
    { new: true },
  );

  if (!newMember) {
    throw new ApiError(404, "Project member not found.");
  }

  res.status(200).json(new ApiResponse(200, "Member role updated successfully"));
});

const deleteMember = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;

  if (!projectId || !userId) {
    throw new ApiError(400, "All fields are required");
  }

  const projectMember = await ProjectMember.findOne({
    project: projectId,
    user: userId,
  });

  if (!projectMember) {
    throw new ApiError(404, "Member not found for this project.");
  }

  await ProjectMember.findByIdAndDelete(projectMember._id);

  res.status(200).json(new ApiResponse(200, "Member deleted successfully."));
});

export {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMemberToProject,
  getProjectMembers,
  deleteMember,
  updateMemberRole,
};
