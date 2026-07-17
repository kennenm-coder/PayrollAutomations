import { testEmployeeSheetConnection } from "@/lib/google-sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
