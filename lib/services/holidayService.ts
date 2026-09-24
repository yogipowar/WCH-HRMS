import { api } from "@/lib/api/client";
import { createId } from "@/lib/lookups";
import { getData, updateData } from "@/lib/stores/data-store";
import type { Holiday } from "@/types";

export const holidayService = {
  getHolidays() {
    return getData().holidays;
  },
  createHoliday(input: Omit<Holiday, "id">) {
    const holiday: Holiday = { ...input, id: createId("hol") };
    updateData((data) => ({ holidays: [...data.holidays, holiday] }));
    void api.createHoliday(holiday);
    return holiday;
  },
  updateHoliday(id: string, patch: Partial<Holiday>) {
    updateData((data) => ({
      holidays: data.holidays.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
    const holiday = getData().holidays.find((item) => item.id === id);
    if (holiday) void api.updateHoliday(id, holiday);
  },
  deleteHoliday(id: string) {
    updateData((data) => ({
      holidays: data.holidays.filter((item) => item.id !== id),
    }));
    void api.deleteHoliday(id);
  },
};
