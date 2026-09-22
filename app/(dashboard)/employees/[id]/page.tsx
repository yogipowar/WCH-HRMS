import { Suspense } from "react";
import { EmployeeProfilePage } from "@/components/employees/employee-profile-page";
import { ProfileSkeleton } from "@/components/shared/loading-skeletons";
import { employees } from "@/data/mock-data";

export function generateStaticParams() {
  return employees.map((item) => ({ id: item.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <EmployeeProfilePage employeeId={id} />
    </Suspense>
  );
}
