import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { checkAdmin, checkProjectMember } from "../utils/checkRole.js";
import { UserRoleEnum } from "../utils/constant.js";

const getProjects = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const { page = 1, limit = 10 } = req.query;
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const memberProjects = await ProjectMember.find({ user: userId }).select(
    "project",
  );

  const projectsIds = memberProjects.map((ele) => ele.project);

  const matchStage = {
    $or: [{ _id: { $in: projectsIds } }, { createdBy: userId }],
  };

  const pipeline = [
    { $match: matchStage },
    { $sort: { createdAt: -1 } },
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

  const resultData = await Project.aggregate(pipeline);

  const { metaData = [], data: projects = [] } = resultData[0] || {};

  const paginationData = metaData[0] || {
    total: 0,
    page: pageNumber,
    limit: limitNumber,
    totalPages: 0,
  };

  if (!projects.length) {
    throw new ApiError(404, "No projects found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, { result: projects, ...paginationData }));
});

const getProjectById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await checkProjectMember(id, req.user._id);

  const project = await Project.findById(id).populate({
    path: "createdBy",
    select: "username email",
  });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, project, "Project get successfully"));
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

  const newProject = await Project.create({
    name,
    description,
    createdBy: userId,
  });

  if (!newProject) {
    throw new ApiError(400, "Failed to create project. Please try again.");
  }

  const projectMember = await ProjectMember.create({
    role: UserRoleEnum.ADMIN,
    project: newProject._id,
    user: userId,
  });

  if (!projectMember) {
    throw new ApiError(
      400,
      "Project was created, but failed to assign the creator as a member",
    );
  }

  res
    .status(200)
    .json(new ApiResponse(200, newProject, "Project created successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const projectId = req.params.id;

  await checkAdmin(projectId, req.user._id);

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

  res
    .status(200)
    .json(new ApiResponse(200, updatedProject, "Project updated successfully"));
});

const deleteProject = asyncHandler(async (req, res) => {
  const projectId = req.params.id;

  await checkAdmin(projectId, req.user._id);

  const deletedProject = await Project.findByIdAndDelete(projectId);
  if (!deletedProject) {
    throw new ApiError(404, "Project not found");
  }

  res.status(200).json(new ApiResponse(200, "Project deleted successfully"));
});

const addMemberToProject = asyncHandler(async (req, res) => {
  const { role, project, user } = req.body;

  if (!role || !project || !user) {
    throw new ApiError(400, "All fields are required");
  }
  // check reqested user is admin of this project
  await checkAdmin(project, req.user._id);

  const member = await ProjectMember.findOne({ project, user });
  if (member) {
    throw new ApiError(400, "User is already a member of this project");
  }

  const projectMember = await ProjectMember.create({
    role,
    project,
    user,
  });

  if (!projectMember) {
    throw new ApiError(400, "Failed to add member to the project");
  }

  res
    .status(200)
    .json(new ApiResponse(200, projectMember, "Member added successfully"));
});

const getProjectMembers = asyncHandler(async (req, res) => {
  const projectId = req.params.id;

  const project = await Project.findOne({ _id: projectId });
  if (!project) {
    throw new ApiError(404, "project not found or invalid id");
  }
  // check reqested user is member of this project
  await checkProjectMember(projectId, req.user._id);

  const projectMembers = await ProjectMember.find({
    project: projectId,
  }).populate({
    path: "user",
    select: "username email avatar",
  });

  if (!projectMembers) {
    throw new ApiError(400, "This project has no members");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, projectMembers, "Project-members get successfully"),
    );
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const { projectId, userId, roleName } = req.params;

  if (!projectId || !userId) {
    throw new ApiError(400, "All fields are required");
  }

  await checkAdmin(projectId, req.user._id);

  const newMember = await ProjectMember.findOneAndUpdate(
    { project: projectId, user: userId },
    { $set: { role: roleName } },
    { new: true },
  );

  if (!newMember) {
    throw new ApiError(404, "Project member not found.");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Member role updated successfully"));
});

const deleteMember = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;

  if (!projectId || !userId) {
    throw new ApiError(400, "All fields are required");
  }

  await checkAdmin(projectId, req.user._id);

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
