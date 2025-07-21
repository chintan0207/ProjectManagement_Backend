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
  deleteOrganization,
} from "../controllers/organization.controller.js";

import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { createOrganizationSchema, inviteUserSchema } from "../validators/organization.validation.js";
import { validate } from "../middlewares/zodValidator.middleware.js";
import { validateOrgPermission } from "../middlewares/permission.middleware.js";
import { AvailableOrgRoles, OrgRoleEnum } from "../utils/constant.js";

const router = Router();

router.use(verifyJwt); // protect all routes

router
  .route("/")
  .post(upload.single("logo"), validate(createOrganizationSchema), createOrganization)
  .get(getMyOrganizations);
router
  .route("/:orgId")
  .get(getOrganizationById)
  .patch(upload.single("logo"), validateOrgPermission([OrgRoleEnum.ORG_ADMIN]), updateOrganization)
  .delete(validateOrgPermission([OrgRoleEnum.ORG_ADMIN]), softDeleteOrganization);

router.route("/:orgId/delete").delete(deleteOrganization);
router.route("/:orgId/restore").patch(restoreOrganization);
router.route("/:orgId/invite").post(validate(inviteUserSchema), sendOrganizationInvite);
router.route("/join/:inviteToken").post(joinOrganizationWithToken);
router
  .route("/:orgId/members")
  .get(validateOrgPermission(AvailableOrgRoles), getOrganizationMembers);

router
  .route("/:orgId/members/:userId")
  .patch(validateOrgPermission([OrgRoleEnum.ORG_ADMIN]), updateMemberRole)
  .delete(validateOrgPermission([OrgRoleEnum.ORG_ADMIN]), removeMemberFromOrganization);

export default router;
