import { z } from "zod";
import { PROJECT_STATUSES } from "@/lib/projects/requirements";

export const projectFormSchema = z.object({
  serialNo: z.number().int().min(1, "Sr No is required"),
  websiteName: z.string().min(2, "Website name is required"),
  websiteUrl: z.string().min(1, "Website URL is required"),
  loginUsername: z.string(),
  loginPassword: z.string(),
  technologyUsed: z.string().min(1, "Technology used is required"),
  figmaLink: z.string(),
  remark: z.string(),
  status: z.enum(PROJECT_STATUSES),
  requirementIds: z.array(z.string()),
  projectManagerId: z.string().nullable(),
  teamMemberIds: z.array(z.string()),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
