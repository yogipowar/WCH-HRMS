"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/shared/link-button";
import { TimesheetLogForm } from "@/components/timesheet/timesheet-log-form";
import { Card, CardContent } from "@/components/ui/card";
import { localDateKey } from "@/lib/projects/codes";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";

export function TimesheetLogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const employees = useDataStore((state) => state.employees);
  const users = useDataStore((state) => state.users);
  const initialDate = searchParams.get("date");
  const initialPerson = searchParams.get("person");
  const [date, setDate] = useState(initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : localDateKey());
  const [personId, setPersonId] = useState(initialPerson ?? "");

  const people = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    for (const employee of employees) {
      options.push({ id: employee.id, label: employee.fullName });
    }
    for (const account of users) {
      if (account.role !== "MANAGEMENT") continue;
      const linked = employees.some((employee) => employee.userId === account.id || employee.id === account.employeeId);
      if (linked) continue;
      options.push({ id: account.id, label: `${account.name} (Admin)` });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [employees, users]);

  useEffect(() => {
    if (user && user.role !== "MANAGEMENT") router.replace("/timesheet");
  }, [router, user]);

  if (user && user.role !== "MANAGEMENT") return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log work"
        description="Choose the person, the day, and the work. The entry is saved on that person's timesheet."
        actions={<LinkButton href="/timesheet" variant="outline">Back to timesheet</LinkButton>}
      />
      <Card>
        <CardContent className="pt-6">
          <TimesheetLogForm
            date={date}
            personId={personId}
            people={people}
            showPerson
            showDate
            onDateChange={setDate}
            onPersonChange={setPersonId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
