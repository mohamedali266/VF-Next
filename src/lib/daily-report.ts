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

export function buildSmsMessage(values: DailyReportFormValues) {
  const normalized = normalizeDailyReportValues(values);

  return `${normalized.storeName}
Date :
${formatDailyReportDate(normalized.date)}

Acquisition
Pre(${normalized.pre})
F52  (${normalized.f52})
F80  (${normalized.f80})
F345(${normalized.aboveF115})
New Red (${normalized.newRed})
New V. Cash (${normalized.newVmt})

Total Daily Ach  (${normalized.totalDailyAch}/${DAILY_ACQUISITION_TARGET})
---------------------------------------------
At Home
ach: ${normalized.atHomeAch}
required : ${AT_HOME_REQUIRED}
---------------------------------------------
Adsl
daily ach :${normalized.adslAch}
daily required :${ADSL_REQUIRED}
----------------------------------------------
*Terminal
ach:${normalized.terminalAch}
required : ${TERMINAL_REQUIRED}
----------------------------------------------
Enterprise :
New Acc (${normalized.enterpriseNewAcc}/${ENTERPRISE_NEW_ACC_REQUIRED})
Gas (${normalized.enterpriseGas}/${ENTERPRISE_GAS_REQUIRED})
----------------------------------------------
MNP (${normalized.mnp})
Conv Red (${normalized.conRed})
Exist V. cash : ${normalized.exitVmt}`;
}
