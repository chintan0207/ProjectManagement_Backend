import { Router } from "express";
import {
  createNote,
  deleteNote,
  getNoteById,
  getNotes,
  updateNote,
} from "../controllers/note.controller.js";
import { AvailableUserRoles, UserRoleEnum } from "../utils/constant.js";
import { validateProjectPermission, verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router
  .route("/:projectId")
  .get(verifyJwt, validateProjectPermission(AvailableUserRoles), getNotes)
  .post(
    verifyJwt,
    validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
    createNote,
  );

router
  .route("/:projectId/n/:noteId")
  .get(verifyJwt, validateProjectPermission(AvailableUserRoles), getNoteById)
  .put(
    verifyJwt,
    validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
    updateNote,
  )
  .delete(
    verifyJwt,
    validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
    deleteNote,
  );

export default router;
