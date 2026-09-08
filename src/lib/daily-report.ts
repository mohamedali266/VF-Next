export type AtHomeTypeValue = "FOUR_G" | "FIVE_G";

export type DailyReportFormValues = {
  storeName: string;
  date: string;
  pre: number;
  f52: number;
  f80: number;
  aboveF115: number;
  newVmt: number;
  exitVmt: number;
  newRed: number;
  conRed: number;
  mnp: number;
  atHomeType: AtHomeTypeValue;
  atHomeCount: number;
  atHomeAch: number;
  adslAch: number;
  terminalAch: number;
  enterpriseNewAcc: number;
  enterpriseGas: number;
  totalDailyAch: number;
};

export const DAILY_ACQUISITION_TARGET = 49;
export const AT_HOME_REQUIRED = 90;
export const ADSL_REQUIRED = 1;
export const TERMINAL_REQUIRED = 32000;
export const ENTERPRISE_NEW_ACC_REQUIRED = 1;
export const ENTERPRISE_GAS_REQUIRED = 3;
export const ACQ_LOW_TARGET = 42;
export const ACQ_HIGH_TARGET = 19;
export const CASH_NEW_TARGET = 46;
export const TOTAL_ACQ_DAILY_TARGET = 107;
export const CONNECTIVITY_TODAY_TARGET = 65;
export const INFOLOW_GA_TARGET = 1;

export type HealthShiftLines = {
  line1Nid: number;
  line2Nid: number;
  line3Nid: number;
};

export type SmsHealthBreakdown = {
  AM: HealthShiftLines;
  PM: HealthShiftLines;
};

export type SmsHealthRecord = {
  shift: string;
  line1Nid: number;
  line2Nid: number;
  line3Nid: number;
};

export const emptySmsHealthBreakdown: SmsHealthBreakdown = {
  AM: { line1Nid: 0, line2Nid: 0, line3Nid: 0 },
  PM: { line1Nid: 0, line2Nid: 0, line3Nid: 0 },
};

export function buildSmsHealthBreakdown(records: SmsHealthRecord[]): SmsHealthBreakdown {
  return records.reduce<SmsHealthBreakdown>(
    (totals, record) => {
      if (record.shift !== "AM" && record.shift !== "PM") return totals;

      totals[record.shift].line1Nid += record.line1Nid || 0;
      totals[record.shift].line2Nid += record.line2Nid || 0;
      totals[record.shift].line3Nid += record.line3Nid || 0;
      return totals;
    },
    {
      AM: { ...emptySmsHealthBreakdown.AM },
      PM: { ...emptySmsHealthBreakdown.PM },
    },
  );
}

export const emptyDailyReportValues: DailyReportFormValues = {
  storeName: "Amerya Koubry Store",
  date: new Date().toISOString().slice(0, 10),
  pre: 0,
  f52: 0,
  f80: 0,
  aboveF115: 0,
  newVmt: 0,
  exitVmt: 0,
  newRed: 0,
  conRed: 0,
  mnp: 0,
  atHomeType: "FOUR_G",
  atHomeCount: 0,
  atHomeAch: 0,
  adslAch: 0,
  terminalAch: 0,
  enterpriseNewAcc: 0,
  enterpriseGas: 0,
  totalDailyAch: 0,
};

export function calculateAtHomeAch(type: AtHomeTypeValue, count: number) {
  return count * (type === "FIVE_G" ? 105 : 58);
}

export function calculateTotalDailyAch(values: Pick<DailyReportFormValues, "pre" | "f52" | "f80" | "aboveF115" | "newVmt" | "mnp" | "newRed" | "conRed">) {
  return values.pre + values.f52 + values.f80 + values.aboveF115 + values.newVmt + values.mnp + (values.newRed * 3) + values.conRed;
}

export function calculateAcqLowAch(values: Pick<DailyReportFormValues, "pre" | "f52" | "f80" | "conRed">) {
  return values.pre + values.f52 + values.f80 + values.conRed;
}

export function calculateAcqHighAch(values: Pick<DailyReportFormValues, "aboveF115" | "newRed">) {
  return values.aboveF115 + values.newRed;
}

export function calculateNewTotalAcqAch(values: Pick<DailyReportFormValues, "pre" | "f52" | "f80" | "conRed" | "aboveF115" | "newRed" | "newVmt">) {
  return calculateAcqLowAch(values) + calculateAcqHighAch(values) + values.newVmt;
}

export function normalizeDailyReportValues(values: DailyReportFormValues): DailyReportFormValues {
  const atHomeAch = calculateAtHomeAch(values.atHomeType, values.atHomeCount);
  const totalDailyAch = calculateTotalDailyAch(values);

  return {
    ...values,
    atHomeAch,
    totalDailyAch,
  };
}

export function formatDailyReportDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

export function formatSmsDate(date: string | Date) {
  if (typeof date === "string") {
    const [year, month, day] = date.split("-").map(Number);
    if (year && month && day) return `${day}/ ${month} / ${year}`;
  }

  const d = date instanceof Date ? date : new Date(date);
  return `${d.getDate()}/ ${d.getMonth() + 1} / ${d.getFullYear()}`;
}

function formatHealthShift(shift: "AM" | "PM", health?: SmsHealthBreakdown) {
  const values = health?.[shift] || emptySmsHealthBreakdown[shift];
  return `${shift}:
1 line/NID (${values.line1Nid})
2 lines/NID (${values.line2Nid})
3 lines/NID (${values.line3Nid})`;
}

export function buildSmsMessage(values: DailyReportFormValues, health?: SmsHealthBreakdown) {
  const normalized = normalizeDailyReportValues(values);
  const connectivityTodayAch = values.atHomeAch || normalized.atHomeAch;
  const acqLowAch = calculateAcqLowAch(normalized);
  const acqHighAch = calculateAcqHighAch(normalized);
  const totalAcqAch = calculateNewTotalAcqAch(normalized);
  const separator = "> > > > > > > > > > > >";

  return `Store : ${normalized.storeName}
Date : ${formatSmsDate(normalized.date)}

${separator}

Acquisitaion Box :-

Acq Low Ach :${acqLowAch}
Acq Low target :${ACQ_LOW_TARGET}

Acq High Ach :${acqHighAch}
Acq High target:${ACQ_HIGH_TARGET}

Cash new Ach:${normalized.newVmt}
Cash new Target :${CASH_NEW_TARGET}

Total Acq Ach:${totalAcqAch}
Total Acq Daily Target:${TOTAL_ACQ_DAILY_TARGET}

${separator}

Terminal :-
Today Achiev :${normalized.terminalAch}
Today Target :54k

${separator}

Connectivity: -
Dsl Sr Ach :${normalized.adslAch}
Dsl Sr Target :${ADSL_REQUIRED}

Connectivity Today Ach :${connectivityTodayAch}
Connectivity Today Target:${CONNECTIVITY_TODAY_TARGET}

${separator}

Enterprise :-
New Accout Ach :${normalized.enterpriseNewAcc}
New acc Daily Target:${ENTERPRISE_NEW_ACC_REQUIRED}

Infollow GA Today:${normalized.enterpriseGas}
Infollow GA target :${INFOLOW_GA_TARGET}

${separator}

${formatHealthShift("AM", health)}

${formatHealthShift("PM", health)}`;
}
