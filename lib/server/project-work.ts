import type { RowDataPacket } from "mysql2";
import { INTERNAL_OFFICE_ID } from "@/lib/projects/codes";
import { asProjectStatus, knownRequirementIds, PROJECT_STATUSES } from "@/lib/projects/requirements";
import { ensureProjectsTable, execute, query } from "@/lib/server/db";
import type {
  ProjectTask,
  ProjectTaskComment,
  ProjectTaskImage,
  ProjectTaskTimeEntry,
  TaskPriority,
  TaskStatus,
  User,
} from "@/types";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function jsonResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function memberIds(project: RowDataPacket) {
  const ids = new Set<string>();
  if (project.project_manager_id) ids.add(String(project.project_manager_id));
  try {
    const parsed = JSON.parse(String(project.team_member_ids ?? "[]"));
    if (Array.isArray(parsed)) {
      for (const id of parsed) {
        if (id) ids.add(String(id));
      }
    }
  } catch {
    // Ignore a corrupt team list and keep the manager only.
  }
  return ids;
}

function canAccessProject(user: User, project: RowDataPacket) {
  if (user.role === "MANAGEMENT") return true;
  if (!user.employeeId) return false;
  return memberIds(project).has(user.employeeId);
}

function safeId(value: unknown) {
  const id = String(value ?? "").trim();
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) return "";
  return id;
}

function asStatus(value: unknown): TaskStatus | null {
  const status = String(value ?? "");
  return TASK_STATUSES.includes(status as TaskStatus) ? (status as TaskStatus) : null;
}

function asPriority(value: unknown): TaskPriority | null {
  const priority = String(value ?? "");
  return TASK_PRIORITIES.includes(priority as TaskPriority) ? (priority as TaskPriority) : null;
}

function hours(value: unknown, max: number) {
  const parsed = number(value);
  if (parsed < 0) return 0;
  return Math.round(Math.min(parsed, max) * 100) / 100;
}

