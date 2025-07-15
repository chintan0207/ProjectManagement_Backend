import mongoose from "mongoose";

const kanbanColumnSchema = new mongoose.Schema(
  {
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: "KanbanBoard", required: true },
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true },
);

export const KanbanColumn = mongoose.model("KanbanColumn", kanbanColumnSchema);
