"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  SHEET_DEFINITIONS,
  type SheetCellValue,
  type SheetKey,
  type SheetRecord,
} from "@/lib/sheet-schema";

export const GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1Fmjdq5T8KMwuiEkXHSG8JASyy35EfJJ_xpUzP9XH4-I/edit";

type SessionState =
  | { state: "loading" }
  | { state: "ready"; configured: boolean; authenticated: boolean };

type EditorState = { rowNumber?: number; values: string[] } | null;

const previewColumns: Record<SheetKey, string[]> = {
  employees: ["Employee Number", "Employee Name", "Department", "Pay Type", "Status"],
  rates: ["Employee Number", "Employee Name", "Rate Type", "Amount", "Effective Date"],
  deductions: ["Employee Number", "Employee Name", "Type", "Amount", "Active"],
};

const selectOptions: Record<string, string[]> = {
  Active: ["TRUE", "FALSE"],
  "Commission Eligible": ["TRUE", "FALSE"],
  Department: [
    "OUTSIDE SALES", "SALARIED", "OFFICE", "NEIGHBORHOOD ENGAGEMENT TEAM",
    "EVENTS TEAM", "PAINTERS", "PI/SERVICE", "INSTALL CREW",
  ],
  "Pay Type": ["Hourly", "Salary"],
  Status: ["Ready", "Needs Setup", "Inactive"],
  "Rate Type": ["Hourly", "Salary Per Pay Period"],
  Type: [
    "Health", "Dental/Vision", "Other Insurance", "Retirement",
    "Garnishment", "Reimbursement", "Other",
  ],
};

function displayValue(value: SheetCellValue) {
  if (value === null || value === "") return "-";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number" && !Number.isInteger(value)) return value.toFixed(2);
  return String(value);
}

function formatMoney(value: SheetCellValue) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "$0.00";
}

function inputType(header: string) {
  if (header.includes("Date") || header === "Last Updated") return "date";
  if (header === "Amount") return "number";
  return "text";
}

function serializeValue(header: string, value: string): SheetCellValue {
  if (header === "Active" || header === "Commission Eligible") return value === "TRUE";
  if (header === "Amount") return value.trim() === "" ? null : Number(value);
  return value.trim();
}

function blankValues(sheet: SheetKey) {
  const today = new Date().toISOString().slice(0, 10);
  return SHEET_DEFINITIONS[sheet].headers.map((header) => {
    if (header === "Active") return "TRUE";
    if (header === "Commission Eligible") return "FALSE";
    if (header === "Status") return "Needs Setup";
    if (header === "Last Updated" || header === "Effective Date") return today;
    return "";
  });
}

export function EmployeeMaster() {
  const [session, setSession] = useState<SessionState>({ state: "loading" });
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { configured?: boolean; authenticated?: boolean }) => {
        if (!cancelled) {
          setSession({
            state: "ready",
            configured: Boolean(result.configured),
            authenticated: Boolean(result.authenticated),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setLoginError("");

    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const result = (await response.json()) as { message?: string };

    if (response.ok) {
      setSession({ state: "ready", configured: true, authenticated: true });
      setPassword("");
    } else {
      setLoginError(result.message ?? "Unable to sign in.");
    }
    setSubmitting(false);
  };

  const handleLogout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setSession({ state: "ready", configured: true, authenticated: false });
  };

  if (session.state === "loading") {
    return <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">Loading payroll records...</div>;
  }

  if (!session.configured) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">One setup step remains</p>
        <h2 className="mt-2 text-2xl font-bold text-[#202322]">Protect employee editing</h2>
        <p className="mt-3 text-sm leading-6 text-gray-700">
          Add a Vercel environment variable named <strong>PAYROLL_ADMIN_PASSWORD</strong>, then redeploy.
        </p>
      </div>
    );
  }

  if (!session.authenticated) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#78BE20] text-lg font-black text-[#111312]">RBA</div>
        <h2 className="text-2xl font-bold text-[#202322]">Payroll Records</h2>
        <p className="mt-2 text-sm text-gray-500">Enter the accounting password to view or change employee data.</p>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Accounting password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#78BE20] focus:ring-2 focus:ring-[#78BE20]/20"
          />
          {loginError && <p className="text-sm text-red-600">{loginError}</p>}
          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full rounded-lg bg-[#78BE20] px-4 py-2.5 text-sm font-bold text-[#111312] hover:bg-[#69A91B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Open Payroll Records"}
          </button>
        </form>
        <a href={GOOGLE_SHEET_URL} target="_blank" rel="noreferrer" className="mt-5 block text-center text-xs font-semibold text-gray-500 hover:text-[#4F7F13]">
          Open Google Sheet ↗
        </a>
      </div>
    );
  }

  return <SheetEditor onLogout={handleLogout} />;
}

