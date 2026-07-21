"use client";

import { useState } from "react";
import { usePayroll } from "@/lib/payroll-context";
import { exportPayrollUpload, exportMasterSummary, downloadWorkbook } from "@/lib/export-xlsx";
import type { PayrollRunRecord } from "@/lib/types";

function isoDate(month: string, day: string, year: string) {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parsePayrollPeriod(value: string) {
  const isoDates = [...value.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((match) => match[0]);
  if (isoDates.length >= 2) return { periodStart: isoDates[0], periodEnd: isoDates.at(-1)! };

  const usDates = [...value.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)];
  if (usDates.length >= 2) {
    const first = usDates[0];
    const last = usDates.at(-1)!;
    return {
      periodStart: isoDate(first[1], first[2], first[3]),
      periodEnd: isoDate(last[1], last[2], last[3]),
    };
  }

  return null;
}

export function ExportPanel() {
  const {
    payrollUploadRows,
    masterSummaryGroups,
    payrollDate,
    exportedPayrollUpload,
    exportedMasterSummary,
    payrollRunSaved,
    payrollRunId,
    setCurrentStep,
    markPayrollUploadExported,
    markMasterSummaryExported,
    markPayrollRunSaved,
  } = usePayroll();
  const [savingRun, setSavingRun] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleExportPayrollUpload = () => {
    const wb = exportPayrollUpload(payrollUploadRows);
    downloadWorkbook(wb, `payroll_upload_${payrollDate.replace(/\s+/g, "_") || "export"}.xlsx`);
    markPayrollUploadExported();
  };

  const handleExportMasterSummary = () => {
    const wb = exportMasterSummary(masterSummaryGroups, payrollDate);
    downloadWorkbook(wb, `master_summary_${payrollDate.replace(/\s+/g, "_") || "export"}.xlsx`);
    markMasterSummaryExported();
  };

  const handleFinalize = async () => {
    const period = parsePayrollPeriod(payrollDate);
    if (!period) {
      setSaveError("The payroll date range is missing or invalid.");
      return;
    }

    const records: PayrollRunRecord[] = masterSummaryGroups.flatMap((group) =>
      group.employees.map((employee) => ({
        employeeNumber: employee.employeeNumber,
        employeeName: employee.name,
        department: group.section,
        payType: employee.payType,
        rateUsed: employee.baseRate,
        regularHours: employee.regHours,
        overtimeHours: employee.otHours,
        bonus: employee.bonus,
        commission: employee.commission,
        grossPay: employee.grossPay,
        expectedPayBeforeTaxes: employee.total,
        vacationHours: employee.vacHours,
        vacationPay: employee.vacPay,
        salaryUnpaidHours: employee.salaryUnpaidHours,
        salaryUnpaidAdjustment: employee.salaryUnpaidAdjustment,
      }))
    );

    setSavingRun(true);
    setSaveError("");
    try {
      const response = await fetch("/api/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...period, records }),
      });
      const result = await response.json() as { runId?: string; message?: string };
      if (!response.ok || !result.runId) {
        throw new Error(result.message || "Unable to save payroll to Google Sheets.");
      }
      markPayrollRunSaved(result.runId);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save payroll to Google Sheets.");
    } finally {
      setSavingRun(false);
    }
  };

  const hasData = payrollUploadRows.length > 0;
  const exportsComplete = exportedPayrollUpload && exportedMasterSummary;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Export and Finalize</h2>

      {!hasData ? (
        <div className="text-center py-12 text-gray-500">
          <p>Complete the previous steps to enable exports.</p>
          <button
            onClick={() => setCurrentStep(0)}
            className="mt-4 rounded-lg bg-[#78BE20] px-4 py-2 text-sm font-bold text-[#111312]"
          >
            Start Over
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border p-6 transition-shadow hover:shadow-md">
              <h3 className="mb-2 font-semibold">Payroll Upload File</h3>
              <p className="mb-4 text-sm text-gray-500">
                All employee hours with bonus and eligible commission columns. {payrollUploadRows.length} employees.
              </p>
              <button
                onClick={handleExportPayrollUpload}
                className="w-full rounded-lg bg-[#78BE20] px-4 py-2 text-sm font-bold text-[#111312] hover:bg-[#69A91B]"
              >
                {exportedPayrollUpload ? "Downloaded Payroll Upload" : "Download Payroll Upload (.xlsx)"}
              </button>
            </div>

            <div className="rounded-lg border p-6 transition-shadow hover:shadow-md">
              <h3 className="mb-2 font-semibold">Master Summary File</h3>
              <p className="mb-4 text-sm text-gray-500">
                Department summary with PTO, salary adjustments, deductions, and totals. {masterSummaryGroups.length} departments.
              </p>
              <button
                onClick={handleExportMasterSummary}
                disabled={masterSummaryGroups.length === 0}
                className="w-full rounded-lg bg-[#78BE20] px-4 py-2 text-sm font-bold text-[#111312] hover:bg-[#69A91B] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {exportedMasterSummary ? "Downloaded Master Summary" : "Download Master Summary (.xlsx)"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#B8D98E] bg-[#F5FAEF] p-5">
            <h3 className="font-semibold text-[#202322]">Finalize Payroll Run</h3>
            <p className="mt-1 text-sm text-gray-600">
              After downloading both files, save the completed payroll into the Google Sheet Payroll Runs tab.
            </p>
            {saveError && <p className="mt-3 text-sm font-medium text-red-700">{saveError}</p>}
            {payrollRunSaved ? (
              <p className="mt-4 text-sm font-bold text-[#4E7E14]">
                Saved to Google Sheets as payroll run {payrollRunId}.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={!exportsComplete || savingRun}
                className="mt-4 rounded-lg bg-[#202322] px-4 py-2 text-sm font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {savingRun ? "Saving..." : "Finalize and Save to Google Sheets"}
              </button>
            )}
          </div>
        </>
      )}

      <button
        onClick={() => setCurrentStep(2)}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
      >
        &larr; Back to Master Summary
      </button>
    </div>
  );
}
