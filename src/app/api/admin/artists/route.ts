import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { badRequest, conflict, serverError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => null);

    const phoneRaw = typeof body?.phone === "string" ? body.phone : "";
    const phone = phoneRaw.replace(/\D/g, "");
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username) return badRequest("Username is required.");
    if (phone.length !== 10) return badRequest("Enter a valid 10-digit mobile number.");
    if (!password || password.length < 8) return badRequest("Password must be at least 8 characters.");

    const existingByPhone = await prisma.user.findFirst({
      where: { OR: [{ phone }, { phone: `+91${phone}` }, { phone: { endsWith: phone } }] },
      select: { id: true },
    });
    if (existingByPhone) return conflict("A user with this phone number already exists.");

    const existingByUsername = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (existingByUsername) return conflict("A user with this username already exists.");

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        phone,
        passwordHash,
        plainPassword: password,
        role: "ARTIST",
      },
      select: {
        id: true,
        username: true,
        phone: true,
        role: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("admin add artist error", error);
    return serverError();
  }
}