function SheetEditor({ onLogout }: { onLogout: () => Promise<void> }) {
  const [activeSheet, setActiveSheet] = useState<SheetKey>("employees");
  const [records, setRecords] = useState<SheetRecord[]>([]);
  const [employeeRecords, setEmployeeRecords] = useState<SheetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

  const loadRecords = useCallback(async (sheet: SheetKey) => {
    const response = await fetch(`/api/google-sheets/${sheet}`, { cache: "no-store" });
    if (response.status === 401) throw new Error("Your editing session expired. Refresh and sign in again.");
    const result = (await response.json()) as { records?: SheetRecord[]; message?: string };
    if (!response.ok) throw new Error(result.message ?? "Unable to load the sheet.");
    return result.records ?? [];
  }, []);

  const loadView = useCallback(async (sheet: SheetKey) => {
    const currentRecords = await loadRecords(sheet);
    if (sheet === "employees") {
      return { currentRecords, employees: currentRecords };
    }
    return { currentRecords, employees: await loadRecords("employees") };
  }, [loadRecords]);

  useEffect(() => {
    let cancelled = false;
    void loadView(activeSheet)
      .then(({ currentRecords, employees }) => {
        if (!cancelled) {
          setRecords(currentRecords);
          setEmployeeRecords(employees);
          setError("");
          setLoading(false);
        }
      })
      .catch((loadError: Error) => {
        if (!cancelled) {
          setError(loadError.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeSheet, loadView]);

  const displayedRecords = useMemo(() => {
    if (activeSheet === "employees") return records;

    return employeeRecords.flatMap((employee) => {
      const employeeNumber = String(employee.values["Employee Number"] ?? "").trim();
      const employeeName = String(employee.values["Employee Name"] ?? "").trim();
      const matches = records.filter(
        (record) => String(record.values["Employee Number"] ?? "").trim() === employeeNumber
      );
      if (matches.length > 0) return matches;

      const headers = SHEET_DEFINITIONS[activeSheet].headers;
      const defaults = blankValues(activeSheet);
      const values = Object.fromEntries(headers.map((header, index) => [header, defaults[index]]));
      values["Employee Number"] = employeeNumber;
      values["Employee Name"] = employeeName;
      return [{ rowNumber: -employee.rowNumber, values }];
    });
  }, [activeSheet, employeeRecords, records]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return displayedRecords;
    return displayedRecords.filter((record) =>
      Object.values(record.values).some((value) => displayValue(value).toLowerCase().includes(query))
    );
  }, [displayedRecords, search]);

  const deductionGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employeeRecords.flatMap((employee) => {
      const employeeNumber = String(employee.values["Employee Number"] ?? "").trim();
      const employeeName = String(employee.values["Employee Name"] ?? "").trim();
      const deductions = records.filter(
        (record) => String(record.values["Employee Number"] ?? "").trim() === employeeNumber
      );
      const searchable = [
        employeeNumber,
        employeeName,
        ...deductions.flatMap((record) => Object.values(record.values).map(displayValue)),
      ].join(" ").toLowerCase();
      return !query || searchable.includes(query)
        ? [{ employee, employeeNumber, employeeName, deductions }]
        : [];
    });
  }, [employeeRecords, records, search]);

  const changeSheet = (sheet: SheetKey) => {
    setActiveSheet(sheet);
    setRecords([]);
    setLoading(true);
    setSearch("");
    setEditor(null);
  };

  const editRecord = (record: SheetRecord) => {
    const headers = SHEET_DEFINITIONS[activeSheet].headers;
    setEditor({
      rowNumber: record.rowNumber > 0 ? record.rowNumber : undefined,
      values: headers.map((header) => {
        const displayed = displayValue(record.values[header]);
        return displayed === "-" ? "" : displayed;
      }),
    });
    setSavedMessage("");
  };

  const addDeductionForEmployee = (employee: SheetRecord) => {
    const headers = SHEET_DEFINITIONS.deductions.headers;
    const values = blankValues("deductions");
    values[headers.indexOf("Employee Number")] = String(employee.values["Employee Number"] ?? "");
    values[headers.indexOf("Employee Name")] = String(employee.values["Employee Name"] ?? "");
    setEditor({ values });
    setSavedMessage("");
  };

  const toggleEmployee = (employeeNumber: string) => {
    setExpandedEmployees((current) => {
      const next = new Set(current);
      if (next.has(employeeNumber)) next.delete(employeeNumber);
      else next.add(employeeNumber);
      return next;
    });
  };

  const saveRecord = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    setError("");

    const headers = SHEET_DEFINITIONS[activeSheet].headers;
    const nextValues = [...editor.values];
    const updatedIndex = headers.findIndex((header) => header === "Last Updated");
    if (updatedIndex >= 0) nextValues[updatedIndex] = new Date().toISOString().slice(0, 10);
    const values = headers.map((header, index) => serializeValue(header, nextValues[index]));
    const response = await fetch(`/api/google-sheets/${activeSheet}`, {
      method: editor.rowNumber ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editor.rowNumber ? { rowNumber: editor.rowNumber, values } : { values }),
    });
    const result = (await response.json()) as { message?: string };

    if (response.ok) {
      const nextView = await loadView(activeSheet);
      setRecords(nextView.currentRecords);
      setEmployeeRecords(nextView.employees);
      setEditor(null);
      setSavedMessage("Saved to Google Sheets");
      window.setTimeout(() => setSavedMessage(""), 3000);
    } else {
      setError(result.message ?? "Unable to save.");
    }
    setSaving(false);
  };

  const deleteEmployee = async () => {
    if (!editor?.rowNumber || activeSheet !== "employees") return;
    const headers = SHEET_DEFINITIONS.employees.headers;
    const employeeNumber = editor.values[headers.indexOf("Employee Number")];
    const employeeName = editor.values[headers.indexOf("Employee Name")];
    if (!window.confirm(`Delete ${employeeName || "this employee"}? Their rate and deduction rows will also be removed.`)) return;

    setSaving(true);
    const response = await fetch("/api/google-sheets/employees", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowNumber: editor.rowNumber, employeeNumber }),
    });
    const result = (await response.json()) as { message?: string };
    if (response.ok) {
      const nextView = await loadView("employees");
      setRecords(nextView.currentRecords);
      setEmployeeRecords(nextView.employees);
      setEditor(null);
      setSavedMessage("Employee and related payroll rows deleted");
    } else {
      setError(result.message ?? "Unable to delete employee.");
    }
    setSaving(false);
  };

  const deleteDetailRecord = async () => {
    if (!editor?.rowNumber || activeSheet === "employees") return;
    if (!window.confirm(`Delete this ${SHEET_DEFINITIONS[activeSheet].singular.toLowerCase()}?`)) return;

    setSaving(true);
    const response = await fetch(`/api/google-sheets/${activeSheet}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowNumber: editor.rowNumber }),
    });
    const result = (await response.json()) as { message?: string };
    if (response.ok) {
      const nextView = await loadView(activeSheet);
      setRecords(nextView.currentRecords);
      setEmployeeRecords(nextView.employees);
      setEditor(null);
      setSavedMessage(`${SHEET_DEFINITIONS[activeSheet].singular} deleted`);
    } else {
      setError(result.message ?? "Unable to delete this row.");
    }
    setSaving(false);
  };

  const cleanOldRows = async () => {
    if (!window.confirm("Remove the demo rows and any rate or deduction rows that no longer belong to an employee?")) return;
    setSaving(true);
    setError("");
    const response = await fetch("/api/google-sheets/cleanup", { method: "DELETE" });
    const result = (await response.json()) as { deletedRates?: number; deletedDeductions?: number; message?: string };
    if (response.ok) {
      const nextView = await loadView(activeSheet);
      setRecords(nextView.currentRecords);
      setEmployeeRecords(nextView.employees);
      setSavedMessage(`Removed ${result.deletedRates ?? 0} old rates and ${result.deletedDeductions ?? 0} old deductions`);
    } else {
      setError(result.message ?? "Unable to clean old rows.");
    }
    setSaving(false);
  };

  const definition = SHEET_DEFINITIONS[activeSheet];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-[#202322] p-5 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9AD94A]">Live Google Sheet</p>
          <h2 className="mt-1 text-2xl font-bold">Payroll Records</h2>
          <p className="mt-1 text-sm text-gray-300">Changes made here save directly to the shared workbook.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={GOOGLE_SHEET_URL} target="_blank" rel="noreferrer" className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:border-[#78BE20] hover:text-[#9AD94A]">
            Open Google Sheet ↗
          </a>
          <button type="button" onClick={() => void onLogout()} className="rounded-lg border border-white/20 px-3 py-2 text-sm text-gray-300 hover:text-white">
            Lock editing
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-b border-gray-200 md:flex-row md:items-end md:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {(Object.keys(SHEET_DEFINITIONS) as SheetKey[]).map((sheet) => (
            <button
              type="button"
              key={sheet}
              onClick={() => changeSheet(sheet)}
              className={`border-b-3 px-4 py-3 text-sm font-semibold transition-colors ${
                activeSheet === sheet
                  ? "border-[#78BE20] text-[#36580B]"
                  : "border-transparent text-gray-500 hover:text-[#202322]"
              }`}
            >
              {SHEET_DEFINITIONS[sheet].name}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pb-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${definition.name.toLowerCase()}…`}
            className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#78BE20] md:w-64"
          />
          {activeSheet !== "deductions" && (
            <button
              type="button"
              onClick={() => setEditor({ values: blankValues(activeSheet) })}
              className="whitespace-nowrap rounded-lg bg-[#78BE20] px-4 py-2 text-sm font-bold text-[#111312] hover:bg-[#69A91B]"
            >
              + Add {definition.singular}
            </button>
          )}
        </div>
      </div>

      {activeSheet !== "employees" && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#CFE6B0] bg-[#F4F9EE] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#36580B]">
            <strong>Synced with Employees:</strong> every employee appears here automatically. Save a row only when they need {activeSheet === "rates" ? "a rate" : "a deduction or reimbursement"}.
          </p>
          <button
            type="button"
            onClick={() => void cleanOldRows()}
            disabled={saving}
            className="whitespace-nowrap rounded-lg border border-[#78BE20] px-3 py-2 text-xs font-bold text-[#36580B] hover:bg-white disabled:opacity-50"
          >
            Remove demo/old rows
          </button>
        </div>
      )}

      {savedMessage && <div className="rounded-lg border border-[#B8DF86] bg-[#F1F8E8] px-4 py-3 text-sm font-semibold text-[#36580B]">✓ {savedMessage}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 bg-[#F7F8F6] px-4 py-3">
          <span className="text-sm font-semibold text-[#202322]">
            {activeSheet === "deductions" ? deductionGroups.length : filteredRecords.length} {activeSheet === "employees" ? "employees" : "employee records"}
          </span>
          <span className="text-xs text-gray-500">{activeSheet === "deductions" ? "Click an employee to expand" : "Click a row to edit"}</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading {definition.name.toLowerCase()}…</div>
        ) : activeSheet === "deductions" ? (
          <div className="divide-y divide-gray-100">
            {deductionGroups.map(({ employee, employeeNumber, employeeName, deductions }) => {
              const expanded = expandedEmployees.has(employeeNumber);
              return (
                <div key={employeeNumber}>
                  <div className="grid grid-cols-[2rem_minmax(10rem,1fr)_8rem_auto] items-center gap-3 px-4 py-3 hover:bg-[#F4F9EE]">
                    <button
                      type="button"
                      onClick={() => toggleEmployee(employeeNumber)}
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-[#202322] text-sm font-bold text-white"
                      aria-label={`${expanded ? "Collapse" : "Expand"} ${employeeName}`}
                    >
                      {expanded ? "-" : "+"}
                    </button>
                    <button type="button" onClick={() => toggleEmployee(employeeNumber)} className="min-w-0 text-left">
                      <span className="block truncate font-semibold text-[#202322]">{employeeName}</span>
                      <span className="text-xs text-gray-500">Employee #{employeeNumber}</span>
                    </button>
                    <span className={`rounded-full px-2.5 py-1 text-center text-xs font-semibold ${deductions.length ? "bg-[#E7F4D7] text-[#36580B]" : "bg-gray-100 text-gray-500"}`}>
                      {deductions.length} {deductions.length === 1 ? "item" : "items"}
                    </span>
                    <button
                      type="button"
                      onClick={() => addDeductionForEmployee(employee)}
                      className="rounded-lg border border-[#78BE20] px-3 py-2 text-xs font-bold text-[#36580B] hover:bg-white"
                    >
                      + Add deduction
                    </button>
                  </div>

                  {expanded && (
                    <div className="border-t border-gray-100 bg-[#FAFBF9] px-4 py-3 pl-12">
                      {deductions.length === 0 ? (
                        <p className="py-3 text-sm text-gray-500">No deductions or reimbursements configured.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-100 text-xs text-gray-600">
                              <tr>
                                <th className="px-3 py-2 text-left">Type</th>
                                <th className="px-3 py-2 text-left">Description</th>
                                <th className="px-3 py-2 text-right">Amount</th>
                                <th className="px-3 py-2 text-left">Effective</th>
                                <th className="px-3 py-2 text-left">Active</th>
                                <th className="px-3 py-2 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {deductions.map((deduction) => (
                                <tr key={deduction.rowNumber}>
                                  <td className="px-3 py-2 font-semibold text-[#202322]">{displayValue(deduction.values.Type)}</td>
                                  <td className="px-3 py-2 text-gray-600">{displayValue(deduction.values.Description)}</td>
                                  <td className="px-3 py-2 text-right font-semibold">{formatMoney(deduction.values.Amount)}</td>
                                  <td className="px-3 py-2 text-gray-600">{displayValue(deduction.values["Effective Date"])}</td>
                                  <td className="px-3 py-2 text-gray-600">{displayValue(deduction.values.Active)}</td>
                                  <td className="px-3 py-2 text-right">
                                    <button type="button" onClick={() => editRecord(deduction)} className="font-semibold text-[#4F7F13]">Edit</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#202322] text-white">
                <tr>
                  {previewColumns[activeSheet].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-semibold">{header}</th>)}
                  <th className="px-4 py-3 text-right text-xs font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((record) => (
                  <tr key={record.rowNumber} onClick={() => editRecord(record)} className="cursor-pointer hover:bg-[#F1F8E8]">
                    {previewColumns[activeSheet].map((header) => (
                      <td key={header} className={`whitespace-nowrap px-4 py-3 ${header === "Employee Name" ? "font-semibold text-[#202322]" : "text-gray-600"}`}>
                        {displayValue(record.values[header])}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-semibold text-[#4F7F13]">{record.rowNumber > 0 ? "Edit" : "Set up"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/45" onMouseDown={() => !saving && setEditor(null)}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <form onSubmit={saveRecord}>
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5D9419]">{editor.rowNumber ? "Edit" : "Add"}</p>
                  <h3 className="text-xl font-bold text-[#202322]">{definition.singular}</h3>
                </div>
                <button type="button" onClick={() => setEditor(null)} className="rounded-lg p-2 text-2xl leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close editor">×</button>
              </div>
              <div className="space-y-4 p-6">
                {definition.headers.map((header, index) => (
                  <label key={header} className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-[#343736]">{header}</span>
                    {selectOptions[header] ? (
                      <select
                        value={editor.values[index]}
                        onChange={(event) => setEditor({ ...editor, values: editor.values.map((value, valueIndex) => valueIndex === index ? event.target.value : value) })}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#78BE20] focus:ring-2 focus:ring-[#78BE20]/20"
                      >
                        <option value="">Select…</option>
                        {selectOptions[header].map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input
                        type={inputType(header)}
                        step={header === "Amount" ? "0.01" : undefined}
                        value={editor.values[index]}
                        onChange={(event) => setEditor({ ...editor, values: editor.values.map((value, valueIndex) => valueIndex === index ? event.target.value : value) })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#78BE20] focus:ring-2 focus:ring-[#78BE20]/20"
                      />
                    )}
                  </label>
                ))}
              </div>
              <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-gray-200 bg-white px-6 py-4">
                {activeSheet === "employees" && editor.rowNumber && (
                  <button type="button" onClick={() => void deleteEmployee()} disabled={saving} className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Delete employee</button>
                )}
                {activeSheet !== "employees" && editor.rowNumber && (
                  <button type="button" onClick={() => void deleteDetailRecord()} disabled={saving} className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Delete {definition.singular.toLowerCase()}</button>
                )}
                <button type="button" onClick={() => setEditor(null)} className="min-w-28 flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="min-w-40 flex-1 rounded-lg bg-[#78BE20] px-4 py-2.5 text-sm font-bold text-[#111312] hover:bg-[#69A91B] disabled:opacity-50">
                  {saving ? "Saving…" : "Save to Google Sheet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
