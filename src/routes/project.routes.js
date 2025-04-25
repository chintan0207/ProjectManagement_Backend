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
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/create").post(verifyJwt, createProject);
router.route("/").get(verifyJwt, getProjects);
router.route("/:id").get(verifyJwt, getProjectById);
router.route("/:id").post(verifyJwt, updateProject);
router.route("/:id").delete(verifyJwt, deleteProject);
router.route("/member/add").post(verifyJwt, addMemberToProject);
router.route("/project-members/:id").get(verifyJwt, getProjectMembers);
router.route("/member/:id").delete(verifyJwt, deleteMember);
router.route("/member-role/update/:id").post(verifyJwt, updateMemberRole);

export default router;
