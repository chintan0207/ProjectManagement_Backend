import mongoose from "mongoose";
import {
  AvailableSubscriptionPlans,
  AvailableSubscriptionStatuses,
  OrgRoleEnum,
  SubscriptionPlanEnum,
  SubscriptionStatusEnum,
} from "../utils/constant.js";

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    logo: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    subscription: {
      plan: {
        type: String,
        enum: AvailableSubscriptionPlans,
        default: SubscriptionPlanEnum.FREE,
      },
      stripeCustomerId: String,
      status: {
        type: String,
        enum: AvailableSubscriptionStatuses,
        default: SubscriptionStatusEnum.ACTIVE,
      },
      trialEndsAt: Date,
    },
    previousMembers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: { type: String, enum: OrgRoleEnum },
      },
    ],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true },
);

export const Organization = mongoose.model("Organization", organizationSchema);
