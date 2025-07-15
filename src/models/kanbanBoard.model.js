import mongoose from "mongoose";

const kanbanBoardSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true },
);

export const KanbanBoard = mongoose.model("KanbanBoard", kanbanBoardSchema);
