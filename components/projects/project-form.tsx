"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formFieldControlClass, formGridClass, formWideClass } from "@/lib/ui/form-styles";
import { PROJECT_REQUIREMENTS, PROJECT_STATUSES, PROJECT_STATUS_LABELS, knownRequirementIds } from "@/lib/projects/requirements";
import { projectService } from "@/lib/services/projectService";
import { useDataStore } from "@/lib/stores/data-store";
import { projectFormSchema, type ProjectFormValues } from "@/lib/validations/project";
import type { Project } from "@/types";

function emptyValues(serialNo: number): ProjectFormValues {
  return {
    serialNo,
    websiteName: "",
    websiteUrl: "",
    loginUsername: "",
    loginPassword: "",
    technologyUsed: "",
    figmaLink: "",
    remark: "",
    status: "UPCOMING",
    requirementIds: [],
    projectManagerId: null,
    teamMemberIds: [],
  };
}

function toValues(project: Project): ProjectFormValues {
  return {
    serialNo: project.serialNo,
    websiteName: project.websiteName,
    websiteUrl: project.websiteUrl,
    loginUsername: project.loginUsername,
    loginPassword: project.loginPassword,
    technologyUsed: project.technologyUsed,
    figmaLink: project.figmaLink,
    remark: project.remark,
    status: project.status ?? "UPCOMING",
    requirementIds: knownRequirementIds(project.requirementIds ?? []),
    projectManagerId: project.projectManagerId,
    teamMemberIds: project.teamMemberIds,
  };
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const employees = useDataStore((state) => state.employees);
  const projects = useDataStore((state) => state.projects ?? []);
  const [showPassword, setShowPassword] = useState(false);
  const activeEmployees = useMemo(
    () =>
      [...employees]
        .filter((item) => item.status === "ACTIVE")
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [employees],
  );

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: project ? toValues(project) : emptyValues(projectService.nextSerialNo()),
  });
  const selectedTeamIds = form.watch("teamMemberIds") ?? [];
  const selectedRequirements = form.watch("requirementIds") ?? [];
  const projectManagerId = form.watch("projectManagerId");

  function toggleTeamMember(id: string) {
    const current = form.getValues("teamMemberIds") ?? [];
    form.setValue(
      "teamMemberIds",
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      { shouldDirty: true },
    );
  }

  function toggleRequirement(id: string) {
    const current = form.getValues("requirementIds") ?? [];
    form.setValue(
      "requirementIds",
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      { shouldDirty: true },
    );
  }

  const allRequirementsSelected = PROJECT_REQUIREMENTS.every((item) => selectedRequirements.includes(item.id));

  function toggleAllRequirements() {
    form.setValue(
      "requirementIds",
      allRequirementsSelected ? [] : PROJECT_REQUIREMENTS.map((item) => item.id),
      { shouldDirty: true },
    );
  }

  function onSubmit(values: ProjectFormValues) {
    const serialTaken = projects.some(
      (item) => item.serialNo === values.serialNo && item.id !== project?.id,
    );
    if (serialTaken) {
      form.setError("serialNo", { message: "This Sr No is already used." });
      return;
    }
    const requirementIds = knownRequirementIds(values.requirementIds);
    const payload = {
      ...values,
      overview: project?.overview ?? "",
      status: values.status,
      requirementIds,
      completedRequirementIds: knownRequirementIds(project?.completedRequirementIds ?? []).filter((id) =>
        requirementIds.includes(id),
      ),
      websiteUrl: normalizeUrl(values.websiteUrl),
      figmaLink: values.figmaLink.trim() ? normalizeUrl(values.figmaLink) : "",
      projectManagerId: values.projectManagerId || null,
      teamMemberIds: values.teamMemberIds.filter((id) => id !== values.projectManagerId),
    };
    if (project) {
      projectService.updateProject(project.id, payload);
      toast.success("Project updated.");
    } else {
      projectService.createProject(payload);
      toast.success("Project added.");
    }
    router.push("/projects");
  }

  return (
    <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
      <Section title="Project details">
        <Field label="Sr No" error={form.formState.errors.serialNo?.message}>
          <Input type="number" min={1} {...form.register("serialNo", { valueAsNumber: true })} />
        </Field>
        <Field label="Website name" error={form.formState.errors.websiteName?.message}>
          <Input {...form.register("websiteName")} />
        </Field>
        <Field label="Website URL" error={form.formState.errors.websiteUrl?.message}>
          <Input placeholder="https://example.com" {...form.register("websiteUrl")} />
        </Field>
        <Field label="User id" error={form.formState.errors.loginUsername?.message}>
          <Input autoComplete="off" {...form.register("loginUsername")} />
        </Field>
        <Field label="Pass" error={form.formState.errors.loginPassword?.message}>
          <div className="flex gap-2">
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              {...form.register("loginPassword")}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
        </Field>
        <Field label="Status">
          <NativeSelect className={formFieldControlClass} {...form.register("status")}>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Technology used" error={form.formState.errors.technologyUsed?.message}>
          <Input placeholder="Next.js, PHP, WordPress..." {...form.register("technologyUsed")} />
        </Field>
        <Field label="Figma link" className={formWideClass} error={form.formState.errors.figmaLink?.message}>
          <Input placeholder="https://www.figma.com/..." {...form.register("figmaLink")} />
        </Field>
        <Field label="Remark" className={formWideClass} error={form.formState.errors.remark?.message}>
          <Textarea rows={3} {...form.register("remark")} />
        </Field>
      </Section>

      <Section title="Common requirements">
        <Field label="Select the requirements for this project" className={formWideClass}>
          <label className="mb-3 flex items-center gap-2 border-b pb-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={allRequirementsSelected}
              ref={(node) => {
                if (node) node.indeterminate = selectedRequirements.length > 0 && !allRequirementsSelected;
              }}
              onChange={toggleAllRequirements}
            />
            <span>Select all</span>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {PROJECT_REQUIREMENTS.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedRequirements.includes(item.id)}
                  onChange={() => toggleRequirement(item.id)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Team">
        <Field label="Project manager" className={formWideClass}>
          <NativeSelect
            className={formFieldControlClass}
            value={projectManagerId ?? ""}
            onChange={(event) =>
              form.setValue("projectManagerId", event.target.value || null, { shouldDirty: true })
            }
          >
            <option value="">Select project manager</option>
            {activeEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName} ({employee.employeeCode})
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Team members" className={formWideClass}>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
            {activeEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active employees available.</p>
            ) : (
              activeEmployees.map((employee) => {
                const checked = selectedTeamIds.includes(employee.id);
                const isPm = projectManagerId === employee.id;
                return (
                  <label key={employee.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isPm}
                      onChange={() => toggleTeamMember(employee.id)}
                    />
                    <span>
                      {employee.fullName}
                      {isPm ? " (project manager)" : ""}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </Field>
      </Section>

      <div className="flex flex-wrap gap-2">
        <Button type="submit">{project ? "Save changes" : "Add project"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/projects")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className={formGridClass}>{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5">{label}</Label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
