import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const createWorkSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable().optional(),
  platform: z.string().max(50).nullable().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const works = await prisma.artistWork.findMany({
      where: { userId: user.id },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(works);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = createWorkSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    const maxOrder = await prisma.artistWork.findFirst({
      where: { userId: user.id },
      select: { order: true },
      orderBy: { order: "desc" },
    });

    const work = await prisma.artistWork.create({
      data: {
        userId: user.id,
        ...parsed.data,
        order: (maxOrder?.order ?? -1) + 1,
      },
    });

    return NextResponse.json(work, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}