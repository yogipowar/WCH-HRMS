"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  formatEmployeeDisplayName,
  resolveEmployeeAvatarUrl,
} from "@/lib/employee/display";
import { initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { Employee, Gender } from "@/types";

type AvatarEmployee = Pick<Employee, "fullName" | "avatarUrl"> & { gender?: Gender | null };

export function EmployeeAvatar({
  employee,
  className,
  fallbackClassName,
}: {
  employee: AvatarEmployee | null | undefined;
  className?: string;
  fallbackClassName?: string;
}) {
  const name = employee?.fullName ?? "Employee";
  const src = resolveEmployeeAvatarUrl(employee);
  return (
    <Avatar className={className}>
      <AvatarImage src={src} alt={formatEmployeeDisplayName(name, employee?.gender)} />
      <AvatarFallback className={fallbackClassName}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

export function EmployeeDisplayName({
  fullName,
  gender,
  className,
}: {
  fullName: string;
  gender?: Gender | null;
  className?: string;
}) {
  return <span className={cn(className)}>{formatEmployeeDisplayName(fullName, gender)}</span>;
}
