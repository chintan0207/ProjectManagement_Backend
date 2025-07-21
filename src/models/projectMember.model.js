import mongoose from "mongoose";
import { AvailableProjectRoles, ProjectRoleEnum } from "../utils/constant.js";

const projectMemberSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: AvailableProjectRoles,
      default: ProjectRoleEnum.MEMBER,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    removedAt: Date,
  },
  { timestamps: true },
);

export const ProjectMember = mongoose.model("ProjectMember", projectMemberSchema);
