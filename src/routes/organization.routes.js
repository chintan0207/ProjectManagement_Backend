import { Router } from "express";
import {
  createOrganization,
  getMyOrganizations,
  getOrganizationById,
  updateOrganization,
  softDeleteOrganization,
  restoreOrganization,
  sendOrganizationInvite,
  joinOrganizationWithToken,
  getOrganizationMembers,
  updateMemberRole,
  removeMemberFromOrganization,
  getOrganizationActivityLogs,
  getOrganizationProjects,
} from "../controllers/organization.controller.js";

import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyJwt); // protect all routes

router.route("/").post(upload.single("logo"), createOrganization).get(getMyOrganizations);
router
  .route("/:orgId")
  .get(getOrganizationById)
  .patch(updateOrganization)
  .delete(softDeleteOrganization);
router.route("/:orgId/restore").patch(restoreOrganization);
router.route("/:orgId/invite").post(sendOrganizationInvite);
router.route("/join/:inviteToken").post(joinOrganizationWithToken);
router.route("/:orgId/members").get(getOrganizationMembers);
router
  .route("/:orgId/members/:userId")
  .patch(updateMemberRole)
  .delete(removeMemberFromOrganization);
router.route("/:orgId/activity-logs").get(getOrganizationActivityLogs);
router.route("/:orgId/projects").get(getOrganizationProjects);

export default router;
