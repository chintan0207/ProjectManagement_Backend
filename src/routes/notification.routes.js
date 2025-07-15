import { Router } from "express";
import {
  getAllNotifications,
  markNotificationAsRead,
  markNotificationAsUnread,
  softDeleteNotification,
  restoreNotification,
} from "../controllers/notification.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/").get(getAllNotifications);
router.route("/:id/read").patch(markNotificationAsRead);
router.route("/:id/unread").patch(markNotificationAsUnread);
router.route("/:id").delete(softDeleteNotification);
router.route("/:id/restore").patch(restoreNotification);

export default router;
