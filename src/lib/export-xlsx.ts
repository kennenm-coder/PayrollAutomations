import * as XLSX from "xlsx";
import type { PayrollUploadRow, DepartmentGroup } from "./types";

export function exportPayrollUpload(rows: PayrollUploadRow[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Payroll ID", "Employee Number", "Name", "Reg Hours", "Time at 1.5",
    "Bereavement Hours", "Holiday Hours", "PTO Payout Hours",
    "Requested Day Off - Paid Hours", "Vacation Hours",
    "Military Leave- Unpaid Hours", "Personal - Unpaid Hours",
    "Requested Day Off - Unpaid Hours", "Sick - Unpaid Hours",
    "Bonus (manual add)", "Commission (manual add)",
  ];

  const data = rows.map((r) => [
    r.payrollId, r.employeeNumber, r.name, r.regHours, r.otHours,
    r.bereavementHours, r.holidayHours, r.ptoPayout,
    r.requestedDayOffPaid, r.vacationHours,
    r.militaryLeaveUnpaid, r.personalUnpaid,
    r.requestedDayOffUnpaid, r.sickUnpaid,
    r.bonus || "", r.commission || "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 12) }));
  XLSX.utils.book_append_sheet(wb, ws, "Payroll File Upload");

  return wb;
}

export function exportMasterSummary(groups: DepartmentGroup[], payrollDate: string): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];

  rows.push([`RBA Payroll ${payrollDate}`]);
  rows.push([]);

  const headers = [
    "Name", "Pay Type", "Base Rate", "Hours", "REG", "OT",
    "Vac Hours", "Vac Pay", "Hol Hours", "Hol Pay", "Bonus", "Commission",
    "Reg Hours", "OT", "Gross Pay", "",
    "Health Ins", "Dental/Vision Ins.", "Other Ins.", "Reimb.", "401(k)", "Garnish", "Expected Before Taxes",
  ];

  for (const group of groups) {
    rows.push([group.section]);
    rows.push(headers);

    for (const emp of group.employees) {
      rows.push([
        emp.name, emp.payType, emp.baseRate, emp.hours,
        emp.regPay, emp.otPay, emp.vacHours, emp.vacPay,
        emp.holHours, emp.holPay, emp.bonus, emp.commission,
        emp.regHours, emp.otHours, emp.grossPay, "",
        emp.healthIns, emp.dentalIns, emp.otherIns, emp.reimb,
        emp.fourOhOneK, emp.garnish, emp.total,
      ]);
    }

    const subtotals = group.employees.reduce(
      (acc, e) => ({
        regPay: acc.regPay + e.regPay,
        otPay: acc.otPay + e.otPay,
        grossPay: acc.grossPay + e.grossPay,
        total: acc.total + e.total,
        healthIns: acc.healthIns + e.healthIns,
        dentalIns: acc.dentalIns + e.dentalIns,
        otherIns: acc.otherIns + e.otherIns,
        reimb: acc.reimb + e.reimb,
        fourOhOneK: acc.fourOhOneK + e.fourOhOneK,
        garnish: acc.garnish + e.garnish,
      }),
      { regPay: 0, otPay: 0, grossPay: 0, total: 0, healthIns: 0, dentalIns: 0, otherIns: 0, reimb: 0, fourOhOneK: 0, garnish: 0 }
    );

    rows.push([
      "Subtotal", "", "", "", subtotals.regPay, subtotals.otPay,
      "", "", "", "", "", "", "", "", subtotals.grossPay, "",
      subtotals.healthIns, subtotals.dentalIns, subtotals.otherIns,
      subtotals.reimb, subtotals.fourOhOneK, subtotals.garnish, subtotals.total,
    ]);
    rows.push([]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max((h?.length ?? 0) + 2, 12) }));
  XLSX.utils.book_append_sheet(wb, ws, "Master Summary");

  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}
