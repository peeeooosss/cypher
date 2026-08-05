import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { UserRole } from "@/generated/prisma/enums";
import { badRequest, conflict, isUniqueConstraintError, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  role: z.enum([UserRole.ORGANIZER, UserRole.ARTIST]),
});

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid signup data");
  }

  const { email, password, name, role } = parsed.data;

  try {
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash: await hash(password, 12),
        role,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("An account with this email already exists");
    }

    console.error(error);
    return serverError();
  }
}
