import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { badRequest, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

const newPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[0-9]/, "Password must include at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character");

const invalidCredentials = () =>
  NextResponse.json({ error: "Phone number or current password is incorrect." }, { status: 401 });

const changeSchema = z.object({
  identifier: z.string().trim().min(1),
  currentPassword: z.string().min(1),
  newPassword: newPasswordSchema,
  profileId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = changeSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const { identifier, currentPassword, newPassword, profileId } = parsed.data;

    const phone = normalizePhone(identifier);
    let candidates = phone
      ? await prisma.user.findMany({
          where: { phone },
          select: { id: true, name: true, role: true, passwordHash: true },
        })
      : [];

    if (candidates.length === 0 && identifier.includes("@")) {
      const emailUser = await prisma.user.findUnique({
        where: { email: identifier.toLowerCase() },
        select: { id: true, name: true, role: true, passwordHash: true },
      });
      if (emailUser) candidates = [emailUser];
    }

    if (candidates.length === 0) {
      return invalidCredentials();
    }

    const matches: typeof candidates = [];
    for (const candidate of candidates) {
      if (candidate.passwordHash && (await compare(currentPassword, candidate.passwordHash))) {
        matches.push(candidate);
      }
    }

    if (matches.length === 0) {
      return invalidCredentials();
    }

    let target = matches[0];
    if (profileId) {
      const chosen = matches.find((match) => match.id === profileId);
      if (!chosen) {
        return invalidCredentials();
      }
      target = chosen;
    } else if (matches.length > 1) {
      return NextResponse.json({
        matches: matches.map((match) => ({
          id: match.id,
          name: match.name,
          role: match.role,
        })),
      });
    }

    await prisma.user.update({
      where: { id: target.id },
      data: {
        passwordHash: await hash(newPassword, 12),
        plainPassword: newPassword,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
