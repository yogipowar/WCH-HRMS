import { z } from "zod";

export const leaveFormSchema = z
  .object({
    type: z.enum(["CASUAL", "SICK", "PRIVILEGE"]),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    isHalfDay: z.boolean(),
    reason: z.string().min(8, "Please provide a short reason"),
    attachmentName: z.string().optional(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "End date cannot be before the start date",
    path: ["endDate"],
  });

export type LeaveFormValues = z.infer<typeof leaveFormSchema>;
