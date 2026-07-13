"use client";

import { usePayroll } from "@/lib/payroll-context";
import { exportPayrollUpload, exportMasterSummary, downloadWorkbook } from "@/lib/export-xlsx";

export function ExportPanel() {
  const { payrollUploadRows, masterSummaryGroups, payrollDate, setCurrentStep } = usePayroll();

  const handleExportPayrollUpload = () => {
    const wb = exportPayrollUpload(payrollUploadRows);
    downloadWorkbook(wb, `payroll_upload_${payrollDate.replace(/\s+/g, "_") || "export"}.xlsx`);
  };

  const handleExportMasterSummary = () => {
    const wb = exportMasterSummary(masterSummaryGroups, payrollDate);
    downloadWorkbook(wb, `master_summary_${payrollDate.replace(/\s+/g, "_") || "export"}.xlsx`);
  };

  const hasData = payrollUploadRows.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Export Files</h2>

      {!hasData ? (
        <div className="text-center py-12 text-gray-500">
          <p>Complete the previous steps to enable exports.</p>
          <button
            onClick={() => setCurrentStep(0)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
          >
            Start Over
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="font-semibold mb-2">Payroll Upload File</h3>
            <p className="text-sm text-gray-500 mb-4">
              Hours data split by hourly/salaried with bonus and commission columns.
              {payrollUploadRows.length} employees.
            </p>
            <button
              onClick={handleExportPayrollUpload}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
            >
              Download Payroll Upload (.xlsx)
            </button>
          </div>

          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="font-semibold mb-2">Master Summary File</h3>
            <p className="text-sm text-gray-500 mb-4">
              Department-grouped summary with pay calculations, deductions, and totals.
              {masterSummaryGroups.length} departments.
            </p>
            <button
              onClick={handleExportMasterSummary}
              disabled={masterSummaryGroups.length === 0}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Download Master Summary (.xlsx)
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setCurrentStep(2)}
        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
      >
        ← Back to Master Summary
      </button>
    </div>
  );
}
