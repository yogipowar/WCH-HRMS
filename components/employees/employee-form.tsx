"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { isUsernameTaken } from "@/lib/auth/credentials";
import { formGridClass, formWideClass } from "@/lib/ui/form-styles";
import { createId } from "@/lib/lookups";
import { employeeService } from "@/lib/services/employeeService";
import { useDataStore } from "@/lib/stores/data-store";
import { employeeFormSchema, type EmployeeFormValues } from "@/lib/validations/employee";
import type { Employee } from "@/types";

const defaults: EmployeeFormValues = {
  fullName: "",
  dateOfBirth: "",
  gender: "MALE",
  phone: "",
  personalEmail: "",
  address: "",
  employeeCode: "",
  workEmail: "",
  departmentId: "",
  designationId: "",
  joiningDate: "",
  employmentType: "FULL_TIME",
  reportingPersonId: "",
  workLocation: "Pune",
  status: "ACTIVE",
  dailyRequiredHours: 9,
  basicSalary: 0,
  allowances: 0,
  deductions: 0,
  username: "",
  password: "",
  confirmPassword: "",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
  bankAccountHolder: "",
  bankName: "",
  bankAccountNumber: "",
  bankIfsc: "",
};

function toDefaults(employee?: Employee, username = ""): EmployeeFormValues {
  if (!employee) {
    return defaults;
  }
  return {
    fullName: employee.fullName,
    dateOfBirth: employee.dateOfBirth,
    gender: employee.gender,
    phone: employee.phone,
    personalEmail: employee.personalEmail,
    address: employee.address,
    employeeCode: employee.employeeCode,
    workEmail: employee.workEmail,
    departmentId: employee.departmentId,
    designationId: employee.designationId,
    joiningDate: employee.joiningDate,
    employmentType: employee.employmentType,
    reportingPersonId: employee.reportingPersonId ?? "",
    workLocation: employee.workLocation,
    status: employee.status,
    dailyRequiredHours: employee.dailyRequiredHours,
    basicSalary: employee.basicSalary,
    allowances: employee.allowances,
    deductions: employee.deductions,
    username,
    password: "",
    confirmPassword: "",
    emergencyName: employee.emergencyContact.name,
    emergencyRelationship: employee.emergencyContact.relationship,
    emergencyPhone: employee.emergencyContact.phone,
    bankAccountHolder: employee.bankInformation.accountHolder,
    bankName: employee.bankInformation.bankName,
    bankAccountNumber: employee.bankInformation.accountNumber,
    bankIfsc: employee.bankInformation.ifscCode,
  };
}

