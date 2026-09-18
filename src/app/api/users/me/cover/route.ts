import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const uploadCoverSchema = z.object({
  coverUrl: z.string().url(),
  coverFileKey: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = uploadCoverSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        coverUrl: parsed.data.coverUrl,
        coverFileKey: parsed.data.coverFileKey,
      },
      select: {
        id: true,
        coverUrl: true,
        coverFileKey: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        coverUrl: null,
        coverFileKey: null,
      },
      select: {
        id: true,
        coverUrl: true,
        coverFileKey: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}