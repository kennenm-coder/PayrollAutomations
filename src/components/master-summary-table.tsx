"use client";

import { usePayroll } from "@/lib/payroll-context";

function fmt(n: number): string {
  if (n === 0) return "-";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCurrency(n: number): string {
  if (n === 0) return "-";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MasterSummaryTable() {
  const { masterSummaryGroups, setCurrentStep } = usePayroll();

  if (masterSummaryGroups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No data yet. Complete the previous steps first.</p>
        <button
          onClick={() => setCurrentStep(1)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
        >
          ← Back to Payroll Upload
        </button>
      </div>
    );
  }

  let grandTotalGross = 0;
  let grandTotal = 0;

  return (
    <div className="space-y-8">
      {masterSummaryGroups.map((group) => {
        const sectionGross = group.employees.reduce((s, e) => s + e.grossPay, 0);
        const sectionTotal = group.employees.reduce((s, e) => s + e.total, 0);
        grandTotalGross += sectionGross;
        grandTotal += sectionTotal;

        return (
          <div key={group.section} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2 font-semibold text-sm">
              {group.section}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">Name</th>
                    <th className="px-2 py-2 text-left font-medium">Pay Type</th>
                    <th className="px-2 py-2 text-right font-medium">Rate</th>
                    <th className="px-2 py-2 text-right font-medium">Reg Hrs</th>
                    <th className="px-2 py-2 text-right font-medium">REG Pay</th>
                    <th className="px-2 py-2 text-right font-medium">OT Hrs</th>
                    <th className="px-2 py-2 text-right font-medium">OT Pay</th>
                    <th className="px-2 py-2 text-right font-medium">Hol Hrs</th>
                    <th className="px-2 py-2 text-right font-medium">Hol Pay</th>
                    <th className="px-2 py-2 text-right font-medium">Bonus</th>
                    <th className="px-2 py-2 text-right font-medium">Comm</th>
                    <th className="px-2 py-2 text-right font-medium bg-green-50">Gross Pay</th>
                    <th className="px-2 py-2 text-right font-medium">Health</th>
                    <th className="px-2 py-2 text-right font-medium">Dental</th>
                    <th className="px-2 py-2 text-right font-medium">401(k)</th>
                    <th className="px-2 py-2 text-right font-medium">Garnish</th>
                    <th className="px-2 py-2 text-right font-medium bg-blue-50">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {group.employees.map((emp) => (
                    <tr key={emp.name} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 font-medium">{emp.name}</td>
                      <td className="px-2 py-1.5 text-gray-500">{emp.payType}</td>
                      <td className="px-2 py-1.5 text-right">{fmtCurrency(emp.baseRate)}</td>
                      <td className="px-2 py-1.5 text-right">{fmt(emp.regHours)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtCurrency(emp.regPay)}</td>
                      <td className="px-2 py-1.5 text-right">{fmt(emp.otHours)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtCurrency(emp.otPay)}</td>
                      <td className="px-2 py-1.5 text-right">{fmt(emp.holHours)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtCurrency(emp.holPay)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtCurrency(emp.bonus)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtCurrency(emp.commission)}</td>
                      <td className="px-2 py-1.5 text-right bg-green-50 font-medium">{fmtCurrency(emp.grossPay)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtCurrency(emp.healthIns)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtCurrency(emp.dentalIns)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtCurrency(emp.fourOhOneK)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtCurrency(emp.garnish)}</td>
                      <td className="px-2 py-1.5 text-right bg-blue-50 font-medium">{fmtCurrency(emp.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td className="px-2 py-2" colSpan={11}>Subtotal</td>
                    <td className="px-2 py-2 text-right bg-green-100">{fmtCurrency(sectionGross)}</td>
                    <td colSpan={4} />
                    <td className="px-2 py-2 text-right bg-blue-100">{fmtCurrency(sectionTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}

      <div className="bg-gray-900 text-white rounded-lg px-6 py-4 flex justify-between text-sm font-semibold">
        <span>GRAND TOTAL</span>
        <div className="flex gap-8">
          <span>Gross: {fmtCurrency(grandTotalGross)}</span>
          <span>Net: {fmtCurrency(grandTotal)}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setCurrentStep(1)}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={() => setCurrentStep(3)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Export to Excel →
        </button>
      </div>
    </div>
  );
}
