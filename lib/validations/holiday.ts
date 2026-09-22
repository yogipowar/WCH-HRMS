import { z } from "zod";

export const holidayFormSchema = z.object({
  name: z.string().min(2, "Holiday name is required"),
  date: z.string().min(1, "Date is required"),
  type: z.enum(["PUBLIC", "OPTIONAL", "COMPANY", "RELIGIOUS"]),
  description: z.string().min(4, "Description is required"),
  recurring: z.boolean(),
});

export type HolidayFormValues = z.infer<typeof holidayFormSchema>;
