import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { MAX_ATTEMPTS, hashToken } from "@/lib/email-verification";
import { badRequest } from "@/lib/api";

const requestSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid verification data");
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerifiedAt: true },
  });

  if (!user || user.emailVerifiedAt) {
    return NextResponse.json({ error: "This account is already verified or does not exist." }, { status: 400 });
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

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.delete({ where: { id: verification.id } }),
  ]);

  return NextResponse.json({ verified: true });
}
