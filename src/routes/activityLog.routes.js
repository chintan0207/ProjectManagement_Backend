import { Router } from "express";
import {
  getUserActivityLogs,
  getOrganizationActivityLogs,
  getProjectActivityLogs,
  softDeleteActivityLog,
  restoreActivityLog,
} from "../controllers/activityLog.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.get("/", getUserActivityLogs);
router.get("/organizations/:orgId", getOrganizationActivityLogs);
router.get("/projects/:projectId", getProjectActivityLogs);
router.delete("/:logId", softDeleteActivityLog);
router.patch("/:logId/restore", restoreActivityLog);

export default router;
