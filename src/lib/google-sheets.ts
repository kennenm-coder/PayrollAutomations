import "server-only";

import { google } from "googleapis";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const EMPLOYEES_RANGE = "Employees!A:K";

const REQUIRED_EMPLOYEE_HEADERS = [
  "Employee Number",
  "Payroll ID",
  "Employee Name",
  "Active",
  "Department",
  "T-Sheets Group",
  "Pay Type",
  "Commission Eligible",
  "Status",
  "Notes",
  "Last Updated",
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

function validateEmployeeHeaders(headers: string[]) {
  const missing = REQUIRED_EMPLOYEE_HEADERS.filter(
    (requiredHeader) => !headers.includes(requiredHeader)
  );

  if (missing.length > 0) {
    throw new Error(`The Employees tab is missing: ${missing.join(", ")}.`);
  }
}

export async function testEmployeeSheetConnection(): Promise<EmployeeSheetConnection> {
  const { spreadsheetId, credentials } = getConfiguration();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [SHEETS_SCOPE],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: EMPLOYEES_RANGE,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const rows = response.data.values ?? [];
  const headers = (rows[0] ?? []).map((value) => String(value).trim());
  validateEmployeeHeaders(headers);

  const employeeNumberColumn = headers.indexOf("Employee Number");
  const employeeCount = rows
    .slice(1)
    .filter((row) => String(row[employeeNumberColumn] ?? "").trim().length > 0).length;

  return { employeeCount, sheetName: "Employees" };
}

