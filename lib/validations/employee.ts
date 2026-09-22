import { z } from "zod";

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
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
