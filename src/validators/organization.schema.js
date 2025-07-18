import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  // logo: z.string().min(1, "Logo is required"),
});
