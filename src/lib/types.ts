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
  personalUnpaid: number;
  requestedDayOffUnpaid: number;
  sickUnpaid: number;
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
