import { testEmployeeSheetConnection } from "@/lib/google-sheets";
import { isPayrollAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Admin-only, like every sibling route. Left open this reported the live
  // employee headcount to anonymous callers, and each call did a full read of
  // the Employees tab through the service account — so it also let anyone burn
  // our Google API quota on demand.
  if (!(await isPayrollAdmin())) {
    return Response.json({ message: "Not authorised." }, { status: 401 });
  }

  try {
    const connection = await testEmployeeSheetConnection();

    return Response.json(
      { connected: true, ...connection },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Google Sheets connection failed:", error);

    return Response.json(
      {
        connected: false,
        message: "Unable to read the Employees tab. Check the Sheet sharing and Vercel credentials.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
