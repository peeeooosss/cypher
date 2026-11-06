import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { badRequest, serverError, unauthorized } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();

    const body = await req.json().catch(() => null);
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword) return badRequest("Current password is required.");
    if (!newPassword) return badRequest("New password is required.");
    if (newPassword.length < 8) return badRequest("New password must be at least 8 characters.");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return badRequest("Password is not set for this account.");
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return badRequest("Current password is incorrect.");

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash, plainPassword: newPassword },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("change password error", error);
    return serverError();
  }
}
