export const SHEET_DEFINITIONS = {
  employees: {
    name: "Employees",
    singular: "Employee",
    headers: [
      "Employee Number", "Payroll ID", "Employee Name", "Active", "Department",
      "T-Sheets Group", "Pay Type", "Commission Eligible", "Status", "Notes", "Last Updated",
    ],
  },
  rates: {
    name: "Rates",
    singular: "Rate",
    headers: [
      "Employee Number", "Employee Name", "Rate Type", "Amount",
      "Effective Date", "End Date", "Active", "Notes",
    ],
  },
  deductions: {
    name: "Deductions",
    singular: "Deduction",
    headers: [
      "Employee Number", "Employee Name", "Type", "Description", "Amount",
      "Effective Date", "End Date", "Active", "Notes",
    ],
  },
} as const;

export type SheetKey = keyof typeof SHEET_DEFINITIONS;
export type SheetCellValue = string | number | boolean | null;

export interface SheetRecord {
  rowNumber: number;
  values: Record<string, SheetCellValue>;
}

export function isSheetKey(value: string): value is SheetKey {
  return value in SHEET_DEFINITIONS;
}
