import { api } from "@/lib/api/client";
import { createId } from "@/lib/lookups";
import { getData, updateData } from "@/lib/stores/data-store";
import type { EmployeeDocument } from "@/types";

export const documentService = {
  getDocuments() {
    return getData().documents;
  },
  getByEmployee(employeeId: string) {
    return getData().documents.filter((item) => item.employeeId === employeeId);
  },
  createDocument(input: Omit<EmployeeDocument, "id" | "uploadedAt">) {
    const document: EmployeeDocument = {
      ...input,
      id: createId("doc"),
      uploadedAt: new Date().toISOString().slice(0, 10),
    };
    updateData((data) => ({ documents: [document, ...data.documents] }));
    void api.createDocument(document);
    return document;
  },
};
