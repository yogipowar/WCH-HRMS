import { AttendanceDetailPage } from "@/components/attendance/attendance-pages";
import { attendanceRecords } from "@/data/mock-data";

export function generateStaticParams() {
  return attendanceRecords.map((item) => ({ id: item.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AttendanceDetailPage id={id} />;
}
