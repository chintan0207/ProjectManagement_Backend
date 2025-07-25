import { Router } from "express";

import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  createSubTask,
  getSubTasksByTaskId,
  updateSubTask,
  softDeleteSubTask,
  restoreSubTask,
  getDeletedSubTasks,
  getSubTaskById,
} from "../controllers/subtasks.controller.js";

const router = Router();

router.use(verifyJwt);

router.route("/task/:taskId").get(getSubTasksByTaskId).post(createSubTask);

router.route("/:subTaskId").patch(updateSubTask).delete(softDeleteSubTask).get(getSubTaskById);

router.route("/:subTaskId/restore").patch(restoreSubTask);

router.route("/deleted/list").get(getDeletedSubTasks);

export default router;
