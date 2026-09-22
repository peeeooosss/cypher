import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { badRequest } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

const checkSchema = z.object({
  identifier: z.string().trim().min(10),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = checkSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest("Enter a valid phone number and password");
  }

  const { identifier, password } = parsed.data;

  const phone = normalizePhone(identifier);
  let candidates = phone
    ? await prisma.user.findMany({
        where: { phone },
        select: { id: true, email: true, phone: true, name: true, role: true, avatarUrl: true, passwordHash: true },
      })
    : [];

  if (candidates.length === 0 && identifier.includes("@")) {
    const emailUser = await prisma.user.findUnique({
      where: { email: identifier.toLowerCase() },
      select: { id: true, email: true, phone: true, name: true, role: true, avatarUrl: true, passwordHash: true },
    });
    if (emailUser) candidates = [emailUser];
  }

  const matches = [];
  for (const candidate of candidates) {
    if (candidate.passwordHash && (await compare(password, candidate.passwordHash))) {
      matches.push({
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        role: candidate.role,
        avatarUrl: candidate.avatarUrl,
      });
    }
  }

  return NextResponse.json({ matches });
}