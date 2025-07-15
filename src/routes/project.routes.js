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

const router = Router();

router.use(verifyJwt); // protect all routes

// Core project routes
router.route("/").post(createProject).get(getAccessibleProjects);
router.route("/:projectId").get(getProjectById).patch(updateProject).delete(softDeleteProject);
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
