import "server-only";

import { google } from "googleapis";
import {
  SHEET_DEFINITIONS,
  type SheetCellValue,
  type SheetKey,
  type SheetRecord,
} from "./sheet-schema";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

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

export async function testEmployeeSheetConnection(): Promise<EmployeeSheetConnection> {
  const employeeSheet = await readSheet("employees");
  const employeeCount = employeeSheet.records.filter(
    (record) => String(record.values["Employee Number"] ?? "").trim().length > 0
  ).length;

  return { employeeCount, sheetName: "Employees" };
}
