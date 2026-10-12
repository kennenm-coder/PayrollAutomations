import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "rba_payroll_admin";
const SESSION_VERSION = "v2";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function configuredPassword() {
  return process.env.PAYROLL_ADMIN_PASSWORD ?? "";
}

/**
 * Key used to sign session cookies.
 *
 * Prefer a dedicated PAYROLL_SESSION_SECRET so that rotating the shared
 * password doesn't have to mean signing everyone out, and so the password is
 * not itself the signing key. Falls back to a key DERIVED from the password so
 * this keeps working with no new configuration.
 */
function signingKey() {
  const explicit = process.env.PAYROLL_SESSION_SECRET ?? "";
  if (explicit.length >= 16) return createHash("sha256").update(explicit).digest();
  return createHash("sha256").update(`${SESSION_VERSION}:${configuredPassword()}`).digest();
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

/**
 * Mint a session cookie value: `v2.<expiresAtSeconds>.<nonce>.<signature>`.
 *
 * The previous scheme was HMAC(password, <constant string>), which made the
 * cookie a pure function of the password: byte-for-byte identical for every
 * admin on every device, forever. A copied cookie value stayed valid until the
 * password itself was rotated (the 8h maxAge was advisory — the browser's, not
 * the server's), and signing out revoked nothing.
 *
 * This version carries its own expiry, which the server enforces on every
 * check, plus a random nonce so two sessions are never the same string.
 */
function mintToken(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${SESSION_VERSION}.${expiresAt}.${nonce}`;
  const signature = createHmac("sha256", signingKey()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function tokenIsValid(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 4) return false;

  const [version, expiresAtRaw, nonce, signature] = parts;
  if (version !== SESSION_VERSION) return false;
  if (!/^\d+$/.test(expiresAtRaw) || !/^[0-9a-f]{32}$/.test(nonce)) return false;

  const payload = `${version}.${expiresAtRaw}.${nonce}`;
  const expected = createHmac("sha256", signingKey()).update(payload).digest("hex");
  if (!safeEqual(signature, expected)) return false;

  // Server-side expiry: a copied cookie stops working on its own.
  return Number(expiresAtRaw) * 1000 > Date.now();
}

export function isAdminConfigured() {
  return configuredPassword().length >= 10;
}

export function verifyAdminPassword(password: string) {
  const expected = configuredPassword();
  return expected.length >= 10 && safeEqual(password, expected);
}

export async function isPayrollAdmin() {
  if (configuredPassword().length < 10) return false;
  const cookie = (await cookies()).get(COOKIE_NAME)?.value ?? "";
  if (!cookie) return false;
  return tokenIsValid(cookie);
}

export async function establishAdminSession() {
  if (configuredPassword().length < 10) throw new Error("Admin editing is not configured.");

  (await cookies()).set(COOKIE_NAME, mintToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    priority: "high",
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(COOKIE_NAME);
}
