import { NextResponse } from "next/server";
import { z } from "zod";
import { EventStatus } from "@/generated/prisma/enums";
import { badRequest, isUniqueConstraintError, serverError, unauthorized, conflict } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const eventSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(5000).optional(),
  venue: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120).optional(),
  startsAt: z.coerce.date(),
  status: z.enum(EventStatus).default(EventStatus.DRAFT),
});

export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get("status");
  const parsedStatus = status ? z.enum(EventStatus).safeParse(status) : null;

  if (status && !parsedStatus?.success) {
    return badRequest("Invalid event status");
  }

  const events = await prisma.event.findMany({
    where: parsedStatus?.success
      ? { status: parsedStatus.data }
      : { status: { in: [EventStatus.PUBLISHED, EventStatus.LIVE] } },
    include: {
      organizer: { select: { name: true } },
      categories: {
        include: { _count: { select: { registrations: true } } },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Only organizers can create events" }, { status: 403 });
  }

  const parsed = eventSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid event data");
  }

  try {
    const event = await prisma.event.create({
      data: {
        ...parsed.data,
        organizer: { connect: { id: user.id } },
      },
      include: { categories: true },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("An event with this slug already exists");
    }

    console.error(error);
    return serverError();
  }
}
