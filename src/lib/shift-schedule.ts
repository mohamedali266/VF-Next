export type ScheduleRole = "EMPLOYEE" | "TEAM_LEADER" | "MANAGER" | "AREA_MANAGER" | "ADMIN";
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
    AREA_MANAGER: 3,
    ADMIN: 4,
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

type ScheduleDay = ReturnType<typeof getMonthDays>[number];

type MemberStats = {
  AM: number;
  PM: number;
  OFF: number;
  work: number;
  lastShift: ScheduleShiftValue | null;
};

function seededNumber(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function stableMemberRank(member: ScheduleMember, seed: string) {
  return seededNumber(`${seed}:${member.id}`);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function setGeneratedShift(
  assignments: Map<string, ScheduleShiftValue>,
  stats: Map<string, MemberStats>,
  memberId: string,
  shift: ScheduleShiftValue,
) {
  const current = assignments.get(memberId);
  const next = current && current !== shift ? "FULL" : shift;
  assignments.set(memberId, next);

  const memberStats = stats.get(memberId);
  if (!memberStats) return;
  if (shift === "AM") memberStats.AM += 1;
  if (shift === "PM") memberStats.PM += 1;
  if (!current) memberStats.work += 1;
  memberStats.lastShift = next;
}

function pickWorker(
  candidates: ScheduleMember[],
  stats: Map<string, MemberStats>,
  shift: "AM" | "PM",
  seed: string,
  assigned: Set<string>,
) {
  return [...candidates]
    .filter((member) => !assigned.has(member.id))
    .sort((a, b) => {
      const aStats = stats.get(a.id)!;
      const bStats = stats.get(b.id)!;
      const aRestPenalty = shift === "AM" && aStats.lastShift === "PM" ? 2 : 0;
      const bRestPenalty = shift === "AM" && bStats.lastShift === "PM" ? 2 : 0;
      const aShiftCount = aStats[shift] + aRestPenalty;
      const bShiftCount = bStats[shift] + bRestPenalty;
      if (aShiftCount !== bShiftCount) return aShiftCount - bShiftCount;
      if (aStats.work !== bStats.work) return aStats.work - bStats.work;
      return stableMemberRank(a, seed) - stableMemberRank(b, seed);
    })[0];
}

function generateEmployeeSchedule(days: ScheduleDay[], employees: ScheduleMember[], terminalCount: number, seed: string) {
  const stats = new Map<string, MemberStats>(
    employees.map((member) => [member.id, { AM: 0, PM: 0, OFF: 0, work: 0, lastShift: null }]),
  );
  const entries: ScheduleEntryInput[] = [];
  const masters = employees.filter((member) => member.isMaster);
  const offTarget = 8;

  days.forEach((day, dayIndex) => {
    const remainingDays = days.length - dayIndex;
    const remainingOff = employees.reduce((total, member) => {
      const memberStats = stats.get(member.id)!;
      return total + Math.max(0, offTarget - memberStats.OFF);
    }, 0);
    const minimumWorkers = day.isFriday ? Math.min(3, employees.length) : Math.min(terminalCount * 2, employees.length);
    const maxOffToday = Math.max(0, employees.length - minimumWorkers);
    const targetOffToday = clamp(Math.round(remainingOff / remainingDays), 0, maxOffToday);

    const offCandidates = [...employees].sort((a, b) => {
      const aStats = stats.get(a.id)!;
      const bStats = stats.get(b.id)!;
      const aCanRest = aStats.OFF < offTarget ? 0 : 1;
      const bCanRest = bStats.OFF < offTarget ? 0 : 1;
      if (aCanRest !== bCanRest) return aCanRest - bCanRest;
      if (aStats.OFF !== bStats.OFF) return aStats.OFF - bStats.OFF;
      if (aStats.work !== bStats.work) return bStats.work - aStats.work;
      return stableMemberRank(a, `${seed}:off:${day.date}`) - stableMemberRank(b, `${seed}:off:${day.date}`);
    });

    const offIds = new Set<string>();
    for (const member of offCandidates) {
      if (offIds.size >= targetOffToday) break;
      const wouldLeaveMaster = member.isMaster && masters.length > 0 && employees.filter((candidate) => candidate.isMaster && !offIds.has(candidate.id) && candidate.id !== member.id).length === 0;
      if (wouldLeaveMaster) continue;
      offIds.add(member.id);
    }

    const workers = employees.filter((member) => !offIds.has(member.id));
    const assignments = new Map<string, ScheduleShiftValue>();

    if (day.isFriday) {
      const fridayShift: "AM" | "PM" = dayIndex % 2 === 0 ? "AM" : "PM";
      workers.forEach((member) => setGeneratedShift(assignments, stats, member.id, fridayShift));
    } else {
      const assigned = new Set<string>();
      const workingMasters = workers.filter((member) => member.isMaster);

      if (workingMasters.length === 1) {
        const master = workingMasters[0];
        setGeneratedShift(assignments, stats, master.id, "AM");
        setGeneratedShift(assignments, stats, master.id, "PM");
        assigned.add(master.id);
      } else if (workingMasters.length > 1) {
        const amMaster = pickWorker(workingMasters, stats, "AM", `${seed}:master:${day.date}`, assigned);
        if (amMaster) {
          setGeneratedShift(assignments, stats, amMaster.id, "AM");
          assigned.add(amMaster.id);
        }
        const pmMaster = pickWorker(workingMasters, stats, "PM", `${seed}:master:${day.date}`, assigned);
        if (pmMaster) {
          setGeneratedShift(assignments, stats, pmMaster.id, "PM");
          assigned.add(pmMaster.id);
        }
      }

      const countShift = (shift: "AM" | "PM") => [...assignments.values()].filter((value) => value === shift || value === "FULL").length;
      const assignUntil = (shift: "AM" | "PM") => {
        while (countShift(shift) < terminalCount) {
          const worker = pickWorker(workers, stats, shift, `${seed}:${day.date}:${shift}`, assigned);
          if (!worker) break;
          setGeneratedShift(assignments, stats, worker.id, shift);
          assigned.add(worker.id);
        }
      };

      assignUntil("AM");
      assignUntil("PM");

      for (const member of workers) {
        if (assignments.has(member.id)) continue;
        const memberStats = stats.get(member.id)!;
        const preferredShift = memberStats.AM <= memberStats.PM ? "AM" : "PM";
        setGeneratedShift(assignments, stats, member.id, preferredShift);
      }
    }

    for (const member of employees) {
      const shift = assignments.get(member.id);
      if (shift) {
        entries.push({ employeeId: member.id, date: day.date, shift });
      } else {
        stats.get(member.id)!.OFF += 1;
        stats.get(member.id)!.lastShift = "OFF";
        entries.push({ employeeId: member.id, date: day.date, shift: "OFF" });
      }
    }
  });

  return entries;
}

function generateLeadershipSchedule(days: ScheduleDay[], leaders: ScheduleMember[], seed: string) {
  return leaders.flatMap((member, memberIndex) => days.map<ScheduleEntryInput>((day, dayIndex) => {
    if ((dayIndex + memberIndex) % 7 === 5) {
      return { employeeId: member.id, date: day.date, shift: "OFF" };
    }
    const shift = (dayIndex + memberIndex + stableMemberRank(member, seed)) % 2 === 0 ? "AM" : "PM";
    return { employeeId: member.id, date: day.date, shift };
  }));
}

export function generateScheduleDraft(
  days: ScheduleDay[],
  members: ScheduleMember[],
  terminalCount: number,
  seed: string,
) {
  const activeMembers = sortScheduleMembers(members.filter((member) => member.isActive !== false));
  const employees = activeMembers.filter((member) => member.role === "EMPLOYEE");
  const leaders = activeMembers.filter((member) => member.role === "MANAGER" || member.role === "TEAM_LEADER");

  return [
    ...generateLeadershipSchedule(days, leaders, seed),
    ...generateEmployeeSchedule(days, employees, terminalCount, seed),
  ];
}
