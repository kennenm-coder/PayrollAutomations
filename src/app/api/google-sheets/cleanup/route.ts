import { isPayrollAdmin } from "@/lib/admin-auth";
import { deleteOrphanedAndDemoRecords } from "@/lib/google-sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  if (!(await isPayrollAdmin())) {
    return Response.json({ message: "Admin sign-in required." }, { status: 401 });
  }

  try {
    return Response.json(await deleteOrphanedAndDemoRecords());
  } catch (error) {
    console.error("Unable to clean Google Sheet rows:", error);
    return Response.json({ message: "Unable to clean old rows." }, { status: 502 });
  }
}
