import { Router } from "express";
import {
  addMemberToProject,
  createProject,
  deleteMember,
  deleteProject,
  getProjectById,
  getProjectMembers,
  getProjects,
  updateMemberRole,
  updateProject,
} from "../controllers/project.controller.js";
import { validateProjectPermission, verifyJwt } from "../middlewares/auth.middleware.js";
import { AvailableUserRoles, UserRoleEnum } from "../utils/constant.js";

const router = Router();

router.route("/").post(verifyJwt, createProject).get(verifyJwt, getProjects);
router
  .route("/:projectId")
  .get(verifyJwt, validateProjectPermission(AvailableUserRoles), getProjectById)
  .put(
    verifyJwt,
    validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
    updateProject,
  )
  .delete(verifyJwt, validateProjectPermission([UserRoleEnum.ADMIN]), deleteProject);
router
  .route("/:projectId/member/add")
  .post(
    verifyJwt,
    validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
    addMemberToProject,
  );
router
  .route("/get-members/:projectId")
  .get(verifyJwt, validateProjectPermission(AvailableUserRoles), getProjectMembers);
router
  .route("/member/:projectId")
  .delete(verifyJwt, validateProjectPermission([UserRoleEnum.ADMIN]), deleteMember);
router
  .route("/member-role/:projectId")
  .put(
    verifyJwt,
    validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
    updateMemberRole,
  );

export default router;
