import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, serverError, unauthorized, conflict } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createEmailVerificationToken, sendEmailVerification } from "@/lib/email-verification";

const requestSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Enter a valid email address");
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
    return conflict("That email is already in use by another account");
  }

  try {
    const otp = await createEmailVerificationToken(user.id);
    await sendEmailVerification(email, otp);
    return NextResponse.json({ message: "A 6-digit code has been sent to that email." });
  } catch (error) {
    console.error("Failed to send email verification", error);
    return serverError();
  }
}