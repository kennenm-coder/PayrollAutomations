"use client";

import { useState } from "react";
import { PayrollProvider, usePayroll } from "@/lib/payroll-context";
import { Stepper } from "@/components/stepper";
import { CSVUpload } from "@/components/csv-upload";
import { PayrollUploadTable } from "@/components/payroll-upload-table";
import { MasterSummaryTable } from "@/components/master-summary-table";
import { ExportPanel } from "@/components/export-panel";
import { GoogleSheetsStatus } from "@/components/google-sheets-status";
import { EmployeeMaster } from "@/components/employee-master";

type AppView = "payroll" | "employees";

function PayrollApp() {
  const { currentStep } = usePayroll();
  const [view, setView] = useState<AppView>("payroll");

  return (
    <div className="min-h-screen bg-[#F3F4F1]">
      <div className="h-1 bg-[#78BE20]" />
      <header className="border-b border-white/10 bg-[#171918] text-white shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#78BE20] text-sm font-black text-[#111312]">RBA</div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Payroll Automations</h1>
                <p className="text-xs text-gray-400">Renewal by Andersen NWO</p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2" aria-label="Main navigation">
              <button
                type="button"
                onClick={() => setView("payroll")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${view === "payroll" ? "bg-[#78BE20] text-[#111312]" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}
              >
                Payroll Run
              </button>
              <button
                type="button"
                onClick={() => setView("employees")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${view === "employees" ? "bg-[#78BE20] text-[#111312]" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}
              >
                Payroll Records
              </button>
            </nav>

            <div className="lg:ml-2">
              <GoogleSheetsStatus />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {view === "payroll" ? (
          <>
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5D9419]">Current workflow</p>
              <h2 className="mt-1 text-2xl font-bold text-[#202322]">Process payroll</h2>
            </div>
            <Stepper currentStep={currentStep} />

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              {currentStep === 0 && <CSVUpload />}
              {currentStep === 1 && <PayrollUploadTable />}
              {currentStep === 2 && <MasterSummaryTable />}
              {currentStep === 3 && <ExportPanel />}
            </section>
          </>
        ) : (
          <EmployeeMaster />
        )}
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
