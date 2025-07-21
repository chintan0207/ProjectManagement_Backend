import mongoose from "mongoose";
import { AvailableOrgRoles, OrgRoleEnum } from "../utils/constant.js";

const organizationMemberSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: AvailableOrgRoles,
      default: OrgRoleEnum.MEMBER,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: Date,
  },
  { timestamps: true },
);

export const OrganizationMember = mongoose.model("OrganizationMember", organizationMemberSchema);
