import Papa from "papaparse";
import type { TSheetRow } from "./types";

const CSV_HEADERS = [
  "Payroll ID",
  "Employee Number",
  "Name",
  "Group",
  "Salaried",
  "Exempt",
  "Reg Hours",
  "Time at 1.5",
  "Bereavement Hours",
  "Employee Natl Paid Sick Leave Hours",
  "Family Natl Paid Sick Leave Hours",
  "FMLA Expansion Paid Leave Hours",
  "Holiday Hours",
  "PTO Payout Hours",
  "Requested Day Off - Paid Hours",
  "Vacation Hours",
  "Military Leave- Unpaid Hours",
  "No Call / No Show - Unpaid Hours",
  "Personal - Unpaid Hours",
  "Requested Day Off - Unpaid Hours",
  "Sick - Unpaid Hours",
  "Suspension - Unpaid Hours",
  "Unspecified - Unpaid Hours",
  "Approval State",
] as const;

function num(val: string | undefined): number {
  const n = parseFloat(val ?? "0");
  return isNaN(n) ? 0 : n;
}

export function parseTSheetsCSV(csvText: string): TSheetRow[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  return result.data
    .filter((row) => {
      const name = row[CSV_HEADERS[2]]?.trim();
      return name && name !== "SUBTOTAL" && name !== "GRAND TOTAL" && !name.startsWith("=");
    })
    .map((row) => ({
      payrollId: row[CSV_HEADERS[0]]?.trim() ?? "",
      employeeNumber: row[CSV_HEADERS[1]]?.trim() ?? "",
      name: row[CSV_HEADERS[2]]?.trim() ?? "",
      group: row[CSV_HEADERS[3]]?.trim() ?? "",
      salaried: row[CSV_HEADERS[4]]?.trim() === "1",
      exempt: row[CSV_HEADERS[5]]?.trim() === "1",
      regHours: num(row[CSV_HEADERS[6]]),
      otHours: num(row[CSV_HEADERS[7]]),
      bereavementHours: num(row[CSV_HEADERS[8]]),
      empSickLeave: num(row[CSV_HEADERS[9]]),
      familySickLeave: num(row[CSV_HEADERS[10]]),
      fmlaHours: num(row[CSV_HEADERS[11]]),
      holidayHours: num(row[CSV_HEADERS[12]]),
      ptoPayout: num(row[CSV_HEADERS[13]]),
      requestedDayOffPaid: num(row[CSV_HEADERS[14]]),
      vacationHours: num(row[CSV_HEADERS[15]]),
      militaryLeaveUnpaid: num(row[CSV_HEADERS[16]]),
      noCallNoShow: num(row[CSV_HEADERS[17]]),
      personalUnpaid: num(row[CSV_HEADERS[18]]),
      requestedDayOffUnpaid: num(row[CSV_HEADERS[19]]),
      sickUnpaid: num(row[CSV_HEADERS[20]]),
      suspensionUnpaid: num(row[CSV_HEADERS[21]]),
      unspecifiedUnpaid: num(row[CSV_HEADERS[22]]),
      approvalState: row[CSV_HEADERS[23]]?.trim() ?? "",
    }));
}
