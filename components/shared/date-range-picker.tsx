"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (value: DateRange | undefined) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const label =
    value?.from && value.to
      ? `${format(value.from, "dd MMM")} - ${format(value.to, "dd MMM yyyy")}`
      : value?.from
        ? format(value.from, "dd MMM yyyy")
        : "Custom date range";

  return (
    <Popover>
      <PopoverTrigger className={cn(buttonVariants({ variant: "outline" }), "h-10 justify-start")}>
        <CalendarIcon />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={value} onSelect={onChange} numberOfMonths={1} />
      </PopoverContent>
    </Popover>
  );
}

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = "Select date",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const selected = value ? parseISO(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(buttonVariants({ variant: "outline" }), "h-10 min-w-[10.5rem] justify-start", className)}
      >
        <CalendarIcon />
        {selected ? format(selected, "dd MMM yyyy") : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(next) => {
            if (next) {
              onChange(format(next, "yyyy-MM-dd"));
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
