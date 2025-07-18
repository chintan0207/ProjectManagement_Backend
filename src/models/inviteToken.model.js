import mongoose from "mongoose";
import { AvailableOrgRoles, OrgRoleEnum } from "../utils/constant.js";

const inviteTokenSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
    role: { type: String, enum: AvailableOrgRoles, default: OrgRoleEnum.MEMBER },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true },
);

export const InviteToken = mongoose.model("InviteToken", inviteTokenSchema);
