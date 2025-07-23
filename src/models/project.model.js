import mongoose from "mongoose";
import {
  AvailableProjectPriorities,
  AvailableProjectStatuses,
  AvailableProjectVisibilities,
  ProjectPriorityEnum,
  ProjectRoleEnum,
  ProjectStatusEnum,
  ProjectVisibilityEnum,
} from "../utils/constant.js";

const projectSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    logo: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tags: {
      type: [String],
      default: [],
      index: true,
    },

    startDate: {
      type: Date,
      index: true,
    },

    dueDate: {
      type: Date,
      index: true,
    },

    status: {
      type: String,
      enum: AvailableProjectStatuses,
      default: ProjectStatusEnum.PLANNED,
    },

    priority: {
      type: String,
      enum: AvailableProjectPriorities,
      default: ProjectPriorityEnum.MEDIUM,
      index: true,
    },
    previousMembers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: { type: String, enum: ProjectRoleEnum },
      },
    ],

    visibility: {
      type: String,
      enum: AvailableProjectVisibilities,
      default: ProjectVisibilityEnum.PRIVATE,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: Date,
  },
  { timestamps: true },
);

projectSchema.index({ organizationId: 1, isDeleted: 1 });
projectSchema.index({ organizationId: 1, priority: 1 });
projectSchema.index({ organizationId: 1, dueDate: 1 });

export const Project = mongoose.model("Project", projectSchema);
