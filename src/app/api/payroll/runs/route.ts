import { isPayrollAdmin } from "@/lib/admin-auth";
import { appendPayrollRun } from "@/lib/google-sheets";
import type { PayrollRunRecord } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PayrollRunRequest {
  periodStart?: string;
  periodEnd?: string;
  records?: PayrollRunRecord[];
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidRecord(record: PayrollRunRecord) {
  return Boolean(record)
    && typeof record.employeeNumber === "string"
    && typeof record.employeeName === "string"
    && typeof record.department === "string"
    && typeof record.payType === "string"
    && [
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
    ].every(isFiniteNumber);
}

export async function POST(request: Request) {
  if (!(await isPayrollAdmin())) {
    return Response.json(
      { message: "Open Payroll Records and enter the accounting password first." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null) as PayrollRunRequest | null;
  if (
    !body
    || !isIsoDate(body.periodStart)
    || !isIsoDate(body.periodEnd)
    || !Array.isArray(body.records)
    || body.records.length === 0
    || body.records.length > 500
    || !body.records.every(isValidRecord)
  ) {
    return Response.json({ message: "The payroll run data is invalid." }, { status: 400 });
  }

  try {
    const result = await appendPayrollRun(
      body.periodEnd,
      body.periodStart,
      body.periodEnd,
      body.records
    );
    if (result.duplicate) {
      return Response.json(
        { message: `Payroll ${body.periodEnd} is already saved in Google Sheets.` },
        { status: 409 }
      );
    }
    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error("Unable to save payroll run:", error);
    return Response.json({ message: "Unable to save this payroll run to Google Sheets." }, { status: 502 });
  }
}
