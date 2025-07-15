import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";

// ➤ Create new project under an organization
export const createProject = asyncHandler(async (req, res) => {
  res.status(201).json(new ApiResponse(201, {}, "Project created"));
});

// ➤ Get all projects user has access to
export const getAccessibleProjects = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Accessible projects fetched"));
});

// ➤ Get single project by ID
export const getProjectById = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project fetched by ID"));
});

// ➤ Update project details (name, description, etc.)
export const updateProject = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project updated"));
});

// ➤ Soft delete a project
export const softDeleteProject = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project soft deleted"));
});

// ➤ Restore soft-deleted project
export const restoreDeletedProject = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project restored successfully"));
});

// ➤ Add a member to a project with role
export const addProjectMember = asyncHandler(async (req, res) => {
  res.status(201).json(new ApiResponse(201, {}, "Project member added"));
});

// ➤ Get all members of a project
export const getProjectMembers = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Project members fetched"));
});

// ➤ Update role of a project member
export const updateProjectMemberRole = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project member role updated"));
});

// ➤ Remove a member from project
export const removeProjectMember = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Project member removed"));
});

// ➤ Get all projects under a specific organization
export const getProjectsByOrganizationId = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Projects under organization fetched"));
});

// ➤ List all soft-deleted projects (SuperAdmin only)
export const getDeletedProjects = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Deleted projects fetched"));
});
