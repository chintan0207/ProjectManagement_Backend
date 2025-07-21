import { z } from "zod";
import { AvailableOrgRoles } from "../utils/constant.js";

const organizationBaseSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
});

export const createOrganizationSchema = organizationBaseSchema;
export const updateOrganizationSchema = organizationBaseSchema;

export const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(AvailableOrgRoles),
});
