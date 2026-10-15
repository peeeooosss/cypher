import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFound, serverError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { isUploadThingUrl } from "@/lib/uploadthing-url";

const gallerySchema = z.object({
  title: z.string().trim().max(120).nullable().optional(),
  caption: z.string().trim().max(2000).nullable().optional(),
  type: z.enum(["PHOTO", "VIDEO"]),
  url: z.string().trim().url().max(3000),
  fileKey: z.string().trim().min(1).max(255).nullable().optional(),
  thumbnailUrl: z.string().trim().url().max(3000).nullable().optional(),
  sourceLink: z.string().trim().url().max(3000).nullable().optional(),
  eventId: z.string().cuid().nullable().optional(),
  isFeaturedHomepage: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(1000).optional(),
  isPublished: z.boolean().optional(),
});

export async function GET() {
  await requireAdmin();

  const items = await prisma.galleryItem.findMany({
    include: { event: { select: { id: true, title: true, slug: true } } },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const admin = await requireAdmin();

  const parsed = gallerySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid gallery data");
  }

  if (parsed.data.fileKey && !isUploadThingUrl(parsed.data.url)) {
    return badRequest("Hosted gallery files must be uploaded through UploadThing");
  }
  if (parsed.data.type === "VIDEO" && !parsed.data.url) {
    return badRequest("Video items need a URL or source link");
  }

  if (parsed.data.eventId) {
    const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId }, select: { id: true } });
    if (!event) return notFound("Event");
  }

  try {
    const item = await prisma.galleryItem.create({
      data: {
        title: parsed.data.title ?? null,
        caption: parsed.data.caption ?? null,
        type: parsed.data.type,
        url: parsed.data.url,
        fileKey: parsed.data.fileKey ?? null,
        thumbnailUrl: parsed.data.thumbnailUrl ?? null,
        sourceLink: parsed.data.sourceLink ?? null,
        eventId: parsed.data.eventId ?? null,
        isFeaturedHomepage: parsed.data.isFeaturedHomepage ?? false,
        displayOrder: parsed.data.displayOrder ?? 0,
        isPublished: parsed.data.isPublished ?? true,
        createdById: admin.id,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
