import { z } from "zod";
import { isInCurrentLeaveYear, leaveYearLabel } from "@/lib/leave/policy";
import { todayIsoDate } from "@/lib/utils/format";

export const leaveFormSchema = z
  .object({
    type: z.enum(["CASUAL", "SICK", "PRIVILEGE"]),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    isHalfDay: z.boolean(),
    reason: z.string().min(8, "Please provide a short reason"),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "End date cannot be before the start date",
    path: ["endDate"],
  })
  .refine((value) => value.startDate >= todayIsoDate(), {
    message: "Leave date cannot be earlier than today",
    path: ["startDate"],
  })
  .refine((value) => isInCurrentLeaveYear(value.startDate) && isInCurrentLeaveYear(value.endDate), {
    message: `Leave must fall in the current leave year (${leaveYearLabel()}). Unused leave is not carried forward.`,
    path: ["endDate"],
  });

export type LeaveFormValues = z.infer<typeof leaveFormSchema>;
