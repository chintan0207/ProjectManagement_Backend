import mongoose from "mongoose";
import {
  AvailableSubscriptionPlans,
  AvailableSubscriptionStatuses,
  SubscriptionPlanEnum,
  SubscriptionStatusEnum,
} from "../utils/constant";

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    logo: {
      type: String,
    },
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
      stripeCustomerId: {
        type: String,
      },
      status: {
        type: String,
        enum: AvailableSubscriptionStatuses,
        default: SubscriptionStatusEnum.ACTIVE,
      },
      trialEndsAt: {
        type: Date,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

export const Organization = mongoose.model("Organization", organizationSchema);
