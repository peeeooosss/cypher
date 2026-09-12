import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { UserRole } from "@/generated/prisma/enums";
import { badRequest, conflict, isUniqueConstraintError, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { consumeVerifiedEmail } from "@/lib/email-verification";

const signupSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, "Username must use 3–30 letters, numbers, or underscores").optional(),
    role: z.enum([UserRole.ORGANIZER, UserRole.ARTIST]),
  });

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid signup data");
  }

  const { email, password, name, role, username } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  try {
    const verified = await consumeVerifiedEmail(normalizedEmail);
    if (!verified) {
      return NextResponse.json(
        { error: "Please verify your email before creating the account." },
        { status: 400 },
      );
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        username: username ?? null,
        passwordHash: await hash(password, 12),
        role,
        emailVerifiedAt: new Date(),
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({ ...user }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("That email or username is already in use");
    }

    console.error(error);
    return serverError();
  }
}
