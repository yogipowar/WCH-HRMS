import { EmployeeForm } from "@/components/employees/employee-form";
import { PageHeader } from "@/components/shared/page-header";

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Add employee" description="Create a new team member and set their login credentials." />
      <EmployeeForm />
    </div>
  );
}
