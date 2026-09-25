import { LeaveDetailPage } from "@/components/leave/leave-pages";
import { leaveRequests } from "@/data/mock-data";

export function generateStaticParams() {
  return leaveRequests.map((item) => ({ id: item.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LeaveDetailPage id={id} />;
}
