import "server-only";

import { google } from "googleapis";
import {
  SHEET_DEFINITIONS,
  type SheetCellValue,
  type SheetKey,
  type SheetRecord,
} from "./sheet-schema";
import type { PayrollRunRecord } from "./types";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const PAYROLL_RUNS_SHEET = "Payroll Runs";
const PAYROLL_RUN_HEADERS = [
  "Run ID", "Period Start", "Period End", "Finalized At", "Employee Number",
  "Employee Name", "Department", "Pay Type", "Rate Used", "Regular Hours",
  "OT Hours", "Bonus", "Commission", "Gross Pay", "Expected Pay Before Taxes",
  "Vacation Hours", "Vacation Pay", "Salary Unpaid Hours", "Salary Unpaid Adjustment",
] as const;

interface ServiceAccountCredentials {
  client_email?: string;
  private_key?: string;
}

export interface EmployeeSheetConnection {
  employeeCount: number;
  sheetName: "Employees";
}

function getConfiguration() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!spreadsheetId || !credentialsJson) {
    throw new Error("Google Sheets environment variables are not configured.");
  }

  let credentials: ServiceAccountCredentials;

  try {
    credentials = JSON.parse(credentialsJson) as ServiceAccountCredentials;
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("The Google service-account credentials are incomplete.");
  }

  return {
    spreadsheetId,
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key.replace(/\\n/g, "\n"),
    },
  };
}

function getSheetsClient() {
  const { spreadsheetId, credentials } = getConfiguration();
  const auth = new google.auth.GoogleAuth({ credentials, scopes: [SHEETS_SCOPE] });
  return { spreadsheetId, sheets: google.sheets({ version: "v4", auth }) };
}

function validateHeaders(actualHeaders: string[], requiredHeaders: readonly string[], sheetName: string) {
  const missing = requiredHeaders.filter(
    (requiredHeader) => !actualHeaders.includes(requiredHeader)
  );

  if (missing.length > 0) {
    throw new Error(`The ${sheetName} tab is missing: ${missing.join(", ")}.`);
  }
}

function lastColumnLetter(columnCount: number) {
  let result = "";
  let value = columnCount;
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function normalizeRow(values: unknown[], length: number): SheetCellValue[] {
  return Array.from({ length }, (_, index) => {
    const value = values[index];
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? value
      : null;
  });
}

export async function readSheet(sheetKey: SheetKey) {
  const definition = SHEET_DEFINITIONS[sheetKey];
  const { spreadsheetId, sheets } = getSheetsClient();
  const endColumn = lastColumnLetter(definition.headers.length);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${definition.name}'!A:${endColumn}`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const rows = response.data.values ?? [];
  const headers = (rows[0] ?? []).map((value) => String(value).trim());
  validateHeaders(headers, definition.headers, definition.name);

  const records: SheetRecord[] = rows.slice(1).flatMap((row, index) => {
    const normalized = normalizeRow(row, definition.headers.length);
    if (normalized.every((value) => value === null || value === "")) return [];

    return [{
      rowNumber: index + 2,
      values: Object.fromEntries(definition.headers.map((header, column) => [header, normalized[column]])),
    }];
  });

  return { sheet: sheetKey, sheetName: definition.name, headers: [...definition.headers], records };
}

export async function updateSheetRow(sheetKey: SheetKey, rowNumber: number, values: unknown[]) {
  const definition = SHEET_DEFINITIONS[sheetKey];
  if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error("Invalid sheet row.");
  if (values.length !== definition.headers.length) throw new Error("The row has the wrong number of fields.");

  const { spreadsheetId, sheets } = getSheetsClient();
  const endColumn = lastColumnLetter(definition.headers.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${definition.name}'!A${rowNumber}:${endColumn}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [normalizeRow(values, definition.headers.length)] },
  });
}

export async function appendSheetRow(sheetKey: SheetKey, values: unknown[]) {
  const definition = SHEET_DEFINITIONS[sheetKey];
  if (values.length !== definition.headers.length) throw new Error("The row has the wrong number of fields.");

  const { spreadsheetId, sheets } = getSheetsClient();
  const endColumn = lastColumnLetter(definition.headers.length);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${definition.name}'!A:${endColumn}`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [normalizeRow(values, definition.headers.length)] },
  });
}

async function sheetIdsByName() {
  const { spreadsheetId, sheets } = getSheetsClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title)",
  });

  return new Map(
    (response.data.sheets ?? []).flatMap((sheet) => {
      const title = sheet.properties?.title;
      const sheetId = sheet.properties?.sheetId;
      return title && sheetId !== undefined ? [[title, sheetId] as const] : [];
    })
  );
}

async function deleteRows(rowsBySheet: Map<string, number[]>) {
  const { spreadsheetId, sheets } = getSheetsClient();
  const sheetIds = await sheetIdsByName();
  const requests = [...rowsBySheet.entries()].flatMap(([sheetName, rowNumbers]) => {
    const sheetId = sheetIds.get(sheetName);
    if (sheetId === undefined) throw new Error(`The ${sheetName} tab was not found.`);

    return [...new Set(rowNumbers)]
      .sort((left, right) => right - left)
      .map((rowNumber) => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS" as const,
            startIndex: rowNumber - 1,
            endIndex: rowNumber,
          },
        },
      }));
  });

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }
}

