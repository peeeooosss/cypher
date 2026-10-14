import { createHash, createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const MC_SESSION_COOKIE = "cyphr_mc";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export type StaffRole = "MC" | "HOST";

export function generateStaffCode(): string {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

export function hashStaffCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

function sessionSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET must be configured");
  return secret;
}

function signSessionValue(codeId: string, exp: number): string {
  return createHmac("sha256", sessionSecret()).update(`${codeId}.${exp}`).digest("hex");
}

export async function createStaffSession(codeId: string): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS;
  const sig = signSessionValue(codeId, exp);
  const value = Buffer.from(`${codeId}.${exp}.${sig}`).toString("base64url");
  const store = await cookies();
  store.set(MC_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return value;
}

export async function clearStaffSession(): Promise<void> {
  const store = await cookies();
  store.delete(MC_SESSION_COOKIE);
}

export type StaffSession = {
  codeId: string;
  eventId: string;
  label: string;
  role: StaffRole;
};

export async function getStaffSession(): Promise<StaffSession | null> {
  let raw: string | undefined;
  try {
    const store = await cookies();
    raw = store.get(MC_SESSION_COOKIE)?.value;
  } catch {
    return null;
  }
  if (!raw) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(raw, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const [codeId, expStr, sig] = decoded.split(".");
  const exp = Number(expStr);
  if (!codeId || !Number.isFinite(exp) || !sig) return null;
  if (Date.now() > exp) return null;

  let expected: string;
  try {
    expected = signSessionValue(codeId, exp);
  } catch {
    return null;
  }
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;

  const code = await prisma.eventStaffCode.findUnique({
    where: { id: codeId },
    select: { id: true, eventId: true, label: true, role: true, isActive: true },
  });
  if (!code || !code.isActive) return null;

  return {
    codeId: code.id,
    eventId: code.eventId,
    label: code.label,
    role: (code.role === "HOST" ? "HOST" : "MC") as StaffRole,
  };
}
