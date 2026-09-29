import { TeamMemberPage } from "@/components/employees/team-member-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeamMemberPage employeeId={id} />;
}
