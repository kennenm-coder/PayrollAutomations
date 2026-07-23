import * as XLSX from "xlsx";
import type { PayrollUploadRow, DepartmentGroup } from "./types";

export function exportPayrollUpload(rows: PayrollUploadRow[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Payroll ID", "Employee Number", "Name", "Reg Hours", "Time at 1.5",
    "Bereavement Hours", "Holiday Hours", "PTO Payout Hours",
    "Requested Day Off - Paid Hours", "Vacation Hours",
    "Military Leave- Unpaid Hours", "No Call / No Show - Unpaid Hours",
    "Personal - Unpaid Hours",
    "Requested Day Off - Unpaid Hours", "Sick - Unpaid Hours",
    "Suspension - Unpaid Hours", "Unspecified - Unpaid Hours",
    "Salary Unpaid Hours Used", "Bonus", "Commission",
  ];

  const data = rows.map((r) => [
    r.payrollId, r.employeeNumber, r.name, r.regHours, r.otHours,
    r.bereavementHours, r.holidayHours, r.ptoPayout,
    r.requestedDayOffPaid, r.vacationHours,
    r.militaryLeaveUnpaid, r.noCallNoShow, r.personalUnpaid,
    r.requestedDayOffUnpaid, r.sickUnpaid, r.suspensionUnpaid,
    r.unspecifiedUnpaid, r.salaryUnpaidHours,
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
  const deductionColumns = [...new Map(
    groups.flatMap((group) =>
      group.employees.flatMap((employee) =>
        employee.deductionDetails.map((deduction) => [
          deduction.key,
          { key: deduction.key, label: deduction.label },
        ] as const)
      )
    )
  ).values()];

  rows.push([`RBA Payroll ${payrollDate}`]);
  rows.push([]);

  const headers = [
    "Name", "Pay Type", "Base Rate", "Hours", "REG", "OT",
    "PTO/Vac Hours", "PTO/Vac Pay", "Hol Hours", "Hol Pay",
    "Salary Unpaid Hours", "Salary Unpaid Adjustment", "Bonus", "Commission",
    "Reg Hours", "OT Hours", "Gross Pay",
    ...deductionColumns.map((deduction) => deduction.label),
    "Total Deductions", "Expected Before Taxes",
  ];

  for (const group of groups) {
    rows.push([group.section]);
    rows.push(headers);

    for (const emp of group.employees) {
      rows.push([
        emp.name, emp.payType, emp.baseRate, emp.hours,
        emp.regPay, emp.otPay, emp.vacHours, emp.vacPay,
        emp.holHours, emp.holPay, emp.salaryUnpaidHours, emp.salaryUnpaidAdjustment,
        emp.bonus, emp.commission,
        emp.regHours, emp.otHours, emp.grossPay,
        ...deductionColumns.map((deduction) =>
          emp.deductionDetails.find((detail) => detail.key === deduction.key)?.amount ?? 0
        ),
        emp.totalDeductions, emp.total,
      ]);
    }

    const subtotals = group.employees.reduce(
      (acc, e) => ({
        regPay: acc.regPay + e.regPay,
        otPay: acc.otPay + e.otPay,
        grossPay: acc.grossPay + e.grossPay,
        total: acc.total + e.total,
        totalDeductions: acc.totalDeductions + e.totalDeductions,
      }),
      { regPay: 0, otPay: 0, grossPay: 0, total: 0, totalDeductions: 0 }
    );

    rows.push([
      "Subtotal", "", "", "", subtotals.regPay, subtotals.otPay,
      "", "", "", "", "", "", "", "", "", "", subtotals.grossPay,
      ...deductionColumns.map((deduction) =>
        group.employees.reduce(
          (sum, employee) =>
            sum + (employee.deductionDetails.find((detail) => detail.key === deduction.key)?.amount ?? 0),
          0
        )
      ),
      subtotals.totalDeductions, subtotals.total,
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
