"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ProfilePhotoField } from "@/components/shared/profile-photo-field";
import { isUsernameTaken } from "@/lib/auth/credentials";
import { formatEmployeeDisplayName } from "@/lib/employee/display";
import { formGridClass, formWideClass } from "@/lib/ui/form-styles";
import { createId } from "@/lib/lookups";
import { employeeService } from "@/lib/services/employeeService";
import { useDataStore } from "@/lib/stores/data-store";
import { YEARLY_PAID_LEAVES, leaveYearLabel } from "@/lib/leave/policy";
import { employeeFormSchema, type EmployeeFormValues } from "@/lib/validations/employee";
import type { Employee, LeaveBalance } from "@/types";

const baseDefaults: EmployeeFormValues = {
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
  workStartTime: "09:30",
  lateAfterMinutes: 10,
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
  spentCasual: 0,
  spentSick: 0,
  spentPrivilege: 0,
};

function toDefaults(
  employee: Employee | undefined,
  username: string,
  settings: { defaultDailyHours: number; workStartTime: string; lateAfterMinutes: number },
  balance?: LeaveBalance,
): EmployeeFormValues {
  if (!employee) {
    return {
      ...baseDefaults,
      dailyRequiredHours: settings.defaultDailyHours || 9,
      workStartTime: settings.workStartTime || "09:30",
      lateAfterMinutes: settings.lateAfterMinutes ?? 10,
    };
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
    workStartTime: employee.workStartTime || settings.workStartTime || "09:30",
    lateAfterMinutes: employee.lateAfterMinutes ?? settings.lateAfterMinutes ?? 10,
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
    spentCasual: balance?.spentCasual ?? 0,
    spentSick: balance?.spentSick ?? 0,
    spentPrivilege: balance?.spentPrivilege ?? 0,
  };
}

