import { NextResponse } from "next/server";
import { z } from "zod";
import { createEmailVerificationToken, sendEmailVerification } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({ email: z.string().trim().email() });
const genericResponse = { message: "If that account needs verification, a new email is on its way." };

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(genericResponse);

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, emailVerifiedAt: true },
  });

  if (!user || user.emailVerifiedAt) return NextResponse.json(genericResponse);

  const recentToken = await prisma.emailVerificationToken.findFirst({
    where: {
      userId: user.id,
      createdAt: { gt: new Date(Date.now() - 60 * 1000) },
    },
    select: { id: true },
  });

  if (recentToken) return NextResponse.json(genericResponse);

  try {
    const otp = await createEmailVerificationToken(user.id);
    await sendEmailVerification(user.email, otp);
  } catch (error) {
    console.error("Failed to resend verification email", error);
  }

  return NextResponse.json(genericResponse);
}
