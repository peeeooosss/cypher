import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  featured: z.enum(["1", "true"]).optional(),
  type: z.enum(["PHOTO", "VIDEO"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const parsed = querySchema.safeParse({
      featured: searchParams.get("featured") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return badRequest("Invalid gallery filters");

    const take = parsed.data.limit ?? 60;
    const includeEventPhotos = !parsed.data.featured && parsed.data.type !== "VIDEO";

    const [galleryItems, eventPhotos] = await Promise.all([
      prisma.galleryItem.findMany({
        where: {
          isPublished: true,
          ...(parsed.data.featured ? { isFeaturedHomepage: true } : {}),
          ...(parsed.data.type ? { type: parsed.data.type } : {}),
        },
        include: {
          event: { select: { id: true, title: true, slug: true } },
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        take,
      }),
      includeEventPhotos
        ? prisma.eventPhoto.findMany({
            where: { isPublic: true },
            include: {
              event: { select: { id: true, title: true, slug: true } },
            },
            orderBy: { createdAt: "desc" },
            take,
          })
        : Promise.resolve([]),
    ]);

    const merged = [
      ...galleryItems,
      ...eventPhotos.map((photo) => ({
        id: photo.id,
        title: photo.caption,
        caption: photo.caption,
        type: "PHOTO" as const,
        url: photo.photoUrl,
        fileKey: photo.photoFileKey,
        thumbnailUrl: null,
        sourceLink: null,
        eventId: photo.eventId,
        isFeaturedHomepage: false,
        displayOrder: photo.displayOrder,
        isPublished: photo.isPublic,
        createdById: null,
        event: photo.event,
        createdAt: photo.createdAt,
        updatedAt: photo.updatedAt,
      })),
    ].slice(0, take);

    return NextResponse.json(merged);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
