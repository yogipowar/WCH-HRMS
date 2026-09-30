import { z } from "zod";
import { YEARLY_PAID_LEAVES } from "@/lib/leave/policy";

export const employeeFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
  phone: z.string().min(8, "Phone number is required"),
  personalEmail: z.string().email("Enter a valid personal email"),
  address: z.string().min(4, "Address is required"),
  employeeCode: z.string().min(3, "Employee ID is required"),
  workEmail: z.string().email("Enter a valid work email"),
  departmentId: z.string().min(1, "Department is required"),
  designationId: z.string().min(1, "Designation is required"),
  joiningDate: z.string().min(1, "Joining date is required"),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]),
  reportingPersonId: z.string().optional(),
  workLocation: z.string().min(2, "Work location is required"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  dailyRequiredHours: z.number().min(1).max(16),
  workStartTime: z.string().min(1, "Work start time is required"),
  lateAfterMinutes: z.number().min(0).max(180),
  basicSalary: z.number().min(1, "Basic salary is required"),
  allowances: z.number().min(0, "Allowances cannot be negative"),
  deductions: z.number().min(0, "Deductions cannot be negative"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be 32 characters or fewer")
    .regex(/^[a-zA-Z0-9._-]+$/, "Use letters, numbers, dots, hyphens, or underscores"),
  password: z.string(),
  confirmPassword: z.string(),
  emergencyName: z.string().min(2, "Emergency contact name is required"),
  emergencyRelationship: z.string().min(2, "Relationship is required"),
  emergencyPhone: z.string().min(8, "Emergency phone is required"),
  bankAccountHolder: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc: z.string().optional(),
  spentCasual: z.number().min(0, "Spent casual leave cannot be negative"),
  spentSick: z.number().min(0, "Spent sick leave cannot be negative"),
  spentPrivilege: z.number().min(0, "Spent privilege leave cannot be negative"),
}).superRefine((values, ctx) => {
  const checks = [
    ["spentCasual", values.spentCasual, YEARLY_PAID_LEAVES.casual, "casual"],
    ["spentSick", values.spentSick, YEARLY_PAID_LEAVES.sick, "sick"],
    ["spentPrivilege", values.spentPrivilege, YEARLY_PAID_LEAVES.privilege, "privilege"],
  ] as const;
  for (const [path, spent, max, label] of checks) {
    if (spent > max) {
      ctx.addIssue({
        code: "custom",
        path: [path],
        message: `Spent ${label} leave cannot be more than ${max}.`,
      });
    }
  }
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
