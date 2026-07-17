"use client";

import { usePayroll } from "@/lib/payroll-context";
import { useMemo } from "react";

export function PayrollUploadTable() {
  const {
    tsheetRows, bonuses, commissions,
    setBonus, setCommission, setCurrentStep,
    generatePayrollUpload,
  } = usePayroll();

  const hourlyRows = useMemo(
    () => tsheetRows.filter((r) => !r.salaried),
    [tsheetRows]
  );
  const salariedRows = useMemo(
    () => tsheetRows.filter((r) => r.salaried),
    [tsheetRows]
  );

  const handleContinue = () => {
    generatePayrollUpload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payroll Upload - Hourly Employees</h2>
        <span className="text-sm text-gray-500">{hourlyRows.length} employees</span>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left font-medium text-gray-700">ID</th>
              <th className="px-2 py-2 text-left font-medium text-gray-700">Name</th>
              <th className="px-2 py-2 text-right font-medium text-gray-700">Reg Hrs</th>
              <th className="px-2 py-2 text-right font-medium text-gray-700">OT</th>
              <th className="px-2 py-2 text-right font-medium text-gray-700">Holiday</th>
              <th className="px-2 py-2 text-right font-medium text-gray-700">PTO</th>
              <th className="px-2 py-2 text-right font-medium text-gray-700">Paid Day Off</th>
              <th className="px-2 py-2 text-right font-medium text-gray-700">Vacation</th>
              <th className="px-2 py-2 text-right font-medium text-gray-700">Unpaid RDO</th>
              <th className="px-2 py-2 text-right font-medium text-gray-700 bg-yellow-50">Bonus</th>
              <th className="px-2 py-2 text-right font-medium text-gray-700 bg-yellow-50">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {hourlyRows.map((row) => (
              <tr key={row.employeeNumber} className="hover:bg-gray-50">
                <td className="px-2 py-1.5 text-gray-600">{row.payrollId}</td>
                <td className="px-2 py-1.5 font-medium">{row.name}</td>
                <td className="px-2 py-1.5 text-right">{row.regHours.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-right">{row.otHours || ""}</td>
                <td className="px-2 py-1.5 text-right">{row.holidayHours || ""}</td>
                <td className="px-2 py-1.5 text-right">{row.ptoPayout || ""}</td>
                <td className="px-2 py-1.5 text-right">{row.requestedDayOffPaid || ""}</td>
                <td className="px-2 py-1.5 text-right">{row.vacationHours || ""}</td>
                <td className="px-2 py-1.5 text-right">{row.requestedDayOffUnpaid || ""}</td>
                <td className="px-2 py-1.5 bg-yellow-50">
                  <input
                    type="number"
                    step="0.01"
                    className="w-20 px-1 py-0.5 border rounded text-right text-xs"
                    value={bonuses[row.employeeNumber] || ""}
                    onChange={(e) => setBonus(row.employeeNumber, parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </td>
                <td className="px-2 py-1.5 bg-yellow-50">
                  <input
                    type="number"
                    step="0.01"
                    className="w-20 px-1 py-0.5 border rounded text-right text-xs"
                    value={commissions[row.employeeNumber] || ""}
                    onChange={(e) => setCommission(row.employeeNumber, parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {salariedRows.length > 0 && (
        <>
          <div className="flex items-center justify-between mt-8">
            <h2 className="text-lg font-semibold">Salaried Employees</h2>
            <span className="text-sm text-gray-500">{salariedRows.length} employees</span>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-gray-700">ID</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-700">Name</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-700">Group</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-700">Holiday</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-700">Paid Day Off</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-700 bg-yellow-50">Bonus</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-700 bg-yellow-50">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {salariedRows.map((row) => (
                  <tr key={row.employeeNumber} className="hover:bg-gray-50">
                    <td className="px-2 py-1.5 text-gray-600">{row.payrollId}</td>
                    <td className="px-2 py-1.5 font-medium">{row.name}</td>
                    <td className="px-2 py-1.5 text-gray-500">{row.group}</td>
                    <td className="px-2 py-1.5 text-right">{row.holidayHours || ""}</td>
                    <td className="px-2 py-1.5 text-right">{row.requestedDayOffPaid || ""}</td>
                    <td className="px-2 py-1.5 bg-yellow-50">
                      <input
                        type="number"
                        step="0.01"
                        className="w-20 px-1 py-0.5 border rounded text-right text-xs"
                        value={bonuses[row.employeeNumber] || ""}
                        onChange={(e) => setBonus(row.employeeNumber, parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-2 py-1.5 bg-yellow-50">
                      <input
                        type="number"
                        step="0.01"
                        className="w-20 px-1 py-0.5 border rounded text-right text-xs"
                        value={commissions[row.employeeNumber] || ""}
                        onChange={(e) => setCommission(row.employeeNumber, parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setCurrentStep(0)}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={handleContinue}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Generate Master Summary →
        </button>
      </div>
    </div>
  );
}
