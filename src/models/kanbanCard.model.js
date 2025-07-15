import mongoose from "mongoose";

const kanbanCardSchema = new mongoose.Schema(
  {
    columnId: { type: mongoose.Schema.Types.ObjectId, ref: "KanbanColumn", required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    order: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true },
);

export const KanbanCard = mongoose.model("KanbanCard", kanbanCardSchema);



