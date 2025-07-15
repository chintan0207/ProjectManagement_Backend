export const DB_NAME = "NEW_PMS";

export const UserRoleEnum = {
  ADMIN: "admin",
  PROJECT_ADMIN: "project_admin",
  MEMBER: "member",
};

export const AvailableUserRoles = Object.values(UserRoleEnum);

export const allowedMimeTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
  // docx - word doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // xlsx -  excel sheet
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export const GlobalRoleEnum = {
  SUPER_ADMIN: "super_admin",
  USER: "user",
};

export const OrgRoleEnum = {
  ORG_ADMIN: "orgAdmin",
  MEMBER: "member",
  VIEWER: "viewer",
};

export const ProjectRoleEnum = {
  ADMIN: "projectAdmin",
  MEMBER: "projectMember",
  VIEWER: "projectViewer",
};

export const AvailableProjectRoles = Object.values(ProjectRoleEnum);
export const AvailableGlobalRoles = Object.values(GlobalRoleEnum);
export const AvailableOrgRoles = Object.values(OrgRoleEnum);

export const SubscriptionPlanEnum = {
  FREE: "free",
  PRO: "pro",
  ENTERPRISE: "enterprise",
};

export const SubscriptionStatusEnum = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

export const AvailableSubscriptionStatuses = Object.values(SubscriptionStatusEnum);
export const AvailableSubscriptionPlans = Object.values(SubscriptionPlanEnum);

export const TaskStatusEnum = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};

export const TaskPriorityEnum = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

export const AvailableTaskPriorities = Object.values(TaskPriorityEnum);
export const AvailableTaskStatuses = Object.values(TaskStatusEnum);
