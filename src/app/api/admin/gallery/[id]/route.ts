import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFound, serverError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { deleteUploadThingFile } from "@/lib/uploadthing-server";
import { isUploadThingUrl } from "@/lib/uploadthing-url";

const updateGallerySchema = z.object({
  title: z.string().trim().max(120).nullable().optional(),
  caption: z.string().trim().max(2000).nullable().optional(),
  type: z.enum(["PHOTO", "VIDEO"]).optional(),
  url: z.string().trim().url().max(3000).optional(),
  fileKey: z.string().trim().min(1).max(255).nullable().optional(),
  thumbnailUrl: z.string().trim().url().max(3000).nullable().optional(),
  sourceLink: z.string().trim().url().max(3000).nullable().optional(),
  eventId: z.string().cuid().nullable().optional(),
  isFeaturedHomepage: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(1000).optional(),
  isPublished: z.boolean().optional(),
});

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  await requireAdmin();
  const { id } = await params;

  const parsed = updateGallerySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid gallery data");
  }

  const existing = await prisma.galleryItem.findUnique({ where: { id }, select: { id: true, fileKey: true } });
  if (!existing) return notFound("Gallery item");

  if (parsed.data.eventId) {
    const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId }, select: { id: true } });
    if (!event) return notFound("Event");
  }

  const nextFileKey = parsed.data.fileKey;
  const nextUrl = parsed.data.url;
  if (nextFileKey !== undefined && nextFileKey && nextUrl !== undefined && !isUploadThingUrl(nextUrl)) {
    return badRequest("Hosted gallery files must be uploaded through UploadThing");
  }

  try {
    const item = await prisma.galleryItem.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.caption !== undefined ? { caption: parsed.data.caption } : {}),
        ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
        ...(nextUrl !== undefined ? { url: nextUrl } : {}),
        ...(nextFileKey !== undefined ? { fileKey: nextFileKey } : {}),
        ...(parsed.data.thumbnailUrl !== undefined ? { thumbnailUrl: parsed.data.thumbnailUrl } : {}),
        ...(parsed.data.sourceLink !== undefined ? { sourceLink: parsed.data.sourceLink } : {}),
        ...(parsed.data.eventId !== undefined ? { eventId: parsed.data.eventId } : {}),
        ...(parsed.data.isFeaturedHomepage !== undefined ? { isFeaturedHomepage: parsed.data.isFeaturedHomepage } : {}),
        ...(parsed.data.displayOrder !== undefined ? { displayOrder: parsed.data.displayOrder } : {}),
        ...(parsed.data.isPublished !== undefined ? { isPublished: parsed.data.isPublished } : {}),
      },
    });

    if (existing.fileKey && nextFileKey !== undefined && nextFileKey !== existing.fileKey) {
      await deleteUploadThingFile(existing.fileKey);
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function DELETE(_: Request, { params }: Context) {
  await requireAdmin();
  const { id } = await params;

  const existing = await prisma.galleryItem.findUnique({ where: { id }, select: { id: true, fileKey: true } });
  if (!existing) return notFound("Gallery item");

  try {
    await prisma.galleryItem.delete({ where: { id } });
    await deleteUploadThingFile(existing.fileKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
