import type {
  AttendanceAction,
  AttendanceActionResult,
  AttendanceRecord,
  AttendanceState,
} from "@/types";
import { getActiveBreak } from "@/lib/attendance/calculations";

const VALID_TRANSITIONS: Record<AttendanceState, AttendanceAction[]> = {
  NOT_CLOCKED_IN: ["CLOCK_IN"],
  WORKING: ["START_LUNCH", "START_PERSONAL", "CLOCK_OUT"],
  ON_LUNCH_BREAK: ["END_LUNCH"],
  ON_PERSONAL_BREAK: ["END_PERSONAL"],
  CLOCKED_OUT: [],
};

const NEXT_STATE: Record<AttendanceAction, AttendanceState> = {
  CLOCK_IN: "WORKING",
  CLOCK_OUT: "CLOCKED_OUT",
  START_LUNCH: "ON_LUNCH_BREAK",
  END_LUNCH: "WORKING",
  START_PERSONAL: "ON_PERSONAL_BREAK",
  END_PERSONAL: "WORKING",
};

const ACTION_MESSAGES: Record<AttendanceAction, string> = {
  CLOCK_IN: "You have already clocked in for today.",
  CLOCK_OUT: "You can only clock out while working. End any active break first.",
  START_LUNCH: "Lunch break can only be started while you are working.",
  END_LUNCH: "There is no active lunch break to end.",
  START_PERSONAL: "A personal break can only be started while you are working.",
  END_PERSONAL: "There is no active personal break to end.",
};

export function getAvailableActions(state: AttendanceState): AttendanceAction[] {
  return VALID_TRANSITIONS[state];
}

export function canPerformAction(
  state: AttendanceState,
  action: AttendanceAction,
): boolean {
  return VALID_TRANSITIONS[state].includes(action);
}

export function getNextState(action: AttendanceAction): AttendanceState {
  return NEXT_STATE[action];
}

export function validateAttendanceAction(
  record: AttendanceRecord | null,
  action: AttendanceAction,
): AttendanceActionResult {
  const state = record?.state ?? "NOT_CLOCKED_IN";

  if (canPerformAction(state, action)) {
    if ((action === "START_LUNCH" || action === "START_PERSONAL") && record) {
      const activeBreak = getActiveBreak(record.breaks);
      if (activeBreak) {
        return {
          allowed: false,
          message: "You already have an active break. End it before starting another.",
        };
      }
    }

    return { allowed: true, message: "Action allowed." };
  }

  if (state === "CLOCKED_OUT") {
    return {
      allowed: false,
      message: "Workday is already completed. Attendance actions are locked.",
    };
  }

  if (state === "NOT_CLOCKED_IN" && action !== "CLOCK_IN") {
    return {
      allowed: false,
      message: "Clock in first before starting a break or clocking out.",
    };
  }

  return {
    allowed: false,
    message: ACTION_MESSAGES[action],
  };
}

export function isOnBreak(state: AttendanceState): boolean {
  return state === "ON_LUNCH_BREAK" || state === "ON_PERSONAL_BREAK";
}

export function getStateLabel(state: AttendanceState): string {
  switch (state) {
    case "NOT_CLOCKED_IN":
      return "Not clocked in";
    case "WORKING":
      return "Working";
    case "ON_LUNCH_BREAK":
      return "On lunch break";
    case "ON_PERSONAL_BREAK":
      return "On personal break";
    case "CLOCKED_OUT":
      return "Workday completed";
  }
}
