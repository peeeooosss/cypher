import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { forbidden, notFound, serverError, unauthorized, badRequest, conflict } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { getAdminOrganizer } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { z } from "zod";

type Context = { params: Promise<{ userId: string }> };

const bodySchema = z.object({
  isSuspended: z.boolean().optional(),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export async function GET(_: Request, { params }: Context) {
  const { userId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ADMIN") {
    return forbidden();
  }

  try {
    const organizer = await getAdminOrganizer(userId);

    if (!organizer) {
      return notFound("Organizer");
    }

    return NextResponse.json(organizer);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function PATCH(req: Request, { params }: Context) {
  const { userId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ADMIN") {
    return forbidden();
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const target = await prisma.user.findFirst({
      where: { id: userId, role: "ORGANIZER" },
      select: { id: true },
    });

    if (!target) {
      return notFound("Organizer");
    }

    if (target.id === user.id) {
      return NextResponse.json({ error: "Cannot suspend your own admin account" }, { status: 400 });
    }

    const data: { isSuspended?: boolean; phone?: string; whatsappNumber?: string; passwordHash?: string; plainPassword?: string } = {};

    if (body.isSuspended !== undefined) {
      data.isSuspended = body.isSuspended;
    }

    if (body.phone !== undefined) {
      const normalizedPhone = normalizePhone(body.phone);
      if (!normalizedPhone) {
        return badRequest("Enter a valid 10-digit mobile number.");
      }
      const sameRole = await prisma.user.count({
        where: { phone: normalizedPhone, role: "ORGANIZER", NOT: { id: userId } },
      });
      if (sameRole > 0) {
        return conflict("That phone number is already used by another Organizer");
      }
      data.phone = normalizedPhone;
      data.whatsappNumber = normalizedPhone;
    }

    if (body.password !== undefined) {
      data.passwordHash = await hash(body.password, 12);
      data.plainPassword = body.password;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, phone: true, isSuspended: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function DELETE(_: Request, { params }: Context) {
  const { userId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ADMIN") {
    return forbidden();
  }

  try {
    const target = await prisma.user.findFirst({
      where: { id: userId, role: "ORGANIZER" },
      select: { id: true },
    });

    if (!target) {
      return notFound("Organizer");
    }

    if (target.id === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.event.deleteMany({ where: { organizerId: userId } }),
      prisma.judgeSlot.updateMany({
        where: { judgeUserId: userId },
        data: { judgeUserId: null },
      }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
