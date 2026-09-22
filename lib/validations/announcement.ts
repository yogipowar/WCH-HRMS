import { z } from "zod";

export const announcementFormSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().min(8, "Description is required"),
  audience: z.enum(["ALL", "MANAGEMENT", "EMPLOYEE", "DEPARTMENT"]),
  departmentId: z.string().optional(),
  publishDate: z.string().min(1, "Publish date is required"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;
