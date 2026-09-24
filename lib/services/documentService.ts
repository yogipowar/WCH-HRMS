import { api } from "@/lib/api/client";
import { BASE_PATH } from "@/lib/constants";
import { getData, updateData } from "@/lib/stores/data-store";
import type { DocumentType, EmployeeDocument } from "@/types";

export const documentService = {
  getDocuments() {
    return getData().documents;
  },
  getByEmployee(employeeId: string) {
    return getData().documents.filter((item) => item.employeeId === employeeId);
  },
  documentFileHref(id: string) {
    return `${BASE_PATH}/api/documents/${id}/file`;
  },
  async uploadDocument(input: {
    employeeId: string;
    type: DocumentType;
    name: string;
    expiryDate: string | null;
    file: File;
  }) {
    const body = new FormData();
    body.append("employeeId", input.employeeId);
    body.append("type", input.type);
    body.append("name", input.name);
    if (input.expiryDate) {
      body.append("expiryDate", input.expiryDate);
    }
    body.append("file", input.file);
    const document = await api.uploadDocument(body);
    updateData((data) => ({ documents: [document, ...data.documents] }));
    return document;
  },
};

export type { EmployeeDocument };
