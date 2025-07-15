import { Router } from "express";
import {
  createKanbanBoard,
  getKanbanBoardsByProjectId,
  updateKanbanBoard,
  deleteKanbanBoard,
  restoreKanbanBoard,
  createKanbanColumn,
  getKanbanColumnsByBoardId,
  updateKanbanColumn,
  deleteKanbanColumn,
  createKanbanCard,
  updateKanbanCard,
  deleteKanbanCard,
  restoreKanbanCard,
} from "../controllers/kanban.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

// 🟩 Boards
router.route("/boards").post(createKanbanBoard);
router.route("/boards/:projectId").get(getKanbanBoardsByProjectId);
router.route("/boards/:boardId").patch(updateKanbanBoard).delete(deleteKanbanBoard);
router.route("/boards/:boardId/restore").post(restoreKanbanBoard);

// 🟦 Columns
router.route("/columns/:boardId").post(createKanbanColumn).get(getKanbanColumnsByBoardId);
router.route("/columns/:columnId").patch(updateKanbanColumn).delete(deleteKanbanColumn);

// 🟨 Cards
router.route("/cards/:columnId").post(createKanbanCard);
router.route("/cards/:cardId").patch(updateKanbanCard).delete(deleteKanbanCard);
router.route("/cards/:cardId/restore").post(restoreKanbanCard);

export default router;
