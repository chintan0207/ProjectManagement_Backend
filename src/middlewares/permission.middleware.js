import mongoose from "mongoose";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { OrganizationMember } from "../models/organizationMember.model.js";

export const validateGlobalPermission = (allowedRoles = []) =>
  asyncHandler(async (req, res, next) => {
    const globalRole = req.user?.globalRole || "user";

    req.user.globalRole = globalRole;

    if (allowedRoles.length && !allowedRoles.includes(globalRole)) {
      throw new ApiError(403, "Access denied at global level");
    }

    next();
  });

export const validateProjectPermission = (allowedRoles = []) =>
  asyncHandler(async (req, res, next) => {
    const { projectId } = req.params;
    const user = req.user;

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ApiError(401, "Invaid project id");
    }

    const project = await ProjectMember.findOne({
      userId: user._id,
      projectId: projectId,
    });

    if (!project) {
      throw new ApiError(403, "You are not a member of this project");
    }

    const givenRole = project?.role;
    req.user.role = givenRole;

    if (allowedRoles.length && !allowedRoles.includes(givenRole)) {
      throw new ApiError(401, "You do not have permission to perform this operation");
    }

    next();
  });

export const validateOrgPermission = (requiredRoles = []) => {
  return async (req, res, next) => {
    const userId = req.user?._id;
    const orgId = req.params.orgId || req.body.organizationId;
    console.log("orgId", orgId);
    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      throw new ApiError(400, "Invalid organization ID");
    }

    const membership = await OrganizationMember.findOne({
      organizationId: orgId,
      userId,
    });

    if (!membership) {
      throw new ApiError(403, "You are not a member of this organization");
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ApiError(403, " You do not have permission to perform this operation");
    }

    req.user.orgRole = membership;
    next();
  };
};
