import { Router } from "express";
import {
  createSubTask,
  createTask,
  deleteSubTask,
  deleteTask,
  getSubTasks,
  getTaskById,
  getTasks,
  updateSubTask,
  updateTask,
} from "../controllers/task.controller.js";
import { validateProjectPermission, verifyJwt } from "../middlewares/auth.middleware.js";
import { AvailableUserRoles, UserRoleEnum } from "../utils/constant.js";
import { uploadTaskAttachments } from "../middlewares/multer.middleware.js";

const router = Router();

router
  .route("/:projectId")
  .get(verifyJwt, validateProjectPermission(AvailableUserRoles), getTasks)
  .post(
    verifyJwt,
    uploadTaskAttachments,
    validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
    createTask,
  );
router
  .route("/:projectId/n/:taskId")
  .get(verifyJwt, validateProjectPermission(AvailableUserRoles), getTaskById)
  .put(
    verifyJwt,
    validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
    updateTask,
  )
  .delete(
    verifyJwt,
    validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
    deleteTask,
  );

router
  .route("/:taskId")
  .get(verifyJwt, validateProjectPermission(AvailableUserRoles), getSubTasks)
  .post(verifyJwt, validateProjectPermission(AvailableUserRoles), createSubTask);

router
  .route("/:taskId/sub/:subTaskId")
  .get(verifyJwt, validateProjectPermission(AvailableUserRoles), getTaskById)
  .put(verifyJwt, validateProjectPermission(AvailableUserRoles), updateSubTask)
  .delete(verifyJwt, validateProjectPermission(AvailableUserRoles), deleteSubTask);

export default router;
