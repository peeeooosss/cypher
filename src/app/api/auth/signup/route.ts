import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { UserRole } from "@/generated/prisma/enums";
import { badRequest, conflict, isUniqueConstraintError, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

const signupSchema = z.object({
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{10,13}$/, "Enter a valid mobile number (10 digits)"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, "Username must use 3–30 letters, numbers, or underscores"),
    role: z.enum([UserRole.ORGANIZER, UserRole.ARTIST]),
  });

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid signup data");
  }

  const { phone, password, role, username } = parsed.data;
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return badRequest("Enter a valid Indian mobile number");
  }

  try {
    const user = await prisma.user.create({
      data: {
        phone: normalizedPhone,
        whatsappNumber: normalizedPhone,
        name: username,
        username,
        passwordHash: await hash(password, 12),
        role,
      },
      select: { id: true, phone: true, name: true, role: true },
    });

    return NextResponse.json({ ...user }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("That phone number or username is already in use");
    }

    console.error(error);
    return serverError();
  }
}