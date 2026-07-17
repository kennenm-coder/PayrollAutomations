import { isPayrollAdmin } from "@/lib/admin-auth";
import {
  appendSheetRow,
  deleteEmployeeAndRelatedRecords,
  readSheet,
  updateSheetRow,
} from "@/lib/google-sheets";
import { isSheetKey, type SheetKey } from "@/lib/sheet-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ sheet: string }> };

type SheetAccess =
  | { ok: true; sheet: SheetKey }
  | { ok: false; error: "unauthorized" | "not-found" };

async function authorizedSheet(context: RouteParams): Promise<SheetAccess> {
  if (!(await isPayrollAdmin())) return { ok: false, error: "unauthorized" };
  const { sheet } = await context.params;
  if (!isSheetKey(sheet)) return { ok: false, error: "not-found" };
  return { ok: true, sheet };
}

function errorResponse(error: "unauthorized" | "not-found") {
  return error === "unauthorized"
    ? Response.json({ message: "Admin sign-in required." }, { status: 401 })
    : Response.json({ message: "Unknown sheet." }, { status: 404 });
}

export async function GET(_request: Request, context: RouteParams) {
  const access = await authorizedSheet(context);
  if (!access.ok) return errorResponse(access.error);

  try {
    return Response.json(await readSheet(access.sheet), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to read Google Sheet:", error);
    return Response.json({ message: "Unable to load this sheet." }, { status: 502 });
  }
}

export async function PATCH(request: Request, context: RouteParams) {
  const access = await authorizedSheet(context);
  if (!access.ok) return errorResponse(access.error);

  const body = (await request.json().catch(() => null)) as
    | { rowNumber?: number; values?: unknown[] }
    | null;
  if (!body?.rowNumber || !Array.isArray(body.values)) {
    return Response.json({ message: "Invalid row update." }, { status: 400 });
  }

  try {
    await updateSheetRow(access.sheet, body.rowNumber, body.values);
    return Response.json({ saved: true });
  } catch (error) {
    console.error("Unable to update Google Sheet:", error);
    return Response.json({ message: "Unable to save this row." }, { status: 502 });
  }
}

export async function POST(request: Request, context: RouteParams) {
  const access = await authorizedSheet(context);
  if (!access.ok) return errorResponse(access.error);

  const body = (await request.json().catch(() => null)) as { values?: unknown[] } | null;
  if (!Array.isArray(body?.values)) {
    return Response.json({ message: "Invalid new row." }, { status: 400 });
  }

  try {
    await appendSheetRow(access.sheet, body.values);
    return Response.json({ saved: true }, { status: 201 });
  } catch (error) {
    console.error("Unable to append to Google Sheet:", error);
    return Response.json({ message: "Unable to add this row." }, { status: 502 });
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  const access = await authorizedSheet(context);
  if (!access.ok) return errorResponse(access.error);
  if (access.sheet !== "employees") {
    return Response.json({ message: "Only employees can be deleted here." }, { status: 405 });
  }

  const body = (await request.json().catch(() => null)) as
    | { rowNumber?: number; employeeNumber?: string }
    | null;
  if (!body?.rowNumber || !body.employeeNumber) {
    return Response.json({ message: "Invalid employee deletion." }, { status: 400 });
  }

  try {
    return Response.json(
      await deleteEmployeeAndRelatedRecords(body.rowNumber, body.employeeNumber)
    );
  } catch (error) {
    console.error("Unable to delete employee:", error);
    return Response.json({ message: "Unable to delete this employee." }, { status: 502 });
  }
}
