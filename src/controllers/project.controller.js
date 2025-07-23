import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { Project } from "../models/project.model.js";
import { logActivity } from "../utils/log-activity.js";
import mongoose from "mongoose";
import { ProjectMember } from "../models/projectMember.model.js";
import {
  GlobalRoleEnum,
  OrgRoleEnum,
  ProjectRoleEnum,
  ProjectVisibilityEnum,
} from "../utils/constant.js";
import { Organization } from "../models/organization.model.js";

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

  const existingProject = await Project.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
    isDeleted: false,
  });

  if (existingProject) {
    throw new ApiError(200, "Project with this name already exists");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
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

// export const getAccessibleProjects = asyncHandler(async (req, res) => {
//   const userId = req.user._id;

//   let { page, limit, sortOrder = "desc", sortField = "createdAt", search = "" } = req.query;

//   const sortDirection = sortOrder === "asc" ? 1 : -1;

//   const usePagination = page !== undefined && limit !== undefined;
//   const pageNumber = usePagination ? parseInt(page) : 1;
//   const limitNumber = usePagination ? parseInt(limit) : 0;
//   const skip = (pageNumber - 1) * limitNumber;

//   try {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     const memberships = await ProjectMember.find({ userId });
//     const projectIds = memberships.map((m) => m.projectId);
//     let projectRoleMap = {};
//     memberships.forEach((m) => {
//       projectRoleMap[m.projectId.toString()] = m.role;
//     });

//     const matchStage = {
//       $match: {
//         _id: { $in: projectIds },
//         isDeleted: false,
//       },
//     };

//     const pipeline = [
//       matchStage,
//       {
//         $lookup: {
//           from: "users",
//           localField: "createdBy",
//           foreignField: "_id",
//           as: "createdBy",
//         },
//       },
//       {
//         $unwind: {
//           path: "$createdBy",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       ...(search.trim()
//         ? [
//             {
//               $match: {
//                 $or: [
//                   { name: { $regex: search, $options: "i" } },
//                   { "createdBy.fullname": { $regex: search, $options: "i" } },
//                   { "createdBy.email": { $regex: search, $options: "i" } },
//                 ],
//               },
//             },
//           ]
//         : []),
//       {
//         $addFields: {
//           userRole: {
//             $let: {
//               vars: {
//                 orgIdStr: { $toString: "$_id" },
//               },
//               in: {
//                 $literal: projectRoleMap,
//               },
//             },
//           },
//         },
//       },
//       {
//         $addFields: {
//           userRole: {
//             $arrayElemAt: [
//               {
//                 $objectToArray: "$userRole",
//               },
//               {
//                 $indexOfArray: [
//                   { $map: { input: projectIds, as: "p", in: { $toString: "$$p" } } },
//                   { $toString: "$_id" },
//                 ],
//               },
//             ],
//           },
//         },
//       },
//       {
//         $project: {
//           name: 1,
//           logo: 1,
//           description: 1,
//           createdAt: 1,
//           visibility: 1,
//           priority: 1,
//           status: 1,
//           startDate: 1,
//           dueDate: 1,
//           tags: 1,
//           "createdBy.fullname": 1,
//           "createdBy.email": 1,
//           "createdBy.username": 1,
//           "createdBy.avatar": 1,
//           userRole: "$userRole.v",
//         },
//       },
//       {
//         $sort: {
//           [sortField]: sortDirection,
//         },
//       },
//     ];

//     if (usePagination) {
//       pipeline.push({
//         $facet: {
//           metaData: [
//             { $count: "total" },
//             {
//               $addFields: {
//                 page: pageNumber,
//                 limit: limitNumber,
//                 totalPages: {
//                   $ceil: { $divide: ["$total", limitNumber] },
//                 },
//               },
//             },
//           ],
//           data: [{ $skip: skip }, { $limit: limitNumber }],
//         },
//       });
//     }

//     const stringSortFields = ["name", "createdBy.fullname", "createdBy.email"];
//     const result = stringSortFields.includes(sortField)
//       ? await Project.aggregate(pipeline).collation({ locale: "en", strength: 2 })
//       : await Project.aggregate(pipeline);

//     let projects, paginationData;

//     if (usePagination) {
//       const { metaData = [], data = [] } = result[0] || {};
//       projects = data;
//       paginationData = metaData[0] || {
//         total: 0,
//         page: pageNumber,
//         limit: limitNumber,
//         totalPages: 0,
//       };
//     } else {
//       projects = result;
//       paginationData = {
//         total: projects.length,
//         page: 1,
//         limit: projects.length,
//         totalPages: 1,
//       };
//     }

//     await session.commitTransaction();

//     res
//       .status(200)
//       .json(
//         new ApiResponse(
//           200,
//           { projects, ...paginationData },
//           projects.length > 0 ? "Projects fetched successfully" : "No projects found",
//         ),
//       );
//   } catch (error) {
//     console.error("Error fetching accessible projects:", error);
//     res.status(500).json(new ApiResponse(500, {}, "Failed to fetch accessible projects"));
//   }
// });

export const getAllProjects = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const globalRole = req.user.globalRole;
  const orgRole = req.user?.orgRole;
  const orgId = req.user?.orgId;

  let { page, limit, sortOrder = "desc", sortField = "createdAt", search = "" } = req.query;

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const usePagination = page !== undefined && limit !== undefined;
  const pageNumber = usePagination ? parseInt(page) : 1;
  const limitNumber = usePagination ? parseInt(limit) : 0;
  const skip = (pageNumber - 1) * limitNumber;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    let matchStage = {};
    let projectRoleMap = {};
    let projectIds = [];

    if (globalRole === GlobalRoleEnum.SUPER_ADMIN) {
      matchStage = { $match: { isDeleted: false } };
    } else if (orgRole === OrgRoleEnum.ORG_ADMIN && orgId) {
      matchStage = {
        $match: {
          organizationId: new mongoose.Types.ObjectId(orgId),
          isDeleted: false,
        },
      };
    } else {
      const memberships = await ProjectMember.find({ userId });
      projectIds = memberships.map((m) => m.projectId);
      memberships.forEach((m) => {
        projectRoleMap[m.projectId.toString()] = m.role;
      });
      matchStage = {
        $match: {
          _id: { $in: projectIds },
          isDeleted: false,
        },
      };
    }

    const pipeline = [
      matchStage,
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
        },
      },
      {
        $sort: {
          [sortField]: sortDirection,
        },
      },
    ];

    if (usePagination) {
      pipeline.push({
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
      });
    }

    const stringSortFields = ["name", "createdBy.fullname", "createdBy.email"];
    const result = stringSortFields.includes(sortField)
      ? await Project.aggregate(pipeline).collation({ locale: "en", strength: 2 })
      : await Project.aggregate(pipeline);

    let projects, paginationData;

    if (usePagination) {
      const { metaData = [], data = [] } = result[0] || {};
      projects = data;
      paginationData = metaData[0] || {
        total: 0,
        page: pageNumber,
        limit: limitNumber,
        totalPages: 0,
      };
    } else {
      projects = result;
      paginationData = {
        total: projects.length,
        page: 1,
        limit: projects.length,
        totalPages: 1,
      };
    }

    await session.commitTransaction();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { projects, ...paginationData },
          projects.length > 0 ? "Projects fetched successfully" : "No projects found",
        ),
      );
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json(new ApiResponse(500, {}, "Failed to fetch projects"));
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
  const { projectId } = req.params;

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Valid Project ID is required");
  }

  const { name, description, tags, startDate, dueDate, status, priority, visibility } = req.body;

  const logo = req.file ? req.file.path : null;

  const updateData = {};
  if (name) updateData.name = name;
  if (description) updateData.description = description;
  if (logo) updateData.logo = logo;
  if (tags) updateData.tags = tags;
  if (startDate) updateData.startDate = startDate;
  if (dueDate) updateData.dueDate = dueDate;
  if (status) updateData.status = status;
  if (priority) updateData.priority = priority;
  if (visibility) updateData.visibility = visibility;

  const updatedProject = await Project.findOneAndUpdate(
    { _id: projectId, isDeleted: false },
    updateData,
    { new: true },
  );

  if (!updatedProject) {
    throw new ApiError(404, "Project not found or already deleted");
  }

  res
    .status(200)
    .json(new ApiResponse(200, { result: updatedProject }, "Project updated successfully"));
});

