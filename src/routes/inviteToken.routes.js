import { Router } from "express";
import {
  getAllInviteTokens,
  createInviteToken,
  getInviteDetails,
  acceptInviteToken,
  softDeleteInviteToken,
} from "../controllers/inviteToken.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/").get(getAllInviteTokens).post(createInviteToken);
router.route("/:token").get(getInviteDetails).delete(softDeleteInviteToken);
router.route("/:token/accept").post(acceptInviteToken);

export default router;
