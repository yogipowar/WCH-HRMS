import { api } from "@/lib/api/client";
import { createId } from "@/lib/lookups";
import { localDateKey } from "@/lib/projects/codes";
import { getData, updateData } from "@/lib/stores/data-store";
import type { ProjectTask, ProjectTaskComment, ProjectTaskImage, ProjectTaskTimeEntry, TaskPriority, TaskStatus } from "@/types";

function removeTaskTree(taskId: string) {
  const tasks = getData().projectTasks ?? [];
  const ids = new Set<string>([taskId]);
  for (const task of tasks) {
    if (task.parentId && ids.has(task.parentId)) ids.add(task.id);
  }
  updateData((data) => ({
    projectTasks: (data.projectTasks ?? []).filter((item) => !ids.has(item.id)),
    projectTaskComments: (data.projectTaskComments ?? []).filter((item) => !ids.has(item.taskId)),
    projectTaskTimeEntries: (data.projectTaskTimeEntries ?? []).filter((item) => !item.taskId || !ids.has(item.taskId)),
    projectTaskImages: (data.projectTaskImages ?? []).filter((item) => !ids.has(item.taskId)),
  }));
}

export const projectTaskService = {
  async saveOverview(projectId: string, overview: string) {
    const now = new Date().toISOString();
    updateData((data) => ({
      projects: (data.projects ?? []).map((item) =>
        item.id === projectId ? { ...item, overview, updatedAt: now } : item,
      ),
    }));
    await api.updateProjectOverview(projectId, overview);
  },

  async createTask(input: {
    projectId: string;
    parentId: string | null;
    title: string;
    assigneeIds?: string[];
    createdBy: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    description?: string;
    startDate?: string | null;
    endDate?: string | null;
    durationHours?: number;
  }) {
    const now = new Date().toISOString();
    const siblings = (getData().projectTasks ?? []).filter(
      (item) => item.projectId === input.projectId && item.parentId === input.parentId,
    );
    const taskNo = siblings.reduce((max, item) => Math.max(max, item.taskNo || 0), 0) + 1;
    const task: ProjectTask = {
      id: createId("task"),
      projectId: input.projectId,
      parentId: input.parentId,
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      status: input.status ?? "TODO",
      priority: input.priority ?? "MEDIUM",
      assigneeIds: input.assigneeIds ?? [],
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      durationHours: Math.max(0, input.durationHours ?? 0),
      taskNo,
      sortOrder: siblings.length,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    updateData((data) => ({ projectTasks: [...(data.projectTasks ?? []), task] }));
    const saved = await api.createProjectTask(task);
    if (saved.taskNo !== task.taskNo) {
      updateData((data) => ({
        projectTasks: (data.projectTasks ?? []).map((item) => (item.id === task.id ? { ...item, taskNo: saved.taskNo } : item)),
      }));
    }
    return { ...task, taskNo: saved.taskNo };
  },

  async updateTask(id: string, patch: Partial<Omit<ProjectTask, "id" | "projectId" | "parentId" | "createdBy" | "createdAt">>) {
    const now = new Date().toISOString();
    updateData((data) => ({
      projectTasks: (data.projectTasks ?? []).map((item) =>
        item.id === id ? { ...item, ...patch, updatedAt: now } : item,
      ),
    }));
    await api.updateProjectTask(id, patch);
  },

  async deleteTask(id: string) {
    removeTaskTree(id);
    await api.deleteProjectTask(id);
  },

  async addComment(taskId: string, authorId: string, body: string) {
    const comment: ProjectTaskComment = {
      id: createId("pcmt"),
      taskId,
      authorId,
      body: body.trim(),
      createdAt: new Date().toISOString(),
    };
    updateData((data) => ({ projectTaskComments: [...(data.projectTaskComments ?? []), comment] }));
    await api.createProjectTaskComment(comment);
    return comment;
  },

  async addTime(
    taskId: string | null,
    employeeId: string,
    hours: number,
    note: string,
    workDate?: string,
    projectId?: string | null,
  ) {
    const task = taskId ? (getData().projectTasks ?? []).find((item) => item.id === taskId) : null;
    const entry: ProjectTaskTimeEntry = {
      id: createId("ptime"),
      taskId: taskId || null,
      projectId: projectId || task?.projectId || "",
      employeeId,
      hours,
      note: note.trim(),
      workDate: workDate && /^\d{4}-\d{2}-\d{2}$/.test(workDate) ? workDate : localDateKey(),
      createdAt: new Date().toISOString(),
    };
    updateData((data) => ({ projectTaskTimeEntries: [...(data.projectTaskTimeEntries ?? []), entry] }));
    await api.createProjectTaskTime(entry);
    return entry;
  },

  async removeTime(id: string) {
    updateData((data) => ({
      projectTaskTimeEntries: (data.projectTaskTimeEntries ?? []).filter((item) => item.id !== id),
    }));
    await api.deleteProjectTaskTime(id);
  },

  async addImage(input: {
    taskId: string;
    commentId: string | null;
    fileName: string;
    mimeType: string;
    dataBase64: string;
    uploadedBy: string;
  }) {
    const image: ProjectTaskImage = {
      id: createId("pimg"),
      taskId: input.taskId,
      commentId: input.commentId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      uploadedBy: input.uploadedBy,
      createdAt: new Date().toISOString(),
    };
    await api.createProjectTaskImage({
      id: image.id,
      taskId: image.taskId,
      commentId: image.commentId,
      fileName: image.fileName,
      mimeType: image.mimeType,
      dataBase64: input.dataBase64,
    });
    updateData((data) => ({ projectTaskImages: [...(data.projectTaskImages ?? []), image] }));
    return image;
  },
};
