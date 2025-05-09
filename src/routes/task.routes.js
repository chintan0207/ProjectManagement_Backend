import { Router } from "express";
import {
  addAttachments,
  createSubTask,
  createTask,
  deleteAttachments,
  deleteSubTask,
  deleteTask,
  getSubTaskById,
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

// Task routes
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
  .patch(
    verifyJwt,
    uploadTaskAttachments,
    validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
    updateTask,
  )
  .delete(
    verifyJwt,
    validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
    deleteTask,
  );

// Subtask routes
router
  .route("/:projectId/task/:taskId")
  .get(verifyJwt, validateProjectPermission(AvailableUserRoles), getSubTasks)
  .post(verifyJwt, validateProjectPermission(AvailableUserRoles), createSubTask);

router
  .route("/:projectId/task/:taskId/subtask/:subTaskId")
  .get(verifyJwt, validateProjectPermission(AvailableUserRoles), getSubTaskById)
  .patch(verifyJwt, validateProjectPermission(AvailableUserRoles), updateSubTask)
  .delete(verifyJwt, validateProjectPermission(AvailableUserRoles), deleteSubTask);

// Additional routes for attachments
router.post("/:pid/task/:taskId/attachments/add", verifyJwt, addAttachments);
router.delete("/:pid/attachments/:aid/delete", verifyJwt, deleteAttachments);

export default router;
