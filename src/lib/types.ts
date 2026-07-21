export interface TSheetRow {
  payrollId: string;
  employeeNumber: string;
  name: string;
  group: string;
  salaried: boolean;
  exempt: boolean;
  regHours: number;
  otHours: number;
  bereavementHours: number;
  empSickLeave: number;
  familySickLeave: number;
  fmlaHours: number;
  holidayHours: number;
  ptoPayout: number;
  requestedDayOffPaid: number;
  vacationHours: number;
  militaryLeaveUnpaid: number;
  noCallNoShow: number;
  personalUnpaid: number;
  requestedDayOffUnpaid: number;
  sickUnpaid: number;
  suspensionUnpaid: number;
  unspecifiedUnpaid: number;
  bonus: number;
  commission: number;
  approvalState: string;
}

export interface PayrollUploadRow {
  payrollId: string;
  employeeNumber: string;
  name: string;
  regHours: number;
  otHours: number;
  bereavementHours: number;
  holidayHours: number;
  ptoPayout: number;
  requestedDayOffPaid: number;
  vacationHours: number;
  militaryLeaveUnpaid: number;
  noCallNoShow: number;
  personalUnpaid: number;
  requestedDayOffUnpaid: number;
  sickUnpaid: number;
  suspensionUnpaid: number;
  unspecifiedUnpaid: number;
  salaryUnpaidHours: number;
  bonus: number;
  commission: number;
}

export type DepartmentSection =
  | "OUTSIDE SALES"
  | "SALARIED"
  | "OFFICE"
  | "NEIGHBORHOOD ENGAGEMENT TEAM"
  | "EVENTS TEAM"
  | "PAINTERS"
  | "INSTALL CREW"
  | "PI/SERVICE";

export interface MasterSummaryRow {
  employeeNumber: string;
  name: string;
  payType: string;
  baseRate: number;
  hours: number;
  regPay: number;
  otPay: number;
  vacHours: number;
  vacPay: number;
  holHours: number;
  holPay: number;
  salaryUnpaidHours: number;
  salaryUnpaidAdjustment: number;
  bonus: number;
  commission: number;
  regHours: number;
  otHours: number;
  grossPay: number;
  healthIns: number;
  dentalIns: number;
  otherIns: number;
  reimb: number;
  fourOhOneK: number;
  garnish: number;
  total: number;
}

export interface DepartmentGroup {
  section: DepartmentSection;
  employees: MasterSummaryRow[];
}

export type PayrollDeductionType =
  | "Health"
  | "Dental/Vision"
  | "Other Insurance"
  | "Retirement"
  | "Garnishment"
  | "Reimbursement"
  | "Other";

export interface PayrollDeductionConfig {
  type: PayrollDeductionType;
  description: string;
  amount: number;
}

export interface PayrollEmployeeConfig {
  employeeNumber: string;
  payrollId: string;
  name: string;
  active: boolean;
  status: string;
  department: DepartmentSection | "";
  payType: "Hourly" | "Salary" | "";
  commissionEligible: boolean;
  rateType: "Hourly" | "Salary Per Pay Period" | "";
  rateAmount: number | null;
  deductions: PayrollDeductionConfig[];
}

export interface PayrollConfigurationIssue {
  employeeNumber: string;
  employeeName: string;
  message: string;
}

export interface PayrollRunRecord {
  employeeNumber: string;
  employeeName: string;
  department: DepartmentSection;
  payType: string;
  rateUsed: number;
  regularHours: number;
  overtimeHours: number;
  bonus: number;
  commission: number;
  grossPay: number;
  expectedPayBeforeTaxes: number;
  vacationHours: number;
  vacationPay: number;
  salaryUnpaidHours: number;
  salaryUnpaidAdjustment: number;
}

export interface EmployeeConfig {
  name: string;
  payrollId: string;
  department: DepartmentSection;
  payType: string;
  baseRate: number;
  hireDate?: string;
  healthIns: number;
  dentalIns: number;
  otherIns: number;
  fourOhOneK: number;
  garnish: number;
}
