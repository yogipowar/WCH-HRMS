import { api } from "@/lib/api/client";
import { getData, updateData } from "@/lib/stores/data-store";
import type { CompanySettings } from "@/types";

export const settingsService = {
  getSettings() {
    return getData().settings;
  },
  updateSettings(patch: Partial<CompanySettings>) {
    updateData((data) => ({ settings: { ...data.settings, ...patch } }));
    void api.updateSettings(getData().settings);
  },
};