export function mapProjectTask(row: RowDataPacket): ProjectTask {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    parentId: row.parent_id ? String(row.parent_id) : null,
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    status: asStatus(row.status) ?? "TODO",
    priority: asPriority(row.priority) ?? "MEDIUM",
    assigneeIds: readAssigneeIds(row),
    startDate: dateOnly(row.start_date),
    endDate: dateOnly(row.end_date),
    durationHours: hours(row.duration_hours, 9999),
    taskNo: Math.max(0, Math.round(number(row.task_no))),
    sortOrder: number(row.sort_order),
    createdBy: String(row.created_by ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function mapProjectTaskComment(row: RowDataPacket): ProjectTaskComment {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    authorId: String(row.author_id),
    body: String(row.body ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

export function mapProjectTaskTime(row: RowDataPacket): ProjectTaskTimeEntry {
  return {
    id: String(row.id),
    taskId: row.task_id ? String(row.task_id) : null,
    projectId: row.project_id ? String(row.project_id) : "",
    employeeId: String(row.employee_id),
    hours: hours(row.hours, 24),
    note: String(row.note ?? ""),
    workDate: dateOnly(row.work_date) ?? String(row.created_at ?? "").slice(0, 10),
    createdAt: String(row.created_at ?? ""),
  };
}

export function mapProjectTaskImage(row: RowDataPacket): ProjectTaskImage {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    commentId: row.comment_id ? String(row.comment_id) : null,
    fileName: String(row.file_name ?? ""),
    mimeType: String(row.mime_type ?? ""),
    uploadedBy: String(row.uploaded_by ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

async function requireProject(user: User, projectId: string) {
  await ensureProjectsTable();
  const rows = await query("SELECT * FROM projects WHERE id = ?", [projectId]);
  const project = rows[0];
  if (!project) return jsonResponse(404, { error: "Project not found." });
  if (!canAccessProject(user, project)) return jsonResponse(403, { error: "You are not on this project." });
  return project;
}

async function requireTask(user: User, taskId: string) {
  await ensureProjectsTable();
  const rows = await query("SELECT * FROM project_tasks WHERE id = ?", [taskId]);
  const task = rows[0];
  if (!task) return jsonResponse(404, { error: "Task not found." });
  const project = await requireProject(user, String(task.project_id));
  if (project instanceof Response) return project;
  return { task, project };
}

function readAssigneeIds(row: RowDataPacket) {
  const ids: string[] = [];
  const raw = row.assignee_ids;
  if (raw != null && raw !== "") {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const id = safeId(item);
          if (id && !ids.includes(id)) ids.push(id);
        }
      }
    } catch {
      // Fall back to the older single assignee column.
    }
  }
  if (ids.length === 0 && row.assignee_id) {
    const id = safeId(row.assignee_id);
    if (id) ids.push(id);
  }
  return ids;
}

async function nextTaskNo(projectId: string, parentId: string | null) {
  const rows = parentId
    ? await query("SELECT COALESCE(MAX(task_no), 0) AS n FROM project_tasks WHERE parent_id = ?", [parentId])
    : await query(
        "SELECT COALESCE(MAX(task_no), 0) AS n FROM project_tasks WHERE project_id = ? AND parent_id IS NULL",
        [projectId],
      );
  return Math.max(0, Math.round(number(rows[0]?.n))) + 1;
}

async function assignableIds(project: RowDataPacket) {
  const ids = memberIds(project);
  const rows = await query(
    `SELECT e.id AS id FROM employees e
     INNER JOIN users u ON u.id = e.user_id
     WHERE u.role = 'MANAGEMENT'
     UNION
     SELECT employee_id AS id FROM users
     WHERE role = 'MANAGEMENT' AND employee_id IS NOT NULL AND employee_id <> ''
     UNION
     SELECT id AS id FROM users
     WHERE role = 'MANAGEMENT'`,
  );
  for (const row of rows) {
    const id = safeId(row.id);
    if (id) ids.add(id);
  }
  return ids;
}

async function assigneesOrError(project: RowDataPacket, value: unknown) {
  if (!Array.isArray(value)) return jsonResponse(400, { error: "Choose the people on this task." });
  const members = await assignableIds(project);
  const ids: string[] = [];
  for (const item of value) {
    const id = safeId(item);
    if (!id) return jsonResponse(400, { error: "Assignee is invalid." });
    if (!members.has(id)) {
      return jsonResponse(400, { error: "Assign the task to the project manager, a team member, or an admin." });
    }
    if (!ids.includes(id)) ids.push(id);
  }
  if (ids.length > 20) return jsonResponse(400, { error: "A task can have up to 20 people." });
  return ids;
}

export async function deleteProjectWork(projectId: string) {
  await ensureProjectsTable();
  await execute("DELETE FROM project_task_time WHERE project_id = ?", [projectId]);
  const tasks = await query("SELECT id FROM project_tasks WHERE project_id = ?", [projectId]);
  const ids = tasks.map((row) => String(row.id));
  if (ids.length === 0) return;
  const marks = ids.map(() => "?").join(",");
  await execute(`DELETE FROM project_task_images WHERE task_id IN (${marks})`, ids);
  await execute(`DELETE FROM project_task_comments WHERE task_id IN (${marks})`, ids);
  await execute(`DELETE FROM project_task_time WHERE task_id IN (${marks})`, ids);
  await execute(`DELETE FROM project_tasks WHERE id IN (${marks})`, ids);
}

function storedIds(value: unknown) {
  if (value == null || value === "") return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return knownRequirementIds(Array.isArray(parsed) ? parsed.map((item) => String(item)) : []);
  } catch {
    return [];
  }
}

async function saveStatus(request: Request, user: User, projectId: string) {
  const project = await requireProject(user, projectId);
  if (project instanceof Response) return project;
  const isManager = Boolean(user.employeeId) && String(project.project_manager_id ?? "") === user.employeeId;
  if (user.role !== "MANAGEMENT" && !isManager) {
    return jsonResponse(403, { error: "Only an admin or the project manager can change the project status." });
  }
  const body = (await request.json().catch(() => ({}))) as { status?: unknown };
  const status = String(body.status ?? "");
  if (!PROJECT_STATUSES.includes(status as (typeof PROJECT_STATUSES)[number])) {
    return jsonResponse(400, { error: "Choose a project status." });
  }
  const updatedAt = new Date().toISOString();
  await execute("UPDATE projects SET status = ?, updated_at = ? WHERE id = ?", [asProjectStatus(status), updatedAt, projectId]);
  return jsonResponse(200, { status: asProjectStatus(status), updatedAt });
}

async function saveRequirement(request: Request, user: User, projectId: string) {
  const project = await requireProject(user, projectId);
  if (project instanceof Response) return project;
  const body = (await request.json().catch(() => ({}))) as { requirementId?: unknown; completed?: unknown };
  const requirementId = knownRequirementIds([String(body.requirementId ?? "")])[0];
  if (!requirementId) return jsonResponse(400, { error: "Choose a requirement." });
  const selected = storedIds(project.requirement_ids);
  if (!selected.includes(requirementId)) {
    return jsonResponse(400, { error: "This requirement is not on the project." });
  }
  const completed = new Set(storedIds(project.completed_requirement_ids));
  if (body.completed) completed.add(requirementId);
  else completed.delete(requirementId);
  const completedRequirementIds = selected.filter((id) => completed.has(id));
  const updatedAt = new Date().toISOString();
  await execute("UPDATE projects SET completed_requirement_ids = ?, updated_at = ? WHERE id = ?", [
    JSON.stringify(completedRequirementIds),
    updatedAt,
    projectId,
  ]);
  return jsonResponse(200, { completedRequirementIds, updatedAt });
}

async function saveOverview(request: Request, user: User, projectId: string) {
  const project = await requireProject(user, projectId);
  if (project instanceof Response) return project;
  const body = (await request.json().catch(() => ({}))) as { overview?: unknown };
  const overview = String(body.overview ?? "").trim().slice(0, 20000);
  const updatedAt = new Date().toISOString();
  await execute("UPDATE projects SET overview = ?, updated_at = ? WHERE id = ?", [overview, updatedAt, projectId]);
  return jsonResponse(200, { overview, updatedAt });
}

async function createTask(request: Request, user: User) {
  const body = (await request.json().catch(() => ({}))) as Partial<ProjectTask> & { assigneeId?: string | null };
  const id = safeId(body.id);
  const projectId = safeId(body.projectId);
  const title = String(body.title ?? "").trim().slice(0, 200);
  if (!id || !projectId || !title) return jsonResponse(400, { error: "A task needs a title." });
  const project = await requireProject(user, projectId);
  if (project instanceof Response) return project;
  const parentId = body.parentId ? safeId(body.parentId) : "";
  if (body.parentId && !parentId) return jsonResponse(400, { error: "Subtask parent is invalid." });
  if (parentId) {
    const parents = await query("SELECT project_id, parent_id FROM project_tasks WHERE id = ?", [parentId]);
    const parent = parents[0];
    if (!parent || String(parent.project_id) !== projectId || parent.parent_id) {
      return jsonResponse(400, { error: "A subtask belongs to a main task on this project." });
    }
  }
  const taskNo = await nextTaskNo(projectId, parentId || null);
  const requestedAssignees = Array.isArray(body.assigneeIds)
    ? body.assigneeIds
    : body.assigneeId
      ? [body.assigneeId]
      : [];
  const assigneeIds = await assigneesOrError(project, requestedAssignees);
  if (assigneeIds instanceof Response) return assigneeIds;
  const status = asStatus(body.status) ?? "TODO";
  const priority = asPriority(body.priority) ?? "MEDIUM";
  const now = new Date().toISOString();
  const task: ProjectTask = {
    id,
    projectId,
    parentId: parentId || null,
    title,
    description: String(body.description ?? "").trim().slice(0, 8000),
    status,
    priority,
    assigneeIds,
    startDate: dateOnly(body.startDate),
    endDate: dateOnly(body.endDate),
    durationHours: hours(body.durationHours, 9999),
    taskNo,
    sortOrder: Math.max(0, Math.round(number(body.sortOrder))),
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  };
  await execute(
    `INSERT INTO project_tasks (
      id, project_id, parent_id, title, description, status, priority, assignee_id, assignee_ids,
      start_date, end_date, duration_hours, sort_order, task_no, created_by, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      task.id,
      task.projectId,
      task.parentId,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.assigneeIds[0] ?? null,
      JSON.stringify(task.assigneeIds),
      task.startDate,
      task.endDate,
      task.durationHours,
      task.sortOrder,
      task.taskNo,
      task.createdBy,
      task.createdAt,
      task.updatedAt,
    ],
  );
  return jsonResponse(200, task);
}

async function updateTask(request: Request, user: User, taskId: string) {
  const loaded = await requireTask(user, taskId);
  if (loaded instanceof Response) return loaded;
  const current = mapProjectTask(loaded.task);
  const body = (await request.json().catch(() => ({}))) as Partial<ProjectTask> & { assigneeId?: string | null };
  const title = body.title == null ? current.title : String(body.title).trim().slice(0, 200);
  if (!title) return jsonResponse(400, { error: "A task needs a title." });
  const status = body.status == null ? current.status : asStatus(body.status);
  const priority = body.priority == null ? current.priority : asPriority(body.priority);
  if (!status || !priority) return jsonResponse(400, { error: "Choose a valid status and priority." });
  const requestedAssignees = body.assigneeIds === undefined
    ? body.assigneeId === undefined
      ? current.assigneeIds
      : body.assigneeId
        ? [body.assigneeId]
        : []
    : body.assigneeIds;
  const assigneeIds = await assigneesOrError(loaded.project, requestedAssignees);
  if (assigneeIds instanceof Response) return assigneeIds;
  const next: ProjectTask = {
    ...current,
    title,
    description: body.description == null ? current.description : String(body.description).trim().slice(0, 8000),
    status,
    priority,
    assigneeIds,
    startDate: body.startDate === undefined ? current.startDate : dateOnly(body.startDate),
    endDate: body.endDate === undefined ? current.endDate : dateOnly(body.endDate),
    durationHours: body.durationHours == null ? current.durationHours : hours(body.durationHours, 9999),
    updatedAt: new Date().toISOString(),
  };
  await execute(
    `UPDATE project_tasks SET
      title=?, description=?, status=?, priority=?, assignee_id=?, assignee_ids=?,
      start_date=?, end_date=?, duration_hours=?, updated_at=?
     WHERE id=?`,
    [
      next.title,
      next.description,
      next.status,
      next.priority,
      next.assigneeIds[0] ?? null,
      JSON.stringify(next.assigneeIds),
      next.startDate,
      next.endDate,
      next.durationHours,
      next.updatedAt,
      taskId,
    ],
  );
  return jsonResponse(200, next);
}

async function deleteTask(user: User, taskId: string) {
  const loaded = await requireTask(user, taskId);
  if (loaded instanceof Response) return loaded;
  const rows = await query("SELECT id FROM project_tasks WHERE id = ? OR parent_id = ?", [taskId, taskId]);
  const ids = rows.map((row) => String(row.id));
  if (ids.length === 0) return jsonResponse(200, { ok: true });
  const marks = ids.map(() => "?").join(",");
  await execute(`DELETE FROM project_task_images WHERE task_id IN (${marks})`, ids);
  await execute(`DELETE FROM project_task_comments WHERE task_id IN (${marks})`, ids);
  await execute(`DELETE FROM project_task_time WHERE task_id IN (${marks})`, ids);
  await execute(`DELETE FROM project_tasks WHERE id IN (${marks})`, ids);
  return jsonResponse(200, { ok: true, ids });
}

async function createComment(request: Request, user: User) {
  const body = (await request.json().catch(() => ({}))) as Partial<ProjectTaskComment>;
  const id = safeId(body.id);
  const taskId = safeId(body.taskId);
  const text = String(body.body ?? "").trim().slice(0, 4000);
  if (!id || !taskId || !text) return jsonResponse(400, { error: "Write a comment before posting." });
  const loaded = await requireTask(user, taskId);
  if (loaded instanceof Response) return loaded;
  const comment: ProjectTaskComment = {
    id,
    taskId,
    authorId: user.id,
    body: text,
    createdAt: new Date().toISOString(),
  };
  await execute(
    `INSERT INTO project_task_comments (id, task_id, author_id, body, created_at) VALUES (?,?,?,?,?)`,
    [comment.id, comment.taskId, comment.authorId, comment.body, comment.createdAt],
  );
  return jsonResponse(200, comment);
}

async function createTime(request: Request, user: User) {
  const body = (await request.json().catch(() => ({}))) as Partial<ProjectTaskTimeEntry>;
  const id = safeId(body.id);
  const rawTask = body.taskId;
  const taskId = rawTask ? safeId(rawTask) : "";
  const logged = hours(body.hours, 24);
  if (!id || logged <= 0) return jsonResponse(400, { error: "Enter the hours you spent, up to 24 at a time." });
  if (rawTask && !taskId) return jsonResponse(400, { error: "Task is invalid." });
  const requestedProjectId = safeId(body.projectId);
  const internalOffice = !taskId && requestedProjectId === INTERNAL_OFFICE_ID;
  let project: RowDataPacket | null = null;
  if (taskId) {
    const loaded = await requireTask(user, taskId);
    if (loaded instanceof Response) return loaded;
    project = loaded.project;
  } else if (!internalOffice) {
    if (!requestedProjectId) return jsonResponse(400, { error: "Choose a project." });
    const loaded = await requireProject(user, requestedProjectId);
    if (loaded instanceof Response) return loaded;
    project = loaded;
  }
  const requested = body.employeeId ? safeId(body.employeeId) : "";
  let employeeId = user.employeeId ?? "";
  if (user.role === "MANAGEMENT" && requested) employeeId = requested;
  if (!employeeId) return jsonResponse(400, { error: "Choose who the hours belong to." });
  if (project && !(await assignableIds(project)).has(employeeId)) {
    return jsonResponse(400, { error: "Log hours for the project manager, a team member, or an admin." });
  }
  if (user.role !== "MANAGEMENT" && employeeId !== user.employeeId) {
    return jsonResponse(403, { error: "You can log hours for yourself." });
  }
  const entry: ProjectTaskTimeEntry = {
    id,
    taskId: taskId || null,
    projectId: internalOffice ? INTERNAL_OFFICE_ID : String(project?.id ?? ""),
    employeeId,
    hours: logged,
    note: String(body.note ?? "").trim().slice(0, 500),
    workDate: dateOnly(body.workDate) ?? new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };
  await execute(
    `INSERT INTO project_task_time (id, task_id, project_id, employee_id, hours, note, work_date, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    [entry.id, entry.taskId, entry.projectId, entry.employeeId, entry.hours, entry.note, entry.workDate, entry.createdAt],
  );
  return jsonResponse(200, entry);
}

async function deleteTime(user: User, entryId: string) {
  const id = safeId(entryId);
  if (!id) return jsonResponse(400, { error: "Time entry is invalid." });
  const rows = await query("SELECT id, task_id, project_id, employee_id FROM project_task_time WHERE id = ?", [id]);
  const row = rows[0];
  if (!row) return jsonResponse(404, { error: "Time entry not found." });
  const projectId = String(row.project_id ?? "");
  if (projectId !== INTERNAL_OFFICE_ID) {
    const loaded = row.task_id ? await requireTask(user, String(row.task_id)) : await requireProject(user, projectId);
    if (loaded instanceof Response) return loaded;
  }
  if (user.role !== "MANAGEMENT" && user.employeeId !== String(row.employee_id) && user.id !== String(row.employee_id)) {
    return jsonResponse(403, { error: "You can remove your own time entry." });
  }
  await execute("DELETE FROM project_task_time WHERE id = ?", [id]);
  return jsonResponse(200, { ok: true, id });
}

async function createImage(request: Request, user: User) {
  const body = (await request.json().catch(() => ({}))) as {
    id?: unknown;
    taskId?: unknown;
    commentId?: unknown;
    fileName?: unknown;
    mimeType?: unknown;
    dataBase64?: unknown;
  };
  const id = safeId(body.id);
  const taskId = safeId(body.taskId);
  const mimeType = String(body.mimeType ?? "");
  if (!id || !taskId) return jsonResponse(400, { error: "Image is missing a task." });
  if (!IMAGE_TYPES.has(mimeType)) return jsonResponse(400, { error: "Use a JPG, PNG, WEBP, or GIF image." });
  const cleaned = String(body.dataBase64 ?? "").replace(/\s/g, "");
  if (!cleaned || cleaned.length > Math.ceil(MAX_IMAGE_BYTES * 1.37)) {
    return jsonResponse(400, { error: "Image must be 4 MB or smaller." });
  }
  const file = Buffer.from(cleaned, "base64");
  if (!file.length || file.length > MAX_IMAGE_BYTES) {
    return jsonResponse(400, { error: "Image must be 4 MB or smaller." });
  }
  const loaded = await requireTask(user, taskId);
  if (loaded instanceof Response) return loaded;
  let commentId: string | null = null;
  if (body.commentId) {
    commentId = safeId(body.commentId);
    if (!commentId) return jsonResponse(400, { error: "Comment is invalid." });
    const comments = await query("SELECT task_id FROM project_task_comments WHERE id = ?", [commentId]);
    if (!comments[0] || String(comments[0].task_id) !== taskId) {
      return jsonResponse(400, { error: "That comment is not on this task." });
    }
  }
  const image: ProjectTaskImage = {
    id,
    taskId,
    commentId,
    fileName: String(body.fileName ?? "image").replace(/[^\w.\- ]+/g, "").slice(0, 200) || "image",
    mimeType,
    uploadedBy: user.id,
    createdAt: new Date().toISOString(),
  };
  await execute(
    `INSERT INTO project_task_images (
      id, task_id, comment_id, file_name, mime_type, file_data, uploaded_by, created_at
    ) VALUES (?,?,?,?,?,?,?,?)`,
    [image.id, image.taskId, image.commentId, image.fileName, image.mimeType, file, image.uploadedBy, image.createdAt],
  );
  return jsonResponse(200, image);
}

async function readImage(user: User, imageId: string) {
  await ensureProjectsTable();
  const rows = await query(
    `SELECT i.file_data, i.mime_type, i.file_name, t.project_id
     FROM project_task_images i
     INNER JOIN project_tasks t ON t.id = i.task_id
     WHERE i.id = ?`,
    [imageId],
  );
  const row = rows[0];
  if (!row) return jsonResponse(404, { error: "Image not found." });
  const project = await requireProject(user, String(row.project_id));
  if (project instanceof Response) return project;
  const data = row.file_data as Buffer;
  const bytes = Buffer.isBuffer(data) ? new Uint8Array(data) : new Uint8Array();
  const fileName = String(row.file_name ?? "image").replace(/["\r\n]/g, "");
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": String(row.mime_type || "application/octet-stream"),
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}

export async function handleProjectWorkRequest(request: Request, parts: string[], user: User) {
  const overview = parts[0] === "projects" && parts.length === 3 && parts[2] === "overview";
  const statusRoute = parts[0] === "projects" && parts.length === 3 && parts[2] === "status";
  const requirementRoute = parts[0] === "projects" && parts.length === 3 && parts[2] === "requirements";
  const workRoot = parts[0] === "project-tasks" || parts[0] === "project-task-comments" || parts[0] === "project-task-time" || parts[0] === "project-task-images";
  if (!overview && !statusRoute && !requirementRoute && !workRoot) return null;

  if (overview) {
    if (request.method !== "PATCH") return jsonResponse(405, { error: "Method not allowed." });
    return saveOverview(request, user, parts[1]);
  }
  if (statusRoute) {
    if (request.method !== "PATCH") return jsonResponse(405, { error: "Method not allowed." });
    return saveStatus(request, user, parts[1]);
  }
  if (requirementRoute) {
    if (request.method !== "PATCH") return jsonResponse(405, { error: "Method not allowed." });
    return saveRequirement(request, user, parts[1]);
  }

  if (parts[0] === "project-tasks" && request.method === "POST" && !parts[1]) {
    return createTask(request, user);
  }
  if (parts[0] === "project-tasks" && parts[1] && request.method === "PATCH") {
    return updateTask(request, user, parts[1]);
  }
  if (parts[0] === "project-tasks" && parts[1] && request.method === "DELETE") {
    return deleteTask(user, parts[1]);
  }
  if (parts[0] === "project-task-comments" && request.method === "POST") {
    return createComment(request, user);
  }
  if (parts[0] === "project-task-time" && request.method === "POST" && !parts[1]) {
    return createTime(request, user);
  }
  if (parts[0] === "project-task-time" && parts[1] && request.method === "DELETE") {
    return deleteTime(user, parts[1]);
  }
  if (parts[0] === "project-task-images" && request.method === "POST" && !parts[1]) {
    return createImage(request, user);
  }
  if (parts[0] === "project-task-images" && parts[1] && request.method === "GET") {
    return readImage(user, parts[1]);
  }
  return jsonResponse(405, { error: "Method not allowed." });
}