export async function deleteEmployeeAndRelatedRecords(rowNumber: number, employeeNumber: string) {
  if (!Number.isInteger(rowNumber) || rowNumber < 2 || !employeeNumber.trim()) {
    throw new Error("Invalid employee deletion request.");
  }

  const [employees, rates, deductions] = await Promise.all([
    readSheet("employees"),
    readSheet("rates"),
    readSheet("deductions"),
  ]);
  const employee = employees.records.find(
    (record) =>
      record.rowNumber === rowNumber &&
      String(record.values["Employee Number"] ?? "").trim() === employeeNumber.trim()
  );
  if (!employee) throw new Error("The employee row changed. Refresh and try again.");

  const relatedRateRows = rates.records
    .filter((record) => String(record.values["Employee Number"] ?? "").trim() === employeeNumber.trim())
    .map((record) => record.rowNumber);
  const relatedDeductionRows = deductions.records
    .filter((record) => String(record.values["Employee Number"] ?? "").trim() === employeeNumber.trim())
    .map((record) => record.rowNumber);

  await deleteRows(new Map([
    [SHEET_DEFINITIONS.rates.name, relatedRateRows],
    [SHEET_DEFINITIONS.deductions.name, relatedDeductionRows],
    [SHEET_DEFINITIONS.employees.name, [rowNumber]],
  ]));

  return {
    deletedEmployee: 1,
    deletedRates: relatedRateRows.length,
    deletedDeductions: relatedDeductionRows.length,
  };
}

export async function deleteSheetRecord(sheetKey: "rates" | "deductions", rowNumber: number) {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error("Invalid row deletion request.");
  await deleteRows(new Map([[SHEET_DEFINITIONS[sheetKey].name, [rowNumber]]]));
}

export async function deleteOrphanedAndDemoRecords() {
  const [employees, rates, deductions] = await Promise.all([
    readSheet("employees"),
    readSheet("rates"),
    readSheet("deductions"),
  ]);
  const employeeNumbers = new Set(
    employees.records.map((record) => String(record.values["Employee Number"] ?? "").trim()).filter(Boolean)
  );
  const demoNames = new Set(["Jordan Adams", "Taylor Brooks", "Morgan Chen", "New Employee Example"]);
  const rowsToDelete = (records: SheetRecord[]) => records
    .filter((record) => {
      const employeeNumber = String(record.values["Employee Number"] ?? "").trim();
      const employeeName = String(record.values["Employee Name"] ?? "").trim();
      return !employeeNumber || !employeeNumbers.has(employeeNumber) || demoNames.has(employeeName);
    })
    .map((record) => record.rowNumber);

  const rateRows = rowsToDelete(rates.records);
  const deductionRows = rowsToDelete(deductions.records);
  await deleteRows(new Map([
    [SHEET_DEFINITIONS.rates.name, rateRows],
    [SHEET_DEFINITIONS.deductions.name, deductionRows],
  ]));

  return { deletedRates: rateRows.length, deletedDeductions: deductionRows.length };
}

export async function testEmployeeSheetConnection(): Promise<EmployeeSheetConnection> {
  const employeeSheet = await readSheet("employees");
  const employeeCount = employeeSheet.records.filter(
    (record) => String(record.values["Employee Number"] ?? "").trim().length > 0
  ).length;

  return { employeeCount, sheetName: "Employees" };
}

export async function appendPayrollRun(
  runId: string,
  periodStart: string,
  periodEnd: string,
  records: PayrollRunRecord[]
) {
  if (!runId || !periodStart || !periodEnd || records.length === 0) {
    throw new Error("Payroll run data is incomplete.");
  }

  const { spreadsheetId, sheets } = getSheetsClient();
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${PAYROLL_RUNS_SHEET}'!A2:A`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const runExists = (existing.data.values ?? []).some(
    (row) => String(row[0] ?? "").trim() === runId
  );
  if (runExists) return { saved: false, duplicate: true, runId };

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${PAYROLL_RUNS_SHEET}'!A1:S1`,
    valueInputOption: "RAW",
    requestBody: { values: [[...PAYROLL_RUN_HEADERS]] },
  });

  const sheetId = (await sheetIdsByName()).get(PAYROLL_RUNS_SHEET);
  if (sheetId !== undefined) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          copyPaste: {
            source: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 14,
              endColumnIndex: 15,
            },
            destination: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 15,
              endColumnIndex: 19,
            },
            pasteType: "PASTE_FORMAT",
          },
        }],
      },
    });
  }

  const finalizedAt = new Date().toISOString();
  const values = records.map((record) => [
    runId,
    periodStart,
    periodEnd,
    finalizedAt,
    record.employeeNumber,
    record.employeeName,
    record.department,
    record.payType,
    record.rateUsed,
    record.regularHours,
    record.overtimeHours,
    record.bonus,
    record.commission,
    record.grossPay,
    record.expectedPayBeforeTaxes,
    record.vacationHours,
    record.vacationPay,
    record.salaryUnpaidHours,
    record.salaryUnpaidAdjustment,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${PAYROLL_RUNS_SHEET}'!A:S`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });

  return { saved: true, duplicate: false, runId, employeeCount: records.length };
}
