import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { Project } from "../models/project.model.js";
import { logActivity } from "../utils/log-activity.js";
import mongoose from "mongoose";
import { ProjectMember } from "../models/projectMember.model.js";
import { ProjectRoleEnum, ProjectVisibilityEnum } from "../utils/constant.js";

export const createProject = asyncHandler(async (req, res) => {
  console.log("req.validatedData", req.validatedData);
  const {
    organizationId,
    name,
    description,
    visibility,
    priority,
    status,
    startDate,
    dueDate,
    tags,
  } = req.validatedData;

  const user = req.user;
  const logo = req.file ? req.file.path : null;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingProject = await Project.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      isDeleted: false,
    });

    if (existingProject) {
      throw new ApiError(409, "Project with this name already exists");
    }

    const project = await Project.create({
      organizationId,
      name,
      logo,
      description,
      visibility,
      priority,
      status,
      startDate,
      dueDate,
      tags,
      createdBy: user._id,
    });

    await ProjectMember.create({
      projectId: project._id,
      userId: user._id,
      role: ProjectRoleEnum.ADMIN,
    });

    await logActivity({
      userId: req.user._id,
      action: "create_project",
      organizationId: project.organizationId,
      projectId: project._id,
      metadata: {
        name: project.name,
      },
    });

    if (!project) {
      throw new ApiError(500, "Failed to create project");
    }
    await session.commitTransaction();

    res.status(201).json(new ApiResponse(201, { result: project }, "Project created"));
  } catch (error) {
    await session.abortTransaction();
    console.error("Error creating project:", error);
    throw new ApiError(500, "Failed to create project");
  } finally {
    await session.endSession();
  }
});

export const getAccessibleProjects = asyncHandler(async (req, res) => {
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

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    const memberships = await ProjectMember.find({
      userId,
    });

    const projectIds = memberships.map((m) => m.projectId);
    let projectRoleMap = {};
    memberships.forEach((m) => {
      projectRoleMap[m.projectId.toString()] = m.role;
    });

    console.log("membership", memberships);
    console.log("projectRoleMap", projectRoleMap);

    const pipeline = [
      {
        $match: {
          _id: { $in: projectIds },
          isDeleted: false,
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
          preserveNullAndEmptyArrays: true,
        },
      },
      ...(search.trim()
        ? [
            {
              $match: {
                $or: [
                  { name: { $regex: search, $options: "i" } },
                  { "createdBy.fullname": { $regex: search, $options: "i" } },
                  { "createdBy.email": { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $addFields: {
          userRole: {
            $let: {
              vars: {
                orgIdStr: { $toString: "$_id" },
              },
              in: {
                $literal: projectRoleMap,
              },
            },
          },
        },
      },
      {
        $addFields: {
          userRole: {
            $arrayElemAt: [
              {
                $objectToArray: "$userRole",
              },
              {
                $indexOfArray: [
                  { $map: { input: projectIds, as: "p", in: { $toString: "$$p" } } },
                  { $toString: "$_id" },
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          name: 1,
          logo: 1,
          description: 1,
          createdAt: 1,
          visibility: 1,
          priority: 1,
          status: 1,
          startDate: 1,
          dueDate: 1,
          tags: 1,
          "createdBy.fullname": 1,
          "createdBy.email": 1,
          "createdBy.username": 1,
          "createdBy.avatar": 1,
          userRole: "$userRole.v",
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

    const stringSortFields = ["name", "createdBy.fullname", "createdBy.email"];
    const result = stringSortFields.includes(sortField)
      ? await Project.aggregate(pipeline).collation({ locale: "en", strength: 2 })
      : await Project.aggregate(pipeline);

    const { metaData = [], data: projects = [] } = result[0] || {};

    const paginationData = metaData[0] || {
      total: 0,
      page: pageNumber,
      limit: limitNumber,
      totalPages: 0,
    };

    await session.commitTransaction();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { projects, ...paginationData },
          projects.length > 0 ? "Projects fetched successfully" : "No projects fetched",
        ),
      );
  } catch (error) {
    console.error("Error fetching accessible projects:", error);
    res.status(500).json(new ApiResponse(500, {}, "Failed to fetch accessible projects"));
  }
});

export const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Valid project ID required");
  }

  const project = await Project.findOne({ _id: projectId, isDeleted: false });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  console.log("req.user", project.createdBy, req.user._id, project.createdBy !== req.user._id);

  if (
    project.visibility === ProjectVisibilityEnum.PRIVATE &&
    !project.createdBy.equals(req.user._id)
  ) {
    throw new ApiError(403, "You do not have permission to access this project");
  }

  res.status(200).json(new ApiResponse(200, { result: project }, "Project fetched "));
});

export const updateProject = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project updated"));
});

export const softDeleteProject = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project soft deleted"));
});

export const restoreDeletedProject = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project restored successfully"));
});

export const addProjectMember = asyncHandler(async (req, res) => {
  res.status(201).json(new ApiResponse(201, {}, "Project member added"));
});

export const getProjectMembers = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Project members fetched"));
});

export const updateProjectMemberRole = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project member role updated"));
});

export const removeProjectMember = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project member removed"));
});

export const getProjectsByOrganizationId = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Projects under organization fetched"));
});

export const getDeletedProjects = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Deleted projects fetched"));
});
