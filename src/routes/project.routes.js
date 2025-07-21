import { Router } from "express";
import {
  createProject,
  getAccessibleProjects,
  getProjectById,
  updateProject,
  softDeleteProject,
  restoreDeletedProject,
  addProjectMember,
  getProjectMembers,
  updateProjectMemberRole,
  removeProjectMember,
  getProjectsByOrganizationId,
  getDeletedProjects,
} from "../controllers/project.controller.js";

import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  validateGlobalPermission,
  validateOrgPermission,
  validateProjectPermission,
} from "../middlewares/permission.middleware.js";
import { AvailableGlobalRoles, AvailableProjectRoles, OrgRoleEnum } from "../utils/constant.js";
import { validate } from "../middlewares/zodValidator.middleware.js";
import { createProjectSchema } from "../validators/project.validation.js";

const router = Router();

router.use(verifyJwt); // protect all routes

// Core project routes
router
  .route("/")
  .post(
    validateGlobalPermission(AvailableGlobalRoles),
    validateOrgPermission([OrgRoleEnum.ORG_ADMIN, OrgRoleEnum.MEMBER]),
    validate(createProjectSchema),
    createProject,
  )
  .get(getAccessibleProjects);
router
  .route("/:projectId")
  .get(validateProjectPermission(AvailableProjectRoles), getProjectById)
  .patch(updateProject)
  .delete(softDeleteProject);
router.route("/:projectId/restore").post(restoreDeletedProject);

// Project member management
router.route("/:projectId/members").post(addProjectMember).get(getProjectMembers);
router
  .route("/:projectId/members/:memberId")
  .patch(updateProjectMemberRole)
  .delete(removeProjectMember);

// SuperAdmin-only routes
router.get("/org/:orgId", getProjectsByOrganizationId);
router.get("/deleted", getDeletedProjects);

export default router;
