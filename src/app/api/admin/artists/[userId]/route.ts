import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { getAdminArtist } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { GIG_WORK_DURATION_MS } from "@/lib/pricing";

type Context = { params: Promise<{ userId: string }> };

const bodySchema = z.object({
  isSuspended: z.boolean().optional(),
  gigWorkEnabled: z.boolean().optional(),
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

    const data: { isSuspended?: boolean; gigWorkEnabledAt?: Date | null; gigWorkExpiresAt?: Date | null } = {};

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

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
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
