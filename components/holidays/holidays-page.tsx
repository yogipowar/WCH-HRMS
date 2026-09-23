"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formDialogClass, formFieldControlClass, formGridClass, formWideClass } from "@/lib/ui/form-styles";
import { holidayService } from "@/lib/services/holidayService";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDataStore } from "@/lib/stores/data-store";
import { weeklyOffsInMonth, workWeekPolicyLabel } from "@/lib/attendance/work-calendar";
import { formatDate } from "@/lib/utils/format";
import { holidayFormSchema, type HolidayFormValues } from "@/lib/validations/holiday";
import type { Holiday } from "@/types";
import { parseISO } from "date-fns";

export function HolidaysPage() {
  const user = useAuthStore((state) => state.user);
  const holidays = useDataStore((state) => state.holidays);
  const settings = useDataStore((state) => state.settings);
  const [month, setMonth] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const canManage = user?.role === "MANAGEMENT";
  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: { name: "", date: "", type: "COMPANY", description: "", recurring: true },
  });

  const selectedDates = useMemo(() => holidays.map((item) => parseISO(item.date)), [holidays]);
  const weeklyOffs = useMemo(() => weeklyOffsInMonth(month, settings), [month, settings]);
  const weeklyOffDates = useMemo(() => weeklyOffs.map((item) => parseISO(item.date)), [weeklyOffs]);
  const upcoming = [...holidays].filter((item) => item.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date));

  const columns: DataTableColumn<Holiday>[] = [
    { id: "name", header: "Holiday", accessor: (row) => row.name, cell: (row) => row.name },
    { id: "date", header: "Date", accessor: (row) => row.date, cell: (row) => formatDate(row.date) },
    { id: "type", header: "Type", cell: (row) => row.type },
    { id: "recurring", header: "Recurring", cell: (row) => (row.recurring ? "Yes" : "No") },
    {
      id: "actions",
      header: "Actions",
      cell: (row) =>
        canManage ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setEditing(row); form.reset(row); setOpen(true); }}>Edit</Button>
            <Button size="sm" variant="destructive" onClick={() => setDeleteId(row.id)}>Delete</Button>
          </div>
        ) : (
          row.description
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holidays"
        description={`Company holiday calendar. Weekly offs: ${workWeekPolicyLabel(settings)}.`}
        actions={canManage ? <Button onClick={() => { setEditing(null); form.reset({ name: "", date: "", type: "COMPANY", description: "", recurring: true }); setOpen(true); }}>Add holiday</Button> : null}
      />
      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
        <Card className="w-full min-w-0 overflow-visible lg:w-max lg:justify-self-start">
          <CardHeader><CardTitle className="text-base">Monthly calendar</CardTitle></CardHeader>
          <CardContent className="overflow-visible px-3 sm:px-6">
            <div className="w-full lg:w-fit">
              <Calendar
                mode="multiple"
                month={month}
                onMonthChange={setMonth}
                selected={[...selectedDates, ...weeklyOffDates]}
                modifiers={{ holiday: selectedDates, weeklyOff: weeklyOffDates }}
                modifiersClassNames={{
                  holiday: "bg-violet-500/15 text-violet-800 dark:text-violet-200",
                  weeklyOff: "bg-slate-500/15 text-slate-800 dark:text-slate-200",
                }}
                className="w-full overflow-visible lg:w-fit"
                classNames={{
                  root: "w-full lg:w-fit",
                  months: "relative w-full lg:w-fit",
                  month: "w-full lg:w-fit",
                  month_grid: "w-full",
                  week: "w-full",
                  day: "lg:size-(--cell-size) lg:max-w-(--cell-size)",
                  nav: "absolute inset-x-0 top-0 z-20 flex h-10 items-center justify-between",
                  button_previous: "size-9",
                  button_next: "size-9",
                  month_caption: "h-10 px-10",
                }}
              />
              <p className="mt-3 text-xs text-muted-foreground">Highlighted dates include company holidays and weekly offs.</p>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Weekly offs this month</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {weeklyOffs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No weekly offs in this month.</p>
              ) : (
                weeklyOffs.map((item) => (
                  <div key={item.date} className="flex items-center justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="text-muted-foreground">{formatDate(item.date)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Upcoming holidays</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {upcoming.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">{formatDate(item.date)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      <DataTable data={holidays} columns={columns} rowKey={(row) => row.id} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={formDialogClass}>
          <DialogHeader><DialogTitle>{editing ? "Edit holiday" : "Add holiday"}</DialogTitle></DialogHeader>
          <form
            className={formGridClass}
            onSubmit={form.handleSubmit((values) => {
              if (editing) {
                holidayService.updateHoliday(editing.id, values);
                toast.success("Holiday updated.");
              } else {
                holidayService.createHoliday(values);
                toast.success("Holiday added.");
              }
              setOpen(false);
            })}
          >
            <div>
              <Label>Name</Label>
              <Input className="mt-1.5" {...form.register("name")} />
            </div>
            <div>
              <Label>Date</Label>
              <Input className="mt-1.5" type="date" {...form.register("date")} />
            </div>
            <div>
              <Label>Type</Label>
              <NativeSelect className={formFieldControlClass} {...form.register("type")}>
                <option value="PUBLIC">Public</option>
                <option value="OPTIONAL">Optional</option>
                <option value="COMPANY">Company</option>
                <option value="RELIGIOUS">Religious</option>
              </NativeSelect>
            </div>
            <div className={formWideClass}>
              <Label>Description</Label>
              <Textarea className="mt-1.5" {...form.register("description")} />
            </div>
            <label className="flex h-10 items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("recurring")} /> Recurring
            </label>
            <div className="flex items-end">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmationDialog
        open={Boolean(deleteId)}
        onOpenChange={(openState) => !openState && setDeleteId(null)}
        title="Delete holiday?"
        description="This removes the holiday from the company calendar."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) {
            holidayService.deleteHoliday(deleteId);
            toast.success("Holiday deleted.");
          }
        }}
      />
    </div>
  );
}