export const softDeleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Valid project ID required");
  }

  const project = await Project.findOneAndUpdate(
    { _id: projectId, isDeleted: false },
    {
      isDeleted: true,
      deletedAt: new Date(),
    },
    { new: true },
  );

  if (!project) {
    throw new ApiError(404, "Project not found or already deleted");
  }

  await logActivity({
    userId: req.user._id,
    action: "delete_project",
    organizationId: project.organizationId,
    projectId: project._id,
    metadata: {
      name: project.name,
    },
  });

  res.status(200).json(new ApiResponse(200, {}, "Project soft deleted"));
});

export const restoreDeletedProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Valid project ID required");
  }

  const project = await Project.findByIdAndUpdate(
    { _id: projectId, isDeleted: true },
    { isDeleted: false },
    { new: true },
  );

  if (!project) {
    throw new ApiError(404, "Project not found or already restore");
  }

  res.status(200).json(new ApiResponse(200, {}, "Project restored successfully"));
});

export const addProjectMember = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { userId, role } = req.body;
  const user = req.user;

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Valid project Id required");
  }

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Valid user Id required");
  }

  const projectmember = await ProjectMember.findOne({ projectId, userId });
  if (projectmember) {
    throw new ApiError(400, "User is already a member of the project");
  }

  await ProjectMember.create({
    projectId,
    userId,
    role,
    addedBy: user?._id,
    addedAt: Date.now(),
  });

  res.status(201).json(new ApiResponse(201, {}, "Project member added"));
});

