/** Timesheet choice for work that is not on a client project. */
export const INTERNAL_OFFICE_ID = "internal-office";
export const INTERNAL_OFFICE_LABEL = "Internal office";

export function projectCode(serialNo: number) {
  return `P-${String(Math.max(0, serialNo)).padStart(3, "0")}`;
}

export function itemCode(
  serialNo: number,
  task: { taskNo: number; parentId: string | null },
  tasks: { id: string; taskNo: number }[],
) {
  const project = projectCode(serialNo);
  const own = Math.max(0, Number(task.taskNo) || 0);
  if (!task.parentId) return `${project}-T${String(own).padStart(3, "0")}`;
  const parentNo = tasks.find((item) => item.id === task.parentId)?.taskNo ?? 0;
  return `${project}-T${String(Math.max(0, parentNo)).padStart(3, "0")}.${own || 1}`;
}

export function localDateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function entryWorkDate(entry: { workDate?: string | null; createdAt: string }) {
  if (entry.workDate && /^\d{4}-\d{2}-\d{2}$/.test(entry.workDate)) return entry.workDate;
  return entry.createdAt.slice(0, 10);
}
