// src/validations/project.validation.js
import { z } from "zod";
import {
  AvailableProjectStatuses,
  AvailableProjectPriorities,
  AvailableProjectVisibilities,
} from "../utils/constant.js";

export const createProjectSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  visibility: z.enum(AvailableProjectVisibilities).optional(),
  priority: z.enum(AvailableProjectPriorities).optional(),
  status: z.enum(AvailableProjectStatuses).optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
});
