import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrganizerEventAccess } from "@/lib/organizer-access";
import { badRequest, serverError } from "@/lib/api";

type Context = { params: Promise<{ eventId: string }> };

const schema = z.object({
  organizerPhotoUrl: z.string().nullable().optional(),
  organizerPhotoFileKey: z.string().nullable().optional(),
  organizerBio: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const access = await requireOrganizerEventAccess(eventId);
    if ("error" in access) {
      return NextResponse.json(access.error, { status: access.status });
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    const data = parsed.data;
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        organizerPhotoUrl: data.organizerPhotoUrl === undefined ? undefined : data.organizerPhotoUrl,
        organizerPhotoFileKey: data.organizerPhotoFileKey === undefined ? undefined : data.organizerPhotoFileKey,
        organizerBio: data.organizerBio === undefined ? undefined : data.organizerBio,
      },
      select: {
        id: true,
        organizerPhotoUrl: true,
        organizerPhotoFileKey: true,
        organizerBio: true,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
