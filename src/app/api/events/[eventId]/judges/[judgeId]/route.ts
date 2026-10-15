import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { deleteUploadThingFile } from "@/lib/uploadthing-server";
import { isUploadThingUrl } from "@/lib/uploadthing-url";

const updateJudgeSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  title: z.string().trim().max(60).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  photoUrl: z.string().trim().max(3000).nullable().optional(),
  photoFileKey: z.string().trim().min(1).max(255).nullable().optional(),
  socialLinks: z
    .record(z.string().trim().min(1).max(40), z.string().trim().url().max(500))
    .refine((links) => Object.keys(links).length <= 6, { message: "Too many social links" })
    .nullable()
    .optional(),
  displayOrder: z.number().int().min(0).max(1000).optional(),
  isPublic: z.boolean().optional(),
});

type Context = { params: Promise<{ eventId: string; judgeId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { eventId, judgeId } = await params;
  const user = await getCurrentUser();

  if (!user) return unauthorized();
  if (user.role !== "ORGANIZER") return forbidden();
  if (!(await getEventForOwner(eventId, user.id))) return notFound("Event");

  const parsed = updateJudgeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid judge data");
  }

  const existing = await prisma.eventJudge.findFirst({
    where: { id: judgeId, eventId },
    select: { id: true, photoFileKey: true },
  });
  if (!existing) return notFound("Judge");

  const nextFileKey = parsed.data.photoFileKey;
  if (nextFileKey !== undefined && nextFileKey && (!parsed.data.photoUrl || !isUploadThingUrl(parsed.data.photoUrl))) {
    return badRequest("Judge photo must be uploaded through UploadThing");
  }

  try {
    const judge = await prisma.eventJudge.update({
      where: { id: judgeId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio } : {}),
        ...(parsed.data.photoUrl !== undefined ? { photoUrl: parsed.data.photoUrl } : {}),
        ...(nextFileKey !== undefined ? { photoFileKey: nextFileKey } : {}),
        ...(parsed.data.socialLinks !== undefined ? { socialLinks: parsed.data.socialLinks ?? undefined } : {}),
        ...(parsed.data.displayOrder !== undefined ? { displayOrder: parsed.data.displayOrder } : {}),
        ...(parsed.data.isPublic !== undefined ? { isPublic: parsed.data.isPublic } : {}),
      },
    });

    if (existing.photoFileKey && nextFileKey !== undefined && nextFileKey !== existing.photoFileKey) {
      await deleteUploadThingFile(existing.photoFileKey);
    }

    return NextResponse.json(judge);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function DELETE(_: Request, { params }: Context) {
  const { eventId, judgeId } = await params;
  const user = await getCurrentUser();

  if (!user) return unauthorized();
  if (user.role !== "ORGANIZER") return forbidden();
  if (!(await getEventForOwner(eventId, user.id))) return notFound("Event");

  const existing = await prisma.eventJudge.findFirst({
    where: { id: judgeId, eventId },
    select: { id: true, photoFileKey: true },
  });
  if (!existing) return notFound("Judge");

  try {
    await prisma.eventJudge.delete({ where: { id: judgeId } });
    await deleteUploadThingFile(existing.photoFileKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