export const getProjectMembers = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  let { page, limit, sortOrder = "desc", sortField = "createdAt", search = "" } = req.query;

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Valid project ID required");
  }

  const usePagination = page !== undefined && limit !== undefined;
  const pageNumber = usePagination ? parseInt(page) : 1;
  const limitNumber = usePagination ? parseInt(limit) : 0;
  const skip = (pageNumber - 1) * limitNumber;
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const project = await Project.findById(projectId);
  if (!project || project.isDeleted) {
    throw new ApiError(404, "Project not found");
  }

  const pipeline = [
    {
      $match: {
        projectId: new mongoose.Types.ObjectId(projectId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    ...(search.trim()
      ? [
          {
            $match: {
              $or: [
                { "user.fullname": { $regex: search, $options: "i" } },
                { "user.email": { $regex: search, $options: "i" } },
                { "user.username": { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
      : []),
    {
      $project: {
        _id: 1,
        userId: 1,
        role: 1,
        addedAt: 1,
        "user.fullname": 1,
        "user.email": 1,
        "user.username": 1,
        "user.avatar": 1,
      },
    },
    {
      $sort: {
        [sortField]: sortDirection,
      },
    },
  ];

  if (usePagination) {
    pipeline.push({
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
    });
  }

  const stringSortFields = ["user.fullname", "user.email", "user.username"];
  const result = stringSortFields.includes(sortField)
    ? await ProjectMember.aggregate(pipeline).collation({ locale: "en", strength: 2 })
    : await ProjectMember.aggregate(pipeline);

  let members = [];
  let pagination = {
    total: 0,
    page: pageNumber,
    limit: limitNumber,
    totalPages: 0,
  };

  if (usePagination) {
    const { metaData = [], data = [] } = result[0] || {};
    members = data;
    pagination = metaData[0] || pagination;
  } else {
    members = result;
    pagination.total = members.length;
    pagination.totalPages = 1;
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { result: members, ...pagination },
        members.length ? "Project members fetched" : "No members found",
      ),
    );
});

export const updateProjectMemberRole = asyncHandler(async (req, res) => {
  const { projectId, memberId } = req.params;
  const { role } = req.body;

  if (!projectId || !memberId || !role) {
    throw new ApiError(400, "Project ID, User ID, and role are required");
  }

  if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(memberId)) {
    throw new ApiError(400, "Invalid project ID or user ID");
  }

  if (!Object.values(ProjectRoleEnum).includes(role)) {
    throw new ApiError(400, "Invalid role provided");
  }

  const member = await ProjectMember.findOne({ projectId: projectId, _id: memberId });
  if (!member) {
    throw new ApiError(404, "Member not found in project");
  }

  member.role = role;
  await member.save();

  res.status(200).json(new ApiResponse(200, { result: member }, "Project member role updated"));
});

export const removeProjectMember = asyncHandler(async (req, res) => {
  const { projectId, memberId } = req.params;

  if (!projectId || !memberId) {
    throw new ApiError(400, "Project ID and User ID are required");
  }

  if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(memberId)) {
    throw new ApiError(400, "Invalid Project ID or user ID");
  }

  const member = await ProjectMember.findOne({ projectId: projectId, _id: memberId });
  if (!member) {
    throw new ApiError(404, "Member not found in Project");
  }

  // Prevent removing the last Project_ADMIN
  if (member.role === ProjectRoleEnum.ADMIN) {
    const adminCount = await ProjectMember.countDocuments({
      projectId: projectId,
      role: ProjectRoleEnum.ADMIN,
    });

    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot remove the last admin of the project");
    }
  }

  await ProjectMember.deleteOne({ _id: member._id });

  res.status(200).json(new ApiResponse(200, {}, "Project member removed"));
});

export const getProjectsByOrganizationId = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  let { page, limit, sortOrder = "desc", sortField = "createdAt", search = "" } = req.query;

  if (!orgId || mongoose.Types.ObjectId(orgId)) {
    throw new ApiError(400, "Valid organization Id required");
  }

  const usePagination = page !== undefined && limit !== undefined;
  const pageNumber = usePagination ? parseInt(page) : 1;
  const limitNumber = usePagination ? parseInt(limit) : 0;
  const skip = (pageNumber - 1) * limitNumber;
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const organization = await Organization.findById({ _id: orgId });
  if (!organization || organization.isDeleted) {
    throw new ApiError(404, "Organization not found");
  }

  const pipeline = [
    {
      $match: {
        organizationId: mongoose.Types.ObjectId(orgId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    ...(search.trim()
      ? [
          {
            $match: {
              $or: [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { status: { $regex: search, $options: "i" } },
                { "user.fullname": { $regex: search, $options: "i" } },
                { "user.email": { $regex: search, $options: "i" } },
                { "user.username": { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
      : []),
    {
      $project: {
        _id: 1,
        name: 1,
        logo: 1,
        description: 1,
        startDate: 1,
        dueDate: 1,
        status: 1,
        priority: 1,
        "user.fullname": 1,
        "user.email": 1,
        "user.username": 1,
        "user.avatar": 1,
      },
    },
    {
      $sort: {
        [sortField]: sortDirection,
      },
    },
  ];

  if (usePagination) {
    pipeline.push({
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
    });
  }

  const stringSortFields = ["name", "createdBy.fullname", "createdBy.email"];
  const result = stringSortFields.includes(sortField)
    ? await Project.aggregate(pipeline).collation({ locale: "en", strength: 2 })
    : await Project.aggregate(pipeline);

  const { metaData = [], data: projects = [] } = result[0] || {};
  const pagination = metaData[0] || {
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
        { result: projects, ...pagination },
        projects.length ? "Project members fetched" : "No members found",
      ),
    );
  res.status(200).json(new ApiResponse(200, [], "Projects under organization fetched"));
});

export const getDeletedProjects = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Deleted projects fetched"));
});
