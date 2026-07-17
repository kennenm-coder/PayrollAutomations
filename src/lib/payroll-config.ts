import "server-only";

import { readSheet } from "./google-sheets";
import type {
  DepartmentSection,
  PayrollDeductionConfig,
  PayrollDeductionType,
  PayrollEmployeeConfig,
} from "./types";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function truthy(value: unknown) {
  return value === true || ["true", "yes", "1"].includes(text(value).toLowerCase());
}

function amount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    return date.toISOString().slice(0, 10);
  }
  const raw = text(value);
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) return `${usMatch[3]}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
  return null;
}

function appliesOn(effectiveValue: unknown, endValue: unknown, periodEnd: string) {
  const effective = isoDate(effectiveValue);
  const end = isoDate(endValue);
  return (!effective || effective <= periodEnd) && (!end || end >= periodEnd);
}

export async function getPayrollConfiguration(periodEnd: string) {
  const [employees, rates, deductions] = await Promise.all([
    readSheet("employees"),
    readSheet("rates"),
    readSheet("deductions"),
  ]);

  return employees.records.map((employee): PayrollEmployeeConfig => {
    const employeeNumber = text(employee.values["Employee Number"]);
    const matchingRates = rates.records
      .filter((record) =>
        text(record.values["Employee Number"]) === employeeNumber &&
        truthy(record.values.Active) &&
        appliesOn(record.values["Effective Date"], record.values["End Date"], periodEnd)
      )
      .sort((left, right) =>
        text(right.values["Effective Date"]).localeCompare(text(left.values["Effective Date"]))
      );
    const selectedRate = matchingRates[0];

    const matchingDeductions: PayrollDeductionConfig[] = deductions.records
      .filter((record) =>
        text(record.values["Employee Number"]) === employeeNumber &&
        truthy(record.values.Active) &&
        appliesOn(record.values["Effective Date"], record.values["End Date"], periodEnd)
      )
      .flatMap((record) => {
        const deductionAmount = amount(record.values.Amount);
        return deductionAmount === null
          ? []
          : [{
              type: text(record.values.Type) as PayrollDeductionType,
              description: text(record.values.Description),
              amount: deductionAmount,
            }];
      });

    return {
      employeeNumber,
      payrollId: text(employee.values["Payroll ID"]),
      name: text(employee.values["Employee Name"]),
      active: truthy(employee.values.Active),
      status: text(employee.values.Status),
      department: text(employee.values.Department) as DepartmentSection | "",
      payType: text(employee.values["Pay Type"]) as "Hourly" | "Salary" | "",
      commissionEligible: truthy(employee.values["Commission Eligible"]),
      rateType: selectedRate
        ? text(selectedRate.values["Rate Type"]) as "Hourly" | "Salary Per Pay Period"
        : "",
      rateAmount: selectedRate ? amount(selectedRate.values.Amount) : null,
      deductions: matchingDeductions,
    };
  });
}

