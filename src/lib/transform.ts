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
  salaryUnpaidHours: Record<string, number>,
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
      noCallNoShow: r.noCallNoShow,
      personalUnpaid: r.personalUnpaid,
      requestedDayOffUnpaid: r.requestedDayOffUnpaid,
      sickUnpaid: r.sickUnpaid,
      suspensionUnpaid: r.suspensionUnpaid,
      unspecifiedUnpaid: r.unspecifiedUnpaid,
      salaryUnpaidHours: salaryUnpaidHours[r.employeeNumber] ?? totalUnpaidHours(r),
      bonus: bonuses[r.employeeNumber] ?? 0,
      commission: config?.commissionEligible ? commissions[r.employeeNumber] ?? 0 : 0,
    };
  });
}

export function totalUnpaidHours(row: TSheetRow) {
  return row.militaryLeaveUnpaid
    + row.noCallNoShow
    + row.personalUnpaid
    + row.requestedDayOffUnpaid
    + row.sickUnpaid
    + row.suspensionUnpaid
    + row.unspecifiedUnpaid;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

    const ptoHours = row.vacationHours + row.ptoPayout + row.requestedDayOffPaid;
    const salaryUnpaidHours = isSalary ? row.salaryUnpaidHours : 0;
    const salaryUnpaidAdjustment = isSalary ? roundMoney((rate / 80) * salaryUnpaidHours) : 0;
    const regPay = isSalary ? rate : roundMoney(row.regHours * rate);
    const otPay = isSalary ? 0 : roundMoney(row.otHours * rate * 1.5);
    const vacPay = isSalary ? 0 : roundMoney(ptoHours * rate);
    const holPay = isSalary ? 0 : roundMoney(row.holidayHours * rate);
    const totalHours = row.regHours + row.otHours + ptoHours + row.holidayHours;

    const grossPay = roundMoney(
      regPay + otPay + vacPay + holPay + row.bonus + row.commission - salaryUnpaidAdjustment
    );
    const totalDeductions = ded.healthIns + ded.dentalIns + ded.otherIns + ded.fourOhOneK + ded.garnish - ded.reimb;
    const total = roundMoney(grossPay - totalDeductions);

    const summaryRow: MasterSummaryRow = {
      employeeNumber: row.employeeNumber,
      name: row.name,
      payType: config.payType,
      baseRate: rate,
      hours: totalHours,
      regPay,
      otPay,
      vacHours: ptoHours,
      vacPay,
      holHours: row.holidayHours,
      holPay,
      salaryUnpaidHours,
      salaryUnpaidAdjustment,
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
