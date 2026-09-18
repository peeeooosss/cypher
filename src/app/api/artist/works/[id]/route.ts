import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const updateWorkSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  videoUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  platform: z.string().max(50).nullable().optional(),
  order: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const work = await prisma.artistWork.findFirst({
      where: { id, userId: user.id },
    });

    if (!work) return notFound();
    return NextResponse.json(work);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const parsed = updateWorkSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    const work = await prisma.artistWork.findFirst({
      where: { id, userId: user.id },
    });
    if (!work) return notFound();

    const updated = await prisma.artistWork.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const work = await prisma.artistWork.findFirst({
      where: { id, userId: user.id },
    });
    if (!work) return notFound();

    await prisma.artistWork.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}