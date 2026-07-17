import type {
  TSheetRow,
  PayrollUploadRow,
  MasterSummaryRow,
  DepartmentGroup,
  PayrollEmployeeConfig,
} from "./types";
import { DEPARTMENT_ORDER } from "./group-mapping";

export function toPayrollUpload(
  rows: TSheetRow[],
  bonuses: Record<string, number>,
  commissions: Record<string, number>,
  employeeConfigs: Record<string, PayrollEmployeeConfig>
): PayrollUploadRow[] {
  return rows.map((r) => {
    const config = employeeConfigs[r.employeeNumber];
    return {
      payrollId: config?.payrollId || r.payrollId,
      employeeNumber: r.employeeNumber,
      name: config?.name || r.name,
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
      commission: config?.commissionEligible ? commissions[r.employeeNumber] ?? 0 : 0,
    };
  });
}

function deductionTotals(config: PayrollEmployeeConfig) {
  const totals = {
    healthIns: 0,
    dentalIns: 0,
    otherIns: 0,
    reimb: 0,
    fourOhOneK: 0,
    garnish: 0,
  };

  for (const deduction of config.deductions) {
    if (deduction.type === "Health") totals.healthIns += deduction.amount;
    else if (deduction.type === "Dental/Vision") totals.dentalIns += deduction.amount;
    else if (deduction.type === "Retirement") totals.fourOhOneK += deduction.amount;
    else if (deduction.type === "Garnishment") totals.garnish += deduction.amount;
    else if (deduction.type === "Reimbursement") totals.reimb += deduction.amount;
    else totals.otherIns += deduction.amount;
  }

  return totals;
}

export function toMasterSummary(
  uploadRows: PayrollUploadRow[],
  employeeConfigs: Record<string, PayrollEmployeeConfig>
): DepartmentGroup[] {
  const groups = new Map<string, MasterSummaryRow[]>();
  DEPARTMENT_ORDER.forEach((d) => groups.set(d, []));

  for (const row of uploadRows) {
    const config = employeeConfigs[row.employeeNumber];
    if (!config || !config.department || config.rateAmount === null) continue;

    const dept = config.department;
    const rate = config.rateAmount;
    const ded = deductionTotals(config);
    const isSalary = config.payType === "Salary";

    const regPay = isSalary ? rate : row.regHours * rate;
    const otPay = isSalary ? 0 : row.otHours * rate * 1.5;
    const vacPay = isSalary ? 0 : row.vacationHours * rate;
    const holPay = isSalary ? 0 : row.holidayHours * rate;
    const totalHours = row.regHours + row.otHours;

    const grossPay = regPay + otPay + vacPay + holPay + row.bonus + row.commission;
    const totalDeductions = ded.healthIns + ded.dentalIns + ded.otherIns + ded.fourOhOneK + ded.garnish - ded.reimb;
    const total = grossPay - totalDeductions;

    const summaryRow: MasterSummaryRow = {
      name: row.name,
      payType: config.payType,
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
