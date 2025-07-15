import { Router } from "express";
import {
  createTask,
  getTasksByProject,
  getTaskById,
  updateTask,
  deleteTask,
  restoreTask,
} from "../controllers/task.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJwt);

router.route("/project/:projectId").get(getTasksByProject);
router.route("/").post(createTask);
router.route("/:taskId").get(getTaskById).patch(updateTask).delete(deleteTask);

router.route("/:taskId/restore").patch(restoreTask);

export default router;
