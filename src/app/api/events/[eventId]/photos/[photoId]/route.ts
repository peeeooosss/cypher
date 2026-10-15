import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { deleteUploadThingFile } from "@/lib/uploadthing-server";
import { isUploadThingUrl } from "@/lib/uploadthing-url";

const updatePhotoSchema = z.object({
  photoUrl: z.string().trim().max(3000).optional(),
  photoFileKey: z.string().trim().min(1).max(255).nullable().optional(),
  caption: z.string().trim().max(300).nullable().optional(),
  displayOrder: z.number().int().min(0).max(1000).optional(),
  isPublic: z.boolean().optional(),
});

type Context = { params: Promise<{ eventId: string; photoId: string }> };

async function requireOwner(eventId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: unauthorized() };
  if (user.role !== "ORGANIZER") return { error: forbidden() };
  if (!(await getEventForOwner(eventId, user.id))) return { error: notFound("Event") };
  return { user };
}

export async function PATCH(request: Request, { params }: Context) {
  const { eventId, photoId } = await params;
  const owner = await requireOwner(eventId);
  if (owner.error) return owner.error;

  const parsed = updatePhotoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid photo data");
  }

  const existing = await prisma.eventPhoto.findFirst({
    where: { id: photoId, eventId },
    select: { id: true, photoFileKey: true },
  });
  if (!existing) return notFound("Photo");

  const nextUrl = parsed.data.photoUrl;
  const nextFileKey = parsed.data.photoFileKey;
  if (nextUrl !== undefined && nextUrl && !isUploadThingUrl(nextUrl)) {
    return badRequest("Photo must be uploaded through UploadThing");
  }

  try {
    const photo = await prisma.eventPhoto.update({
      where: { id: photoId },
      data: {
        ...(nextUrl !== undefined ? { photoUrl: nextUrl } : {}),
        ...(nextFileKey !== undefined ? { photoFileKey: nextFileKey } : {}),
        ...(parsed.data.caption !== undefined ? { caption: parsed.data.caption ?? null } : {}),
        ...(parsed.data.displayOrder !== undefined ? { displayOrder: parsed.data.displayOrder } : {}),
        ...(parsed.data.isPublic !== undefined ? { isPublic: parsed.data.isPublic } : {}),
      },
    });

    if (existing.photoFileKey && nextFileKey !== undefined && nextFileKey !== existing.photoFileKey) {
      await deleteUploadThingFile(existing.photoFileKey);
    }

    return NextResponse.json(photo);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function DELETE(_: Request, { params }: Context) {
  const { eventId, photoId } = await params;
  const owner = await requireOwner(eventId);
  if (owner.error) return owner.error;

  const existing = await prisma.eventPhoto.findFirst({
    where: { id: photoId, eventId },
    select: { id: true, photoFileKey: true },
  });
  if (!existing) return notFound("Photo");

  try {
    await prisma.eventPhoto.delete({ where: { id: photoId } });
    if (existing.photoFileKey) await deleteUploadThingFile(existing.photoFileKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
