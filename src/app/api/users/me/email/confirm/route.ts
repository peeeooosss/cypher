import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { MAX_ATTEMPTS, hashToken } from "@/lib/email-verification";

const requestSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid verification data");
  }

  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { email, id: { not: user.id } },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: "That email is already in use by another account." }, { status: 409 });
  }

  const verification = await prisma.emailVerificationToken.findFirst({
    where: { userId: user.id },
    select: { id: true, tokenHash: true, expiresAt: true, attempts: true },
  });

  if (!verification || verification.expiresAt <= new Date()) {
    if (verification) {
      await prisma.emailVerificationToken.delete({ where: { id: verification.id } });
    }
    return NextResponse.json(
      { error: "That code has expired. Request a new one." },
      { status: 400 },
    );
  }

  if (verification.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many incorrect attempts. Request a new code." },
      { status: 400 },
    );
  }

  if (hashToken(parsed.data.otp) !== verification.tokenHash) {
    const remaining = MAX_ATTEMPTS - verification.attempts - 1;
    await prisma.emailVerificationToken.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json(
      {
        error:
          remaining > 0
            ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
            : "Too many incorrect attempts. Request a new code.",
      },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { email, emailVerifiedAt: new Date() },
      }),
      prisma.emailVerificationToken.delete({ where: { id: verification.id } }),
    ]);

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}