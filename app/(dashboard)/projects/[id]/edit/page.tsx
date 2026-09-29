"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/projects/project-form";
import { PageHeader } from "@/components/shared/page-header";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useAuthStore((state) => state.user);
  const project = useDataStore((state) => state.projects?.find((item) => item.id === id));

  if (user?.role !== "MANAGEMENT") {
    notFound();
  }
  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit project"
        description={`Update details for ${project.websiteName}.`}
      />
      <ProjectForm project={project} />
    </div>
  );
}
