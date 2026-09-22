import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { forbidden, notFound, serverError, unauthorized, badRequest, conflict } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { getAdminArtist } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { z } from "zod";
import { GIG_WORK_DURATION_MS } from "@/lib/money";

type Context = { params: Promise<{ userId: string }> };

const bodySchema = z.object({
  isSuspended: z.boolean().optional(),
  gigWorkEnabled: z.boolean().optional(),
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
    const artist = await getAdminArtist(userId);

    if (!artist) {
      return notFound("Artist");
    }

    return NextResponse.json(artist);
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
      where: { id: userId, role: "ARTIST" },
      select: { id: true },
    });

    if (!target) {
      return notFound("Artist");
    }

    const data: { isSuspended?: boolean; gigWorkEnabledAt?: Date | null; gigWorkExpiresAt?: Date | null; phone?: string; whatsappNumber?: string; passwordHash?: string; plainPassword?: string } = {};

    if (body.isSuspended !== undefined) {
      data.isSuspended = body.isSuspended;
    }

    if (body.gigWorkEnabled !== undefined) {
      if (body.gigWorkEnabled) {
        const now = new Date();
        data.gigWorkEnabledAt = now;
        data.gigWorkExpiresAt = new Date(now.getTime() + GIG_WORK_DURATION_MS);
      } else {
        data.gigWorkEnabledAt = null;
        data.gigWorkExpiresAt = null;
      }
    }

    if (body.phone !== undefined) {
      const normalizedPhone = normalizePhone(body.phone);
      if (!normalizedPhone) {
        return badRequest("Enter a valid 10-digit mobile number.");
      }
      const sameRole = await prisma.user.count({
        where: { phone: normalizedPhone, role: "ARTIST", NOT: { id: userId } },
      });
      if (sameRole > 0) {
        return conflict("That phone number is already used by another Artist");
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
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isSuspended: true,
        gigWorkEnabledAt: true,
        gigWorkExpiresAt: true,
      },
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
      where: { id: userId, role: "ARTIST" },
      select: { id: true },
    });

    if (!target) {
      return notFound("Artist");
    }

    if (target.id === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    await prisma.$transaction([
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
