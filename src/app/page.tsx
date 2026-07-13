"use client";

import { PayrollProvider, usePayroll } from "@/lib/payroll-context";
import { Stepper } from "@/components/stepper";
import { CSVUpload } from "@/components/csv-upload";
import { PayrollUploadTable } from "@/components/payroll-upload-table";
import { MasterSummaryTable } from "@/components/master-summary-table";
import { ExportPanel } from "@/components/export-panel";

function PayrollApp() {
  const { currentStep } = usePayroll();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">RBA Payroll Automations</h1>
            <p className="text-sm text-gray-500">Renewal by Andersen NWO</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Stepper currentStep={currentStep} />

        {currentStep === 0 && <CSVUpload />}
        {currentStep === 1 && <PayrollUploadTable />}
        {currentStep === 2 && <MasterSummaryTable />}
        {currentStep === 3 && <ExportPanel />}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <PayrollProvider>
      <PayrollApp />
    </PayrollProvider>
  );
}
