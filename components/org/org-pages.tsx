"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ActiveBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { formDialogClass, formFieldControlClass, formGridClass } from "@/lib/ui/form-styles";
import { departmentService, designationService } from "@/lib/services/departmentService";
import { getEmployeeName } from "@/lib/lookups";
import { useDataStore } from "@/lib/stores/data-store";
import { formatDate } from "@/lib/utils/format";
import type { Department, Designation } from "@/types";

export function DepartmentsPage() {
  const data = useDataStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const columns: DataTableColumn<Department>[] = [
    { id: "name", header: "Department", accessor: (row) => row.name, cell: (row) => row.name },
    { id: "head", header: "Head", cell: (row) => (row.headEmployeeId ? getEmployeeName(data, row.headEmployeeId) : "Unassigned") },
    { id: "count", header: "Employees", cell: (row) => data.employees.filter((item) => item.departmentId === row.id).length },
    { id: "status", header: "Status", cell: (row) => <ActiveBadge active={row.status === "ACTIVE"} /> },
    { id: "created", header: "Created", cell: (row) => formatDate(row.createdAt) },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditing(row); setName(row.name); setDescription(row.description); setOpen(true); }}>Edit</Button>
          <Button size="sm" variant="destructive" onClick={() => { departmentService.deactivateDepartment(row.id); toast.success("Department deactivated."); }}>Deactivate</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="Organize the agency by function." actions={<Button onClick={() => { setEditing(null); setName(""); setDescription(""); setOpen(true); }}>Add department</Button>} />
      <DataTable data={data.departments} columns={columns} rowKey={(row) => row.id} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={formDialogClass}>
          <DialogHeader><DialogTitle>{editing ? "Edit department" : "Add department"}</DialogTitle></DialogHeader>
          <form
            className={formGridClass}
            onSubmit={(event) => {
              event.preventDefault();
              if (editing) {
                departmentService.updateDepartment(editing.id, { name, description });
                toast.success("Department updated.");
              } else {
                departmentService.createDepartment({ name, description, headEmployeeId: null, status: "ACTIVE" });
                toast.success("Department added.");
              }
              setOpen(false);
            }}
          >
            <div>
              <Label>Name</Label>
              <Input className="mt-1.5" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div>
              <Label>Description</Label>
              <Input className="mt-1.5" value={description} onChange={(event) => setDescription(event.target.value)} required />
            </div>
            <div className="flex items-end">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DesignationsPage() {
  const data = useDataStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Designation | null>(null);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState(data.departments[0]?.id ?? "");

  const columns: DataTableColumn<Designation>[] = [
    { id: "name", header: "Designation", accessor: (row) => row.name, cell: (row) => row.name },
    { id: "department", header: "Department", cell: (row) => data.departments.find((item) => item.id === row.departmentId)?.name ?? "—" },
    { id: "count", header: "Employees", cell: (row) => data.employees.filter((item) => item.designationId === row.id).length },
    { id: "status", header: "Status", cell: (row) => <ActiveBadge active={row.status === "ACTIVE"} /> },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <Button size="sm" variant="outline" onClick={() => { setEditing(row); setName(row.name); setDepartmentId(row.departmentId); setOpen(true); }}>Edit</Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Designations" description="Role titles mapped to departments." actions={<Button onClick={() => { setEditing(null); setName(""); setOpen(true); }}>Add designation</Button>} />
      <DataTable data={data.designations} columns={columns} rowKey={(row) => row.id} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={formDialogClass}>
          <DialogHeader><DialogTitle>{editing ? "Edit designation" : "Add designation"}</DialogTitle></DialogHeader>
          <form
            className={formGridClass}
            onSubmit={(event) => {
              event.preventDefault();
              if (editing) {
                designationService.updateDesignation(editing.id, { name, departmentId });
                toast.success("Designation updated.");
              } else {
                designationService.createDesignation({ name, departmentId, status: "ACTIVE" });
                toast.success("Designation added.");
              }
              setOpen(false);
            }}
          >
            <div>
              <Label>Name</Label>
              <Input className="mt-1.5" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div>
              <Label>Department</Label>
              <NativeSelect className={formFieldControlClass} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                {data.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </NativeSelect>
            </div>
            <div className="flex items-end">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
