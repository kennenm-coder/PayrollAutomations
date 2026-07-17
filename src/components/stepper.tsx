"use client";

const STEPS = [
  { label: "Upload T-Sheets", description: "Import CSV file" },
  { label: "Payroll Upload", description: "Review & add bonus/commission" },
  { label: "Master Summary", description: "Review by department" },
  { label: "Export", description: "Download Excel files" },
];

export function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <nav className="mb-8">
      <ol className="flex items-center w-full">
        {STEPS.map((step, i) => (
          <li key={step.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center w-full">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-semibold
                  ${i < currentStep ? "bg-[#202322] border-[#202322] text-white" : ""}
                  ${i === currentStep ? "bg-[#78BE20] border-[#78BE20] text-[#111312]" : ""}
                  ${i > currentStep ? "bg-gray-100 border-gray-300 text-gray-500" : ""}
                `}
              >
                {i < currentStep ? "✓" : i + 1}
              </div>
              <span className="mt-2 text-xs font-medium text-gray-700">{step.label}</span>
              <span className="text-xs text-gray-500">{step.description}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${i < currentStep ? "bg-[#78BE20]" : "bg-gray-300"}`}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