export function EmployeeForm({ employee }: { employee?: Employee }) {
  const router = useRouter();
  const departments = useDataStore((state) => state.departments);
  const designations = useDataStore((state) => state.designations);
  const employees = useDataStore((state) => state.employees);
  const users = useDataStore((state) => state.users);
  const [showPassword, setShowPassword] = useState(false);
  const account = users.find((item) => item.id === employee?.userId);
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: toDefaults(employee, account?.username ?? ""),
  });

  function onSubmit(values: EmployeeFormValues) {
    if (isUsernameTaken(values.username, employee?.userId)) {
      form.setError("username", { message: "This username is already taken" });
      return;
    }
    if (!employee && values.password.length < 6) {
      form.setError("password", { message: "Password must be at least 6 characters" });
      return;
    }
    if (values.password || values.confirmPassword) {
      if (values.password.length < 6) {
        form.setError("password", { message: "Password must be at least 6 characters" });
        return;
      }
      if (values.password !== values.confirmPassword) {
        form.setError("confirmPassword", { message: "Passwords do not match" });
        return;
      }
    }
    const payload = {
      employeeCode: values.employeeCode,
      userId: employee?.userId ?? createId("user"),
      fullName: values.fullName,
      avatarUrl: employee?.avatarUrl ?? null,
      dateOfBirth: values.dateOfBirth,
      gender: values.gender,
      phone: values.phone,
      personalEmail: values.personalEmail,
      workEmail: values.workEmail,
      address: values.address,
      departmentId: values.departmentId,
      designationId: values.designationId,
      joiningDate: values.joiningDate,
      employmentType: values.employmentType,
      reportingPersonId: values.reportingPersonId || null,
      workLocation: values.workLocation,
      status: values.status,
      dailyRequiredHours: values.dailyRequiredHours,
      basicSalary: values.basicSalary,
      allowances: values.allowances,
      deductions: values.deductions,
      emergencyContact: {
        name: values.emergencyName,
        relationship: values.emergencyRelationship,
        phone: values.emergencyPhone,
      },
      bankInformation: {
        accountHolder: values.bankAccountHolder || values.fullName,
        bankName: values.bankName || "Pending",
        accountNumber: values.bankAccountNumber || "XXXXXX0000",
        ifscCode: values.bankIfsc || "XXXX0000000",
      },
    };

    try {
      if (employee) {
        employeeService.updateEmployee(employee.id, payload, {
          username: values.username,
          password: values.password || undefined,
        });
        toast.success("Employee updated.");
        router.push(`/employees/${employee.id}`);
        return;
      }

      const created = employeeService.createEmployee(payload, {
        username: values.username,
        password: values.password,
      });
      toast.success("Employee added. They can sign in with the username and password you set.");
      router.push(`/employees/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save employee.");
    }
  }

  return (
    <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
      <Section title="Personal">
        <Field label="Full name" error={form.formState.errors.fullName?.message}>
          <Input {...form.register("fullName")} />
        </Field>
        <Field label="Date of birth" error={form.formState.errors.dateOfBirth?.message}>
          <Input type="date" {...form.register("dateOfBirth")} />
        </Field>
        <Field label="Gender" error={form.formState.errors.gender?.message}>
          <NativeSelect {...form.register("gender")}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </NativeSelect>
        </Field>
        <Field label="Phone" error={form.formState.errors.phone?.message}>
          <Input {...form.register("phone")} />
        </Field>
        <Field label="Personal email" error={form.formState.errors.personalEmail?.message}>
          <Input type="email" {...form.register("personalEmail")} />
        </Field>
        <Field label="Address" className={formWideClass} error={form.formState.errors.address?.message}>
          <Textarea {...form.register("address")} />
        </Field>
      </Section>

      <Section title="Professional">
        <Field label="Employee ID" error={form.formState.errors.employeeCode?.message}>
          <Input {...form.register("employeeCode")} />
        </Field>
        <Field label="Work email" error={form.formState.errors.workEmail?.message}>
          <Input type="email" {...form.register("workEmail")} />
        </Field>
        <Field label="Department" error={form.formState.errors.departmentId?.message}>
          <NativeSelect {...form.register("departmentId")}>
            <option value="">Select department</option>
            {departments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Designation" error={form.formState.errors.designationId?.message}>
          <NativeSelect {...form.register("designationId")}>
            <option value="">Select designation</option>
            {designations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Joining date" error={form.formState.errors.joiningDate?.message}>
          <Input type="date" {...form.register("joiningDate")} />
        </Field>
        <Field label="Employment type" error={form.formState.errors.employmentType?.message}>
          <NativeSelect {...form.register("employmentType")}>
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERN">Intern</option>
          </NativeSelect>
        </Field>
        <Field label="Reporting person">
          <NativeSelect {...form.register("reportingPersonId")}>
            <option value="">Agency Admin</option>
            {employees
              .filter((item) => item.id !== employee?.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.fullName}
                </option>
              ))}
          </NativeSelect>
        </Field>
        <Field label="Work location" error={form.formState.errors.workLocation?.message}>
          <Input {...form.register("workLocation")} />
        </Field>
        <Field label="Status">
          <NativeSelect {...form.register("status")}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </NativeSelect>
        </Field>
        <Field label="Daily required hours" error={form.formState.errors.dailyRequiredHours?.message}>
          <Input type="number" min={1} max={16} {...form.register("dailyRequiredHours", { valueAsNumber: true })} />
        </Field>
      </Section>

      <Section title="Login credentials">
        <Field label="Username" error={form.formState.errors.username?.message}>
          <Input autoComplete="off" placeholder="e.g. neha.patel" {...form.register("username")} />
        </Field>
        <Field
          label={employee ? "New password" : "Password"}
          error={form.formState.errors.password?.message}
        >
          <Input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder={employee ? "Leave blank to keep current" : "Set a login password"}
            {...form.register("password")}
          />
        </Field>
        <Field
          label={employee ? "Confirm new password" : "Confirm password"}
          error={form.formState.errors.confirmPassword?.message}
        >
          <Input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder={employee ? "Repeat new password" : "Repeat password"}
            {...form.register("confirmPassword")}
          />
        </Field>
        <div className="flex items-center gap-2 md:col-span-3">
          <input
            id="show-employee-password"
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />
          <Label htmlFor="show-employee-password">Show password</Label>
        </div>
      </Section>

      <Section title="Salary">
        <Field label="Basic salary" error={form.formState.errors.basicSalary?.message}>
          <Input type="number" min={1} step={1} {...form.register("basicSalary", { valueAsNumber: true })} />
        </Field>
        <Field label="Allowances" error={form.formState.errors.allowances?.message}>
          <Input type="number" min={0} step={1} {...form.register("allowances", { valueAsNumber: true })} />
        </Field>
        <Field label="Deductions" error={form.formState.errors.deductions?.message}>
          <Input type="number" min={0} step={1} {...form.register("deductions", { valueAsNumber: true })} />
        </Field>
      </Section>

      <Section title="Emergency contact">
        <Field label="Contact name" error={form.formState.errors.emergencyName?.message}>
          <Input {...form.register("emergencyName")} />
        </Field>
        <Field label="Relationship" error={form.formState.errors.emergencyRelationship?.message}>
          <Input {...form.register("emergencyRelationship")} />
        </Field>
        <Field label="Emergency phone" error={form.formState.errors.emergencyPhone?.message}>
          <Input {...form.register("emergencyPhone")} />
        </Field>
      </Section>

      <Section title="Bank information">
        <Field label="Account holder">
          <Input {...form.register("bankAccountHolder")} />
        </Field>
        <Field label="Bank name">
          <Input {...form.register("bankName")} />
        </Field>
        <Field label="Account number">
          <Input {...form.register("bankAccountNumber")} />
        </Field>
        <Field label="IFSC">
          <Input {...form.register("bankIfsc")} />
        </Field>
      </Section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {employee ? "Save changes" : "Add employee"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className={formGridClass}>{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5">{label}</Label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
