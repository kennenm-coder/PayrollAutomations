import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "rba_payroll_admin";
const SESSION_MESSAGE = "rba-payroll-admin-session-v1";

function configuredPassword() {
  return process.env.PAYROLL_ADMIN_PASSWORD ?? "";
}

function sessionToken(password: string) {
  return createHmac("sha256", password).update(SESSION_MESSAGE).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function isAdminConfigured() {
  return configuredPassword().length >= 10;
}

export function verifyAdminPassword(password: string) {
  const expected = configuredPassword();
  return expected.length >= 10 && safeEqual(password, expected);
}

export async function isPayrollAdmin() {
  const password = configuredPassword();
  if (password.length < 10) return false;

  const cookie = (await cookies()).get(COOKIE_NAME)?.value ?? "";
  return safeEqual(cookie, sessionToken(password));
}

export async function establishAdminSession() {
  const password = configuredPassword();
  if (password.length < 10) throw new Error("Admin editing is not configured.");

  (await cookies()).set(COOKIE_NAME, sessionToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8,
    priority: "high",
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(COOKIE_NAME);
}

