export const DB_NAME = "PMS";

export const UserRoleEnum = {
  ADMIN: "admin",
  PROJECT_ADMIN: "project_admin",
  MEMBER: "member",
};

export const AvailableUserRoles = Object.values(UserRoleEnum);

export const TaskStatusEnum = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};

export const AvailableTaskStatuses = Object.values(TaskStatusEnum);

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

export const AvailableGlobalRoles = Object.values(GlobalRoleEnum);
export const AvailableOrgRoles = Object.values(OrgRoleEnum);
