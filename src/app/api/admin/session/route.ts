import {
  clearAdminSession,
  establishAdminSession,
  isAdminConfigured,
  isPayrollAdmin,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { clientKey, recordLoginAttempt, clearLoginAttempts } from "@/lib/login-throttle";

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

  // One shared password guards every payroll figure in the app, so the guess
  // rate has to be capped. Counted before the password is checked, so a
  // flood of wrong guesses can't be laundered through early returns.
  const key = clientKey(request);
  const throttle = recordLoginAttempt(key);
  if (!throttle.allowed) {
    return Response.json(
      { message: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } }
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password ?? "";

  if (!verifyAdminPassword(password)) {
    return Response.json({ message: "Incorrect password." }, { status: 401 });
  }

  clearLoginAttempts(key);
  await establishAdminSession();
  return Response.json({ authenticated: true });
}

export async function DELETE() {
  await clearAdminSession();
  return Response.json({ authenticated: false });
}

