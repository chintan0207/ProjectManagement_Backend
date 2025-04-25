import { UserRoleEnum } from "./constant.js";

export const checkAdmin = async (projectId, userId) => {
  const member = await ProjectMember.findOne({
    project: projectId,
    user: userId,
  });

  if (!member || member.role !== UserRoleEnum.ADMIN) {
    throw new ApiError(401, "Unauthorized to perform this operation.");
  }
};

export const checkProjectAdmin = async (projectId, userId) => {
  const member = await ProjectMember.findOne({
    project: projectId,
    user: userId,
  });

  if (!member || member.role !== UserRoleEnum.PROJECT_ADMIN) {
    throw new ApiError(401, "Unauthorized to perform this operation.");
  }
};

export const checkProjectMember = async (projectId, userId) => {
  const member = await ProjectMember.findOne({
    project: projectId,
    user: userId,
  });

  if (!member) {
    throw new ApiError(403, "You are not a member of this project.");
  }

  return member;
};
