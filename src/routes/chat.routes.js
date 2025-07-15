
import { Router } from "express";
import {
  createChatRoom,
  getChatRoomByProjectId,
  getChatRoomWithMessages,
  softDeleteChatRoom,
  sendMessage,
  getMessagesInRoom,
  markMessageAsRead,
  softDeleteMessage,
  restoreDeletedMessage,
} from "../controllers/chat.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

// Chat Room routes
router.post("/chatrooms", createChatRoom);
router.get("/chatrooms/:projectId", getChatRoomByProjectId);
router.get("/chatrooms/:roomId/details", getChatRoomWithMessages);
router.delete("/chatrooms/:roomId", softDeleteChatRoom);

// Message routes
router.post("/chatrooms/:roomId/messages", sendMessage);
router.get("/chatrooms/:roomId/messages", getMessagesInRoom);
router.patch("/messages/:messageId/read", markMessageAsRead);
router.delete("/messages/:messageId", softDeleteMessage);
router.patch("/messages/:messageId/restore", restoreDeletedMessage);

export default router;
