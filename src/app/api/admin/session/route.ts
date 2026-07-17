import {
  clearAdminSession,
  establishAdminSession,
  isAdminConfigured,
  isPayrollAdmin,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    configured: isAdminConfigured(),
    authenticated: await isPayrollAdmin(),
  });
}

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return Response.json(
      { message: "Admin editing is not configured yet." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password ?? "";

  if (!verifyAdminPassword(password)) {
    return Response.json({ message: "Incorrect password." }, { status: 401 });
  }

  await establishAdminSession();
  return Response.json({ authenticated: true });
}

export async function DELETE() {
  await clearAdminSession();
  return Response.json({ authenticated: false });
}