export function EmployeeForm({ employee }: { employee?: Employee }) {
  const router = useRouter();
  const departments = useDataStore((state) => state.departments);
  const designations = useDataStore((state) => state.designations);
  const employees = useDataStore((state) => state.employees);
  const users = useDataStore((state) => state.users);
  const settings = useDataStore((state) => state.settings);
  const leaveBalance = useDataStore((state) => state.leaveBalances.find((item) => item.employeeId === employee?.id));
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(employee?.avatarUrl ?? null);
  const account = users.find((item) => item.id === employee?.userId);
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: toDefaults(employee, account?.username ?? "", settings, leaveBalance),
  });
  const spentHydrated = useRef(false);
  useEffect(() => {
    if (!employee || !leaveBalance || spentHydrated.current) return;
    form.setValue("spentCasual", leaveBalance.spentCasual ?? 0);
    form.setValue("spentSick", leaveBalance.spentSick ?? 0);
    form.setValue("spentPrivilege", leaveBalance.spentPrivilege ?? 0);
    spentHydrated.current = true;
  }, [employee, form, leaveBalance]);
  const selectedDepartmentId = form.watch("departmentId");
  const selectedDesignationId = form.watch("designationId");
  const watchedName = form.watch("fullName");
  const watchedGender = form.watch("gender");
  const departmentDesignations = useMemo(
    () =>
      designations.filter(
        (item) =>
          item.status === "ACTIVE" &&
          (!selectedDepartmentId || item.departmentId === selectedDepartmentId),
      ),
    [designations, selectedDepartmentId],
  );

  useEffect(() => {
    if (!selectedDesignationId) return;
    const stillValid = departmentDesignations.some((item) => item.id === selectedDesignationId);
    if (!stillValid) {
      form.setValue("designationId", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [departmentDesignations, form, selectedDesignationId]);

  async function onSubmit(values: EmployeeFormValues) {
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
      avatarUrl,
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
      workStartTime: values.workStartTime,
      lateAfterMinutes: values.lateAfterMinutes,
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
        employeeService.updateEmployee(
          employee.id,
          payload,
          {
            username: values.username,
            password: values.password || undefined,
          },
          {
            casual: values.spentCasual,
            sick: values.spentSick,
            privilege: values.spentPrivilege,
          },
        );
        toast.success("Employee updated.");
        router.push(`/employees/${employee.id}`);
        return;
      }

      const created = await employeeService.createEmployee(
        payload,
        {
          username: values.username,
          password: values.password,
        },
        {
          casual: values.spentCasual,
          sick: values.spentSick,
          privilege: values.spentPrivilege,
        },
      );
      toast.success("Employee added. They can sign in with the username and password you set.");
      router.push(`/employees/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save employee.");
    }
  }

  return (
    <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
      <Section title="Personal">
        <div className={formWideClass}>
          <Label className="mb-2 block">Profile photo</Label>
          <ProfilePhotoField
            fullName={watchedName || "Employee"}
            gender={watchedGender}
            value={avatarUrl}
            onChange={setAvatarUrl}
            hint="Upload a photo or pick an avatar. Male → Mr., Female → Ms. If empty, the default silhouette is used."
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Display name preview:{" "}
            <span className="font-medium text-foreground">
              {formatEmployeeDisplayName(watchedName || "Full name", watchedGender)}
            </span>
          </p>
        </div>
        <Field label="Full name" error={form.formState.errors.fullName?.message}>
          <Input {...form.register("fullName")} placeholder="Without Mr. / Ms. prefix" />
        </Field>
        <Field label="Date of birth" error={form.formState.errors.dateOfBirth?.message}>
          <Input type="date" {...form.register("dateOfBirth")} />
        </Field>
        <Field label="Gender" error={form.formState.errors.gender?.message}>
          <NativeSelect {...form.register("gender")}>
            <option value="MALE">Male (Mr.)</option>
            <option value="FEMALE">Female (Ms.)</option>
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
            {departments
              .filter((item) => item.status === "ACTIVE")
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </NativeSelect>
        </Field>
        <Field label="Designation" error={form.formState.errors.designationId?.message}>
          <NativeSelect {...form.register("designationId")} disabled={!selectedDepartmentId}>
            <option value="">
              {selectedDepartmentId ? "Select designation" : "Select department first"}
            </option>
            {departmentDesignations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Joining date" error={form.formState.errors.joiningDate?.message}>
          <Input type="date" {...form.register("joiningDate")} />
        </Field>
        <SpentLeaveFields
          spentCasual={form.watch("spentCasual")}
          spentSick={form.watch("spentSick")}
          spentPrivilege={form.watch("spentPrivilege")}
          errors={{
            casual: form.formState.errors.spentCasual?.message,
            sick: form.formState.errors.spentSick?.message,
            privilege: form.formState.errors.spentPrivilege?.message,
          }}
          register={form.register}
        />
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
                  {formatEmployeeDisplayName(item.fullName, item.gender)}
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
        <Field label="Work start" error={form.formState.errors.workStartTime?.message}>
          <Input type="time" {...form.register("workStartTime")} />
        </Field>
        <Field label="Late after (minutes)" error={form.formState.errors.lateAfterMinutes?.message}>
          <Input type="number" min={0} max={180} {...form.register("lateAfterMinutes", { valueAsNumber: true })} />
        </Field>
        <p className="md:col-span-3 text-xs text-muted-foreground">
          Work start and late grace default from Settings. Change them here only for this employee.
        </p>
      </Section>

      <Section title="Login credentials">
        <Field label="Username" error={form.formState.errors.username?.message}>
          <Input autoComplete="off" placeholder="e.g. neha.patel" {...form.register("username")} />
        </Field>
        {employee && account?.password ? (
          <Field label="Current password">
            <Input value={account.password} readOnly />
          </Field>
        ) : null}
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

function spentRemaining(spent: number, quota: number): number {
  const used = Number.isFinite(spent) ? spent : 0;
  return Math.max(0, Number((quota - used).toFixed(1)));
}

function SpentLeaveFields({
  spentCasual,
  spentSick,
  spentPrivilege,
  errors,
  register,
}: {
  spentCasual: number;
  spentSick: number;
  spentPrivilege: number;
  errors: { casual?: string; sick?: string; privilege?: string };
  register: UseFormRegister<EmployeeFormValues>;
}) {
  return (
    <>
      <Field label="Spent casual leave (CL)" error={errors.casual}>
        <Input type="number" min={0} max={YEARLY_PAID_LEAVES.casual} step={0.5} {...register("spentCasual", { valueAsNumber: true })} />
      </Field>
      <Field label="Spent sick leave (SL)" error={errors.sick}>
        <Input type="number" min={0} max={YEARLY_PAID_LEAVES.sick} step={0.5} {...register("spentSick", { valueAsNumber: true })} />
      </Field>
      <Field label="Spent privilege leave (PL)" error={errors.privilege}>
        <Input type="number" min={0} max={YEARLY_PAID_LEAVES.privilege} step={0.5} {...register("spentPrivilege", { valueAsNumber: true })} />
      </Field>
      <p className={`${formWideClass} text-xs text-muted-foreground`}>
        Leave year is {leaveYearLabel()}. Unused leave is not carried forward. Enter days already used in each type.
        After this, casual has {spentRemaining(spentCasual, YEARLY_PAID_LEAVES.casual)} of {YEARLY_PAID_LEAVES.casual} left, sick has{" "}
        {spentRemaining(spentSick, YEARLY_PAID_LEAVES.sick)} of {YEARLY_PAID_LEAVES.sick} left, and privilege has{" "}
        {spentRemaining(spentPrivilege, YEARLY_PAID_LEAVES.privilege)} of {YEARLY_PAID_LEAVES.privilege} left. Approved leave requests are deducted as well.
      </p>
    </>
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
