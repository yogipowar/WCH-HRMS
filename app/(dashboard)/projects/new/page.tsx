import { ProjectForm } from "@/components/projects/project-form";
import { PageHeader } from "@/components/shared/page-header";

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add project"
        description="Enter website details, credentials, technology, and assign the project team."
      />
      <ProjectForm />
    </div>
  );
}
