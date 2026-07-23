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
      bonus: roundCurrency(bonuses[r.employeeNumber] ?? 0),
      commission: config?.commissionEligible
        ? roundCurrency(commissions[r.employeeNumber] ?? 0)
        : 0,
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

function toCents(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100);
}

function fromCents(value: number) {
  return value / 100;
}

export function roundCurrency(value: number) {
  return fromCents(toCents(value));
}

function deductionTotals(config: PayrollEmployeeConfig, grossPayCents: number) {
  const totals = {
    healthIns: 0,
    dentalIns: 0,
    otherIns: 0,
    reimb: 0,
    fourOhOneK: 0,
    garnish: 0,
  };
  const detailTotals = new Map<string, {
    key: string;
    label: string;
    amountCents: number;
    reimbursement: boolean;
  }>();

  for (const deduction of config.deductions) {
    const amountCents = deduction.type === "Retirement Percentage"
      ? Math.round((grossPayCents * deduction.amount) / 100)
      : toCents(deduction.amount);
    const reimbursement = deduction.type === "Reimbursement";
    const label = deduction.description
      ? `${deduction.type}: ${deduction.description}`
      : deduction.type;
    const key = `${deduction.type}::${deduction.description}`;
    const existingDetail = detailTotals.get(key);
    detailTotals.set(key, {
      key,
      label,
      amountCents: (existingDetail?.amountCents ?? 0) + amountCents,
      reimbursement,
    });

    if (deduction.type === "Health") totals.healthIns += amountCents;
    else if (deduction.type === "Dental/Vision") totals.dentalIns += amountCents;
    else if (
      deduction.type === "Retirement"
      || deduction.type === "Retirement Percentage"
      || deduction.type === "401(k) Fixed Charge"
    ) totals.fourOhOneK += amountCents;
    else if (deduction.type === "Garnishment") totals.garnish += amountCents;
    else if (deduction.type === "Reimbursement") totals.reimb += amountCents;
    else totals.otherIns += amountCents;
  }

  const totalCents = totals.healthIns
    + totals.dentalIns
    + totals.otherIns
    + totals.fourOhOneK
    + totals.garnish
    - totals.reimb;

  return {
    healthIns: fromCents(totals.healthIns),
    dentalIns: fromCents(totals.dentalIns),
    otherIns: fromCents(totals.otherIns),
    reimb: fromCents(totals.reimb),
    fourOhOneK: fromCents(totals.fourOhOneK),
    garnish: fromCents(totals.garnish),
    deductionDetails: [...detailTotals.values()].map((detail) => ({
      key: detail.key,
      label: detail.label,
      amount: fromCents(detail.amountCents),
      reimbursement: detail.reimbursement,
    })),
    totalDeductions: fromCents(totalCents),
    totalCents,
  };
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
    const isSalary = config.payType === "Salary";

    const ptoHours = row.vacationHours + row.ptoPayout + row.requestedDayOffPaid;
    const salaryUnpaidHours = isSalary ? row.salaryUnpaidHours : 0;
    const salaryUnpaidAdjustmentCents = isSalary
      ? toCents((rate / 80) * salaryUnpaidHours)
      : 0;
    const regPayCents = isSalary ? toCents(rate) : toCents(row.regHours * rate);
    const otPayCents = isSalary ? 0 : toCents(row.otHours * rate * 1.5);
    const vacPayCents = isSalary ? 0 : toCents(ptoHours * rate);
    const holPayCents = isSalary ? 0 : toCents(row.holidayHours * rate);
    const bonusCents = toCents(row.bonus);
    const commissionCents = toCents(row.commission);
    const totalHours = row.regHours + row.otHours + ptoHours + row.holidayHours;

    const grossPayCents = regPayCents
      + otPayCents
      + vacPayCents
      + holPayCents
      + bonusCents
      + commissionCents
      - salaryUnpaidAdjustmentCents;
    const ded = deductionTotals(config, grossPayCents);
    const totalCents = grossPayCents - ded.totalCents;

    const regPay = fromCents(regPayCents);
    const otPay = fromCents(otPayCents);
    const vacPay = fromCents(vacPayCents);
    const holPay = fromCents(holPayCents);
    const salaryUnpaidAdjustment = fromCents(salaryUnpaidAdjustmentCents);
    const grossPay = fromCents(grossPayCents);
    const total = fromCents(totalCents);

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
      deductionDetails: ded.deductionDetails,
      totalDeductions: ded.totalDeductions,
      total,
    };

    const list = groups.get(dept);
    if (list) list.push(summaryRow);
  }

  return DEPARTMENT_ORDER
    .filter((d) => (groups.get(d)?.length ?? 0) > 0)
    .map((d) => ({ section: d, employees: groups.get(d)! }));
}
