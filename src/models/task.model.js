import mongoose, { Schema } from "mongoose";
import {
  AvailableTaskPriorities,
  AvailableTaskStatuses,
  TaskPriorityEnum,
  TaskStatusEnum,
} from "../utils/constant.js";

const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: AvailableTaskStatuses,
      default: TaskStatusEnum.TODO,
    },

    attachments: {
      type: [
        {
          url: String,
          mimetype: String,
          size: Number,
        },
      ],
      default: [],
    },

    dueDate: {
      type: Date,
    },

    priority: {
      type: String,
      enum: AvailableTaskPriorities,
      default: TaskPriorityEnum.MEDIUM,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export const Task = mongoose.model("Task", taskSchema);
