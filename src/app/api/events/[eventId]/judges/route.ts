import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/lib/event-access";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isUploadThingUrl } from "@/lib/uploadthing-url";

const socialLinksSchema = z
  .record(z.string().trim().min(1).max(40), z.string().trim().url().max(500))
  .refine((links) => Object.keys(links).length <= 6, { message: "Too many social links" })
  .nullable()
  .optional();

const judgeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  title: z.string().trim().max(60).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  photoUrl: z.string().trim().max(3000).nullable().optional(),
  photoFileKey: z.string().trim().min(1).max(255).nullable().optional(),
  socialLinks: socialLinksSchema,
  displayOrder: z.number().int().min(0).max(1000).optional(),
  isPublic: z.boolean().optional(),
});

type Context = { params: Promise<{ eventId: string }> };

export async function GET(_: Request, { params }: Context) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) return unauthorized();
  if (user.role !== "ORGANIZER") return forbidden();
  if (!(await getEventForOwner(eventId, user.id))) return notFound("Event");

  const judges = await prisma.eventJudge.findMany({
    where: { eventId },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(judges);
}

export async function POST(request: Request, { params }: Context) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) return unauthorized();
  if (user.role !== "ORGANIZER") return forbidden();
  if (!(await getEventForOwner(eventId, user.id))) return notFound("Event");

  const parsed = judgeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid judge data");
  }

  if (parsed.data.photoFileKey && (!parsed.data.photoUrl || !isUploadThingUrl(parsed.data.photoUrl))) {
    return badRequest("Judge photo must be uploaded through UploadThing");
  }

  try {
    const judge = await prisma.eventJudge.create({
      data: {
        eventId,
        name: parsed.data.name,
        title: parsed.data.title ?? null,
        bio: parsed.data.bio ?? null,
        photoUrl: parsed.data.photoUrl ?? null,
        photoFileKey: parsed.data.photoFileKey ?? null,
        socialLinks: parsed.data.socialLinks ?? undefined,
        displayOrder: parsed.data.displayOrder ?? 0,
        isPublic: parsed.data.isPublic ?? true,
      },
    });

    return NextResponse.json(judge, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
