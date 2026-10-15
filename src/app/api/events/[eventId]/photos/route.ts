import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isUploadThingUrl } from "@/lib/uploadthing-url";

export const MAX_EVENT_PHOTOS = 6;

const createPhotoSchema = z.object({
  photoUrl: z.string().trim().max(3000),
  photoFileKey: z.string().trim().min(1).max(255),
  caption: z.string().trim().max(300).nullable().optional(),
  displayOrder: z.number().int().min(0).max(1000).optional(),
});

type Context = { params: Promise<{ eventId: string }> };

async function requireOwner(eventId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: unauthorized() };
  if (user.role !== "ORGANIZER") return { error: forbidden() };
  if (!(await getEventForOwner(eventId, user.id))) return { error: notFound("Event") };
  return { user };
}

export async function GET(_: Request, { params }: Context) {
  const { eventId } = await params;
  const owner = await requireOwner(eventId);
  if (owner.error) return owner.error;

  const photos = await prisma.eventPhoto.findMany({
    where: { eventId },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(photos);
}

export async function POST(request: Request, { params }: Context) {
  const { eventId } = await params;
  const owner = await requireOwner(eventId);
  if (owner.error) return owner.error;

  const parsed = createPhotoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid photo data");
  }

  if (!isUploadThingUrl(parsed.data.photoUrl)) {
    return badRequest("Photo must be uploaded through UploadThing");
  }

  try {
    const count = await prisma.eventPhoto.count({ where: { eventId } });
    if (count >= MAX_EVENT_PHOTOS) {
      return badRequest(`This event already has ${MAX_EVENT_PHOTOS} photos. Remove one to add another.`);
    }

    const photo = await prisma.eventPhoto.create({
      data: {
        eventId,
        photoUrl: parsed.data.photoUrl,
        photoFileKey: parsed.data.photoFileKey,
        caption: parsed.data.caption ?? null,
        displayOrder: parsed.data.displayOrder ?? count,
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
