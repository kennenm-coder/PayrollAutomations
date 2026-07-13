"use client";

import { useCallback, useState } from "react";
import { usePayroll } from "@/lib/payroll-context";
import { parseTSheetsCSV } from "@/lib/parse-csv";

export function CSVUpload() {
  const { setTSheetRows, setCurrentStep, setPayrollDate } = usePayroll();
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ total: number; hourly: number; salaried: number } | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      setFileName(file.name);

      const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})_thru_(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        setPayrollDate(`${dateMatch[1]} thru ${dateMatch[2]}`);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const rows = parseTSheetsCSV(text);
          if (rows.length === 0) {
            setError("No employee data found in CSV. Check the file format.");
            return;
          }
          setTSheetRows(rows);
          setPreview({
            total: rows.length,
            hourly: rows.filter((r) => !r.salaried).length,
            salaried: rows.filter((r) => r.salaried).length,
          });
        } catch {
          setError("Failed to parse CSV file. Make sure it's a valid T-Sheets export.");
        }
      };
      reader.readAsText(file);
    },
    [setTSheetRows, setPayrollDate]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".csv")) handleFile(file);
      else setError("Please upload a .csv file");
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Payroll Date</label>
        <input
          type="text"
          placeholder="e.g. 6/22/2026 thru 7/5/2026"
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md text-sm"
          onChange={(e) => setPayrollDate(e.target.value)}
        />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
        onClick={() => document.getElementById("csv-input")?.click()}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
        />
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {fileName ? (
            <p className="text-sm font-medium text-green-600">{fileName}</p>
          ) : (
            <>
              <p className="text-sm font-medium">Drop T-Sheets CSV here or click to browse</p>
              <p className="text-xs mt-1">payroll_hrs_summary_*.csv</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {preview && (
        <div className="bg-green-50 border border-green-200 px-4 py-3 rounded-md">
          <p className="text-sm font-medium text-green-800">
            Loaded {preview.total} employees ({preview.hourly} hourly, {preview.salaried} salaried)
          </p>
          <button
            onClick={() => setCurrentStep(1)}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Continue to Payroll Upload →
          </button>
        </div>
      )}
    </div>
  );
}
