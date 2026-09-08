export type ScheduleRole = "EMPLOYEE" | "TEAM_LEADER" | "MANAGER" | "ADMIN";
export type ScheduleShiftValue = "AM" | "PM" | "FULL" | "OFF" | "ANN" | "BW";

export type ScheduleMember = {
  id: string;
  name: string;
  role: ScheduleRole;
  isMaster: boolean;
  isActive?: boolean;
};

export type ScheduleEntryInput = {
  employeeId: string;
  date: string;
  shift: ScheduleShiftValue;
};

export type DayValidation = {
  date: string;
  amCount: number;
  pmCount: number;
  workCount: number;
  bwCount: number;
  offCount: number;
  annCount: number;
  sumCount: number;
  amHasMaster: boolean;
  pmHasMaster: boolean;
  workHasMaster: boolean;
  amValid: boolean;
  pmValid: boolean;
  fridayValid: boolean;
  valid: boolean;
};

export const SCHEDULE_SHIFTS: ScheduleShiftValue[] = ["AM", "PM", "FULL", "OFF", "ANN", "BW"];

export const SHIFT_LABELS: Record<ScheduleShiftValue, string> = {
  AM: "AM",
  PM: "PM",
  FULL: "Full",
  OFF: "OFF",
  ANN: "ANN",
  BW: "BW",
};

export function monthStartFromInput(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return new Date(Date.UTC(year, monthIndex, 1));
}

export function monthKeyFromDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

const WEEKDAY_SHORT: Record<number, string> = {
  0: "SU",
  1: "MO",
  2: "TU",
  3: "WE",
  4: "TH",
  5: "FR",
  6: "SA",
};

export function getMonthDays(month: string) {
  const start = monthStartFromInput(month);
  if (!start) return [];
  const year = start.getUTCFullYear();
  const monthIndex = start.getUTCMonth();
  const totalDays = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(Date.UTC(year, monthIndex, index + 1));
    return {
      date: dateKey(date),
      day: index + 1,
      weekday: WEEKDAY_SHORT[date.getUTCDay()],
      isFriday: date.getUTCDay() === 5,
    };
  });
}

export function sortScheduleMembers(members: ScheduleMember[]) {
  const roleOrder: Record<ScheduleRole, number> = {
    MANAGER: 0,
    TEAM_LEADER: 1,
    EMPLOYEE: 2,
    ADMIN: 3,
  };

  return [...members].sort((a, b) => {
    const roleDelta = roleOrder[a.role] - roleOrder[b.role];
    if (roleDelta) return roleDelta;
    if (a.role === "EMPLOYEE" && a.isMaster !== b.isMaster) return a.isMaster ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function buildEntryMap(entries: ScheduleEntryInput[]) {
  const map = new Map<string, ScheduleShiftValue>();
  for (const entry of entries) {
    if (SCHEDULE_SHIFTS.includes(entry.shift)) {
      map.set(`${entry.date}:${entry.employeeId}`, entry.shift);
    }
  }
  return map;
}

export function validateScheduleDays(
  days: { date: string; isFriday?: boolean }[],
  members: ScheduleMember[],
  entries: ScheduleEntryInput[],
  terminalCount: number,
) {
  const employeeMembers = members.filter((member) => member.role === "EMPLOYEE");
  const entriesMap = buildEntryMap(entries);

  return days.map<DayValidation>((day) => {
    let amCount = 0;
    let pmCount = 0;
    let workCount = 0;
    let bwCount = 0;
    let offCount = 0;
    let annCount = 0;
    let amHasMaster = false;
    let pmHasMaster = false;
    let workHasMaster = false;

    for (const member of employeeMembers) {
      const shift = entriesMap.get(`${day.date}:${member.id}`);
      if (shift === "AM" || shift === "PM" || shift === "FULL" || shift === "BW") {
        workCount += 1;
        if (member.isMaster) workHasMaster = true;
      }
      if (shift === "AM" || shift === "FULL") {
        amCount += 1;
        if (member.isMaster) amHasMaster = true;
      }
      if (shift === "PM" || shift === "FULL") {
        pmCount += 1;
        if (member.isMaster) pmHasMaster = true;
      }
      if (shift === "BW") bwCount += 1;
      if (shift === "OFF") offCount += 1;
      if (shift === "ANN") annCount += 1;
    }

    const amValid = amCount >= terminalCount && amHasMaster;
    const pmValid = pmCount >= terminalCount && pmHasMaster;
    const fridayValid = workCount >= 3 && workHasMaster;

    return {
      date: day.date,
      amCount,
      pmCount,
      workCount,
      bwCount,
      offCount,
      annCount,
      sumCount: amCount + pmCount + bwCount,
      amHasMaster,
      pmHasMaster,
      workHasMaster,
      amValid,
      pmValid,
      fridayValid,
      valid: day.isFriday ? fridayValid : amValid && pmValid,
    };
  });
}

export function countMemberShifts(memberId: string, entries: ScheduleEntryInput[]) {
  return entries.reduce(
    (total, entry) => {
      if (entry.employeeId !== memberId) return total;
      if (entry.shift === "AM" || entry.shift === "FULL") total.AM += 1;
      if (entry.shift === "PM" || entry.shift === "FULL") total.PM += 1;
      if (entry.shift === "OFF") total.OFF += 1;
      if (entry.shift === "ANN") total.ANN += 1;
      if (entry.shift === "BW") total.BW += 1;
      return total;
    },
    { ANN: 0, AM: 0, PM: 0, BW: 0, OFF: 0 },
  );
}
