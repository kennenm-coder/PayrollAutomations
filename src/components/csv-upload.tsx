"use client";

import { useCallback, useState } from "react";
import { usePayroll } from "@/lib/payroll-context";
import { parseTSheetsCSV } from "@/lib/parse-csv";
import type {
  PayrollConfigurationIssue,
  PayrollEmployeeConfig,
  TSheetRow,
} from "@/lib/types";

function periodEndFrom(value: string) {
  const isoDates = [...value.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((match) => match[0]);
  if (isoDates.length > 0) return isoDates.at(-1) ?? null;

  const usDates = [...value.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)];
  const last = usDates.at(-1);
  return last
    ? `${last[3]}-${last[1].padStart(2, "0")}-${last[2].padStart(2, "0")}`
    : null;
}

function toIsoDate(month: string, day: string, year: string) {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function payrollDatesFrom(value: string) {
  const [startValue, endValue] = value.split(/\s+thru\s*/i);
  if (endValue !== undefined) {
    const dateFrom = (part: string) => {
      const isoDate = part.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (isoDate) return isoDate;
      const usDate = part.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      return usDate ? toIsoDate(usDate[1], usDate[2], usDate[3]) : "";
    };
    return { startDate: dateFrom(startValue), endDate: dateFrom(endValue) };
  }

  const isoDates = [...value.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((match) => match[0]);
  if (isoDates.length >= 2) {
    return { startDate: isoDates[0], endDate: isoDates.at(-1) ?? "" };
  }

  const usDates = [...value.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)].map(
    (match) => toIsoDate(match[1], match[2], match[3])
  );
  return {
    startDate: usDates[0] ?? "",
    endDate: usDates.length >= 2 ? usDates.at(-1) ?? "" : "",
  };
}

function formatIsoDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}/${year}`;
}

function formatPayrollDate(startDate: string, endDate: string) {
  if (startDate && endDate) {
    return `${formatIsoDate(startDate)} thru ${formatIsoDate(endDate)}`;
  }
  if (startDate) return `${startDate} thru `;
  if (endDate) return ` thru ${endDate}`;
  return "";
}

function validateConfiguration(
  rows: TSheetRow[],
  configs: Record<string, PayrollEmployeeConfig>
): PayrollConfigurationIssue[] {
  const issues: PayrollConfigurationIssue[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const employeeNumber = row.employeeNumber.trim();
    const addIssue = (message: string) => issues.push({
      employeeNumber,
      employeeName: row.name,
      message,
    });

    if (!employeeNumber) {
      addIssue("Employee Number is missing from the CSV.");
      continue;
    }
    if (seen.has(employeeNumber)) addIssue("Employee appears more than once in the CSV.");
    seen.add(employeeNumber);

    const config = configs[employeeNumber];
    if (!config) {
      addIssue("Employee is missing from Payroll Records.");
      continue;
    }
    if (!config.active || config.status === "Inactive") addIssue("Employee is inactive.");
    if (config.status !== "Ready") addIssue("Employee status must be Ready.");
    if (!config.department) addIssue("Department is missing.");
    if (!config.payType) addIssue("Pay Type is missing.");
    if (!config.payrollId && !row.payrollId) addIssue("Payroll ID is missing.");
    if (config.rateAmount === null || config.rateAmount <= 0) addIssue("An active rate is missing.");
    if (config.payType === "Hourly" && config.rateType !== "Hourly") {
      addIssue("Hourly employee needs an Hourly rate.");
    }
    if (config.payType === "Salary" && config.rateType !== "Salary Per Pay Period") {
      addIssue("Salary employee needs a Salary Per Pay Period rate.");
    }
    if (config.deductions.some((deduction) =>
      deduction.type === "Retirement Percentage"
      && (deduction.amount < 0 || deduction.amount > 100)
    )) {
      addIssue("Retirement Percentage must be between 0 and 100.");
    }
  }

  return issues;
}

export function CSVUpload() {
  const {
    payrollDate,
    setTSheetRows,
    setCurrentStep,
    setPayrollDate,
    setPayrollConfiguration,
  } = usePayroll();
  const { startDate, endDate } = payrollDatesFrom(payrollDate);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<PayrollConfigurationIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    total: number;
    hourly: number;
    salaried: number;
    importedBonuses: number;
    importedCommissions: number;
  } | null>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    setIssues([]);
    setPreview(null);
    setFileName(file.name);

    const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})_thru_(\d{4}-\d{2}-\d{2})/);
    const selectedPayrollDate = dateMatch
      ? formatPayrollDate(dateMatch[1], dateMatch[2])
      : payrollDate;
    if (dateMatch) setPayrollDate(selectedPayrollDate);

    const periodEnd = periodEndFrom(selectedPayrollDate);
    if (!periodEnd) {
      setError("Select both the start date and end date before uploading the CSV.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      setLoading(true);
      try {
        const rows = parseTSheetsCSV(event.target?.result as string);
        if (rows.length === 0) {
          throw new Error("No employee data found in CSV. Check the file format.");
        }

        const response = await fetch(`/api/payroll/config?periodEnd=${periodEnd}`, {
          cache: "no-store",
        });
        const payload = await response.json() as {
          employees?: PayrollEmployeeConfig[];
          message?: string;
        };
        if (!response.ok || !payload.employees) {
          throw new Error(payload.message || "Unable to load Payroll Records.");
        }

        const configs = Object.fromEntries(
          payload.employees.map((employee) => [employee.employeeNumber, employee])
        );
        const configurationIssues = validateConfiguration(rows, configs);

        setTSheetRows(rows);
        setPayrollConfiguration(configs, configurationIssues);
        setIssues(configurationIssues);
        setPreview({
          total: rows.length,
          hourly: rows.filter((row) => configs[row.employeeNumber]?.payType === "Hourly").length,
          salaried: rows.filter((row) => configs[row.employeeNumber]?.payType === "Salary").length,
          importedBonuses: rows.filter((row) => row.bonus !== 0).length,
          importedCommissions: rows.filter((row) => row.commission !== 0).length,
        });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed to process the CSV file.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  }, [payrollDate, setPayrollConfiguration, setTSheetRows, setPayrollDate]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file?.name.toLowerCase().endsWith(".csv")) handleFile(file);
    else setError("Please upload a .csv file.");
  }, [handleFile]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Payroll Date Range</p>
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <label className="text-sm text-gray-700">
            <span className="mb-1 block">Start Date</span>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => {
                const value = event.target.value;
                setPayrollDate(formatPayrollDate(value, endDate));
                setError(null);
              }}
            />
          </label>
          <label className="text-sm text-gray-700">
            <span className="mb-1 block">End Date</span>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => {
                const value = event.target.value;
                setPayrollDate(formatPayrollDate(startDate, value));
                setError(null);
              }}
            />
          </label>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-[#FAFBF9] p-12 text-center transition-colors hover:border-[#78BE20] hover:bg-[#F5FAEF]"
        onClick={() => document.getElementById("csv-input")?.click()}
      >
        <input id="csv-input" type="file" accept=".csv" onChange={handleChange} className="hidden" />
        <div className="text-gray-500">
          <svg className="mx-auto mb-4 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {loading ? (
            <p className="text-sm font-medium text-[#5D9419]">Checking Payroll Records...</p>
          ) : fileName ? (
            <p className="text-sm font-medium text-green-600">{fileName}</p>
          ) : (
            <>
              <p className="text-sm font-medium">Drop T-Sheets CSV here or click to browse</p>
              <p className="mt-1 text-xs">payroll_hrs_summary_*.csv</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {issues.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Fix these items in Payroll Records before continuing:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {issues.slice(0, 8).map((issue, index) => (
              <li key={`${issue.employeeNumber}-${issue.message}-${index}`}>
                {issue.employeeName || issue.employeeNumber}: {issue.message}
              </li>
            ))}
          </ul>
          {issues.length > 8 && <p className="mt-2">Plus {issues.length - 8} more issue(s).</p>}
        </div>
      )}

      {preview && (
        <div className={`${issues.length === 0 ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"} rounded-md border px-4 py-3`}>
          <p className="text-sm font-medium text-gray-800">
            Loaded {preview.total} employees ({preview.hourly} hourly, {preview.salaried} salaried)
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Imported {preview.importedBonuses} bonuses and {preview.importedCommissions} commissions from the CSV.
          </p>
          {issues.length === 0 && (
            <button
              onClick={() => setCurrentStep(1)}
              className="mt-3 rounded-lg bg-[#78BE20] px-4 py-2 text-sm font-bold text-[#111312] hover:bg-[#69A91B]"
            >
              Continue to Payroll Upload &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
