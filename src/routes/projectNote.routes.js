import { Router } from "express";
import {
  createProjectNote,
  getProjectNotes,
  getProjectNoteById,
  updateProjectNote,
  softDeleteProjectNote,
  restoreProjectNote,
  getDeletedProjectNotes,
} from "../controllers/projectNote.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJwt); // protect all project note routes

router.route("/project/:projectId").get(getProjectNotes).post(createProjectNote);
router
  .route("/:noteId")
  .get(getProjectNoteById)
  .patch(updateProjectNote)
  .delete(softDeleteProjectNote);
router.route("/:noteId/restore").patch(restoreProjectNote);

// admin
router.route("/deleted/list").get(getDeletedProjectNotes);

export default router;
