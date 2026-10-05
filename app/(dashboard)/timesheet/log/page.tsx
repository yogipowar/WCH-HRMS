import { Suspense } from "react";
import { TimesheetLogPage } from "@/components/timesheet/timesheet-log-page";

export default function Page() {
  return (
    <Suspense>
      <TimesheetLogPage />
    </Suspense>
  );
}
