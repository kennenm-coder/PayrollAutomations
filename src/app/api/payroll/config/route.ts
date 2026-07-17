import { isPayrollAdmin } from "@/lib/admin-auth";
import { getPayrollConfiguration } from "@/lib/payroll-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isPayrollAdmin())) {
    return Response.json(
      { message: "Open Payroll Records and enter the accounting password first." },
      { status: 401 }
    );
  }

  const periodEnd = new URL(request.url).searchParams.get("periodEnd") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
    return Response.json({ message: "Enter a valid payroll period first." }, { status: 400 });
  }

  try {
    return Response.json(
      { employees: await getPayrollConfiguration(periodEnd) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Unable to load payroll configuration:", error);
    return Response.json({ message: "Unable to load Payroll Records." }, { status: 502 });
  }
}
