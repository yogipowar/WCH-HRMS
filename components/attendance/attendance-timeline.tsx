import { Coffee, LogIn, LogOut, PauseCircle, PlayCircle, Utensils } from "lucide-react";
import { formatTime } from "@/lib/utils/format";
import type { AttendanceRecord } from "@/types";

interface TimelineEvent {
  id: string;
  time: string;
  label: string;
  icon: typeof LogIn;
}

function buildEvents(record: AttendanceRecord): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (record.clockIn) {
    events.push({ id: "clock-in", time: record.clockIn, label: "Clocked In", icon: LogIn });
  }
  record.breaks.forEach((item) => {
    const startLabel = item.type === "LUNCH" ? "Lunch Started" : "Personal Break Started";
    const endLabel = item.type === "LUNCH" ? "Lunch Ended" : "Personal Break Ended";
    const StartIcon = item.type === "LUNCH" ? Utensils : PauseCircle;
    const EndIcon = item.type === "LUNCH" ? PlayCircle : Coffee;
    events.push({ id: `${item.id}-start`, time: item.startTime, label: startLabel, icon: StartIcon });
    if (item.endTime) {
      events.push({ id: `${item.id}-end`, time: item.endTime, label: endLabel, icon: EndIcon });
    }
  });
  if (record.clockOut) {
    events.push({ id: "clock-out", time: record.clockOut, label: "Clocked Out", icon: LogOut });
  }
  return events.sort((a, b) => a.time.localeCompare(b.time));
}

export function AttendanceTimeline({ record }: { record: AttendanceRecord }) {
  const events = buildEvents(record);

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No attendance events recorded for this day.</p>;
  }

  return (
    <ol className="space-y-4">
      {events.map((event, index) => {
        const Icon = event.icon;
        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              {index < events.length - 1 ? <div className="mt-1 w-px flex-1 bg-border" /> : null}
            </div>
            <div className="pb-2">
              <p className="text-sm font-medium">{event.label}</p>
              <p className="text-xs text-muted-foreground">{formatTime(event.time)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
