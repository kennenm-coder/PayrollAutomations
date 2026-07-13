import type { TSheetRow, PayrollUploadRow, MasterSummaryRow, DepartmentGroup } from "./types";
import { mapGroupToDepartment, DEPARTMENT_ORDER } from "./group-mapping";

export function toPayrollUpload(
  rows: TSheetRow[],
  bonuses: Record<string, number>,
  commissions: Record<string, number>
): PayrollUploadRow[] {
  return rows.map((r) => ({
    payrollId: r.payrollId,
    employeeNumber: r.employeeNumber,
    name: r.name,
    regHours: r.regHours,
    otHours: r.otHours,
    bereavementHours: r.bereavementHours,
    holidayHours: r.holidayHours,
    ptoPayout: r.ptoPayout,
    requestedDayOffPaid: r.requestedDayOffPaid,
    vacationHours: r.vacationHours,
    militaryLeaveUnpaid: r.militaryLeaveUnpaid,
    personalUnpaid: r.personalUnpaid,
    requestedDayOffUnpaid: r.requestedDayOffUnpaid,
    sickUnpaid: r.sickUnpaid,
    bonus: bonuses[r.employeeNumber] ?? 0,
    commission: commissions[r.employeeNumber] ?? 0,
  }));
}

export function toMasterSummary(
  uploadRows: PayrollUploadRow[],
  tsheetRows: TSheetRow[],
  employeeRates: Record<string, number>,
  deductions: Record<string, { healthIns: number; dentalIns: number; otherIns: number; reimb: number; fourOhOneK: number; garnish: number }>
): DepartmentGroup[] {
  const tsheetMap = new Map(tsheetRows.map((r) => [r.employeeNumber, r]));

  const groups = new Map<string, MasterSummaryRow[]>();
  DEPARTMENT_ORDER.forEach((d) => groups.set(d, []));

  for (const row of uploadRows) {
    const tsheet = tsheetMap.get(row.employeeNumber);
    if (!tsheet) continue;

    const dept = mapGroupToDepartment(tsheet.group, tsheet.salaried);
    const rate = employeeRates[row.employeeNumber] ?? 0;
    const ded = deductions[row.employeeNumber] ?? {
      healthIns: 0, dentalIns: 0, otherIns: 0, reimb: 0, fourOhOneK: 0, garnish: 0,
    };

    const regPay = row.regHours * rate;
    const otPay = row.otHours * rate * 1.5;
    const vacPay = row.vacationHours * rate;
    const holPay = row.holidayHours * rate;
    const totalHours = row.regHours + row.otHours;

    const grossPay = regPay + otPay + vacPay + holPay + row.bonus + row.commission;
    const totalDeductions = ded.healthIns + ded.dentalIns + ded.otherIns + ded.fourOhOneK + ded.garnish - ded.reimb;
    const total = grossPay - totalDeductions;

    const summaryRow: MasterSummaryRow = {
      name: row.name,
      payType: tsheet.salaried ? "Salary" : "Hourly",
      baseRate: rate,
      hours: totalHours,
      regPay,
      otPay,
      vacHours: row.vacationHours,
      vacPay,
      holHours: row.holidayHours,
      holPay,
      bonus: row.bonus,
      commission: row.commission,
      regHours: row.regHours,
      otHours: row.otHours,
      grossPay,
      healthIns: ded.healthIns,
      dentalIns: ded.dentalIns,
      otherIns: ded.otherIns,
      reimb: ded.reimb,
      fourOhOneK: ded.fourOhOneK,
      garnish: ded.garnish,
      total,
    };

    const list = groups.get(dept);
    if (list) list.push(summaryRow);
  }

  return DEPARTMENT_ORDER
    .filter((d) => (groups.get(d)?.length ?? 0) > 0)
    .map((d) => ({ section: d, employees: groups.get(d)! }));
}
