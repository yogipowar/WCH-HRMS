"use client";

import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatEmployeeDisplayName } from "@/lib/employee/display";
import { getEmployeeByUser } from "@/lib/lookups";
import { useDataStore } from "@/lib/stores/data-store";
import type { User } from "@/types";

interface UserMenuProps {
  user: User;
  onLogout: () => void | Promise<void>;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const router = useRouter();
  const data = useDataStore();
  const employee = getEmployeeByUser(data, user.id);
  const displayName = employee
    ? formatEmployeeDisplayName(employee.fullName, employee.gender)
    : user.name;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-0.5 text-left hover:bg-muted">
        <EmployeeAvatar
          employee={
            employee ?? {
              fullName: user.name,
              avatarUrl: user.avatarUrl,
              gender: "PREFER_NOT_TO_SAY",
            }
          }
          className="size-8"
        />
        <span className="sr-only">{displayName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="space-y-0.5">
              <p>{displayName}</p>
              <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <UserRound />
          My Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            onLogout();
            router.push("/login");
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
