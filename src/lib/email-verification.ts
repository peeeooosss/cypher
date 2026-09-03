import { createHash, randomInt } from "node:crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function zeroPad(value: number, length = 6) {
  return value.toString().padStart(length, "0");
}

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    throw new Error("Resend email configuration is incomplete");
  }

  return { resend: new Resend(apiKey), from };
}

export async function createEmailVerificationToken(userId: string) {
  const otp = zeroPad(randomInt(0, 1_000_000));

  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(otp),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      attempts: 0,
    },
  });

  return otp;
}

export async function sendEmailVerification(to: string, otp: string) {
  const { resend, from } = getEmailConfig();

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Your CYPHR verification code",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #171717;">
        <h1>Welcome to CYPHR</h1>
        <p>Confirm your email address to enter the circle. Enter this code to verify your account:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #171717;">${otp}</p>
        <p>This code expires in 15 minutes. If you did not create a CYPHR account, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
}

export { MAX_ATTEMPTS, TOKEN_TTL_MS, hashToken };

// --- Pre-signup email verification (keyed by email, no user row yet) ---
const PRE_VERIFY_TTL_MS = 15 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;

export async function isEmailRegistered(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return Boolean(user);
}

export async function requestEmailVerify(email: string) {
  const recent = await prisma.emailVerifyRequest.findUnique({
    where: { email },
    select: { createdAt: true },
  });

  if (recent && Date.now() - recent.createdAt.getTime() < REQUEST_COOLDOWN_MS) {
    return { cooldown: true, sent: false };
  }

  const otp = zeroPad(randomInt(0, 1_000_000));

  await prisma.emailVerifyRequest.upsert({
    where: { email },
    update: {
      tokenHash: hashToken(otp),
      verified: false,
      attempts: 0,
      expiresAt: new Date(Date.now() + PRE_VERIFY_TTL_MS),
      createdAt: new Date(),
    },
    create: {
      email,
      tokenHash: hashToken(otp),
      expiresAt: new Date(Date.now() + PRE_VERIFY_TTL_MS),
    },
  });

  await sendEmailVerification(email, otp);

  return { cooldown: false, sent: true };
}

export type ConfirmEmailVerifyResult =
  | { status: "ok" }
  | { status: "cooldown" }
  | { status: "expired" }
  | { status: "locked" }
  | { status: "invalid"; remaining: number };

export async function confirmEmailVerify(email: string, otp: string): Promise<ConfirmEmailVerifyResult> {
  const request = await prisma.emailVerifyRequest.findUnique({
    where: { email },
    select: { id: true, tokenHash: true, expiresAt: true, attempts: true },
  });

  if (!request || request.expiresAt <= new Date()) {
    if (request) {
      await prisma.emailVerifyRequest.delete({ where: { id: request.id } });
    }
    return { status: "expired" };
  }

  if (request.attempts >= MAX_ATTEMPTS) {
    return { status: "locked" };
  }

  if (hashToken(otp) !== request.tokenHash) {
    const remaining = MAX_ATTEMPTS - request.attempts - 1;
    await prisma.emailVerifyRequest.update({
      where: { id: request.id },
      data: { attempts: { increment: 1 } },
    });
    return { status: "invalid", remaining: Math.max(remaining, 0) };
  }

  await prisma.emailVerifyRequest.update({
    where: { id: request.id },
    data: { verified: true },
  });

  return { status: "ok" };
}

export async function consumeVerifiedEmail(email: string) {
  const request = await prisma.emailVerifyRequest.findUnique({ where: { email } });
  if (!request || !request.verified || request.expiresAt <= new Date()) return false;
  await prisma.emailVerifyRequest.delete({ where: { id: request.id } });
  return true;
}
