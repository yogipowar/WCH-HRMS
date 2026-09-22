import { createId } from "@/lib/lookups";
import { getData, updateData } from "@/lib/stores/data-store";
import type { Department, Designation } from "@/types";

export const departmentService = {
  getDepartments() {
    return getData().departments;
  },
  createDepartment(input: Omit<Department, "id" | "createdAt">) {
    const department: Department = {
      ...input,
      id: createId("dept"),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    updateData((data) => ({ departments: [...data.departments, department] }));
    return department;
  },
  updateDepartment(id: string, patch: Partial<Department>) {
    updateData((data) => ({
      departments: data.departments.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  },
  deactivateDepartment(id: string) {
    this.updateDepartment(id, { status: "INACTIVE" });
  },
};

export const designationService = {
  getDesignations() {
    return getData().designations;
  },
  createDesignation(input: Omit<Designation, "id">) {
    const designation: Designation = { ...input, id: createId("des") };
    updateData((data) => ({ designations: [...data.designations, designation] }));
    return designation;
  },
  updateDesignation(id: string, patch: Partial<Designation>) {
    updateData((data) => ({
      designations: data.designations.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  },
};
