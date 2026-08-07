import { NextResponse } from "next/server";
import { z } from "zod";
import { EventStatus, EventType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { badRequest, isUniqueConstraintError, serverError, unauthorized, conflict } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { flatFeeForCategoryCount } from "@/lib/pricing";
import { isValidState } from "@/lib/states";
import { prisma } from "@/lib/prisma";

const eventSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(5000).optional(),
  eventType: z.enum(EventType).optional(),
  posterUrl: z.string().trim().max(3_000_000).nullable().optional(),
  venue: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional().refine((s) => s === undefined || s === "" || isValidState(s), {
    message: "Invalid state",
  }),
  startsAt: z.coerce.date(),
  status: z.enum(EventStatus).default(EventStatus.DRAFT),
  categoryCount: z.number().int().min(1).max(20).optional(),
});

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const state = searchParams.get("state");

  let statusFilter: EventStatus | { in: EventStatus[] } = { in: [EventStatus.PUBLISHED, EventStatus.LIVE] };
  if (status) {
    const parsedStatus = z.enum(EventStatus).safeParse(status);
    if (!parsedStatus.success) return badRequest("Invalid event status");
    statusFilter = parsedStatus.data;
  }

  let typeFilter: EventType | { in: EventType[] } | undefined;
  if (type) {
    const parsedType = z.enum(EventType).safeParse(type);
    if (!parsedType.success) return badRequest("Invalid event type");
    typeFilter = parsedType.data;
  }

  let stateFilter: { equals: string; mode: "insensitive" } | undefined;
  if (state) {
    if (!isValidState(state)) return badRequest("Invalid state");
    stateFilter = { equals: state, mode: "insensitive" };
  }

  const where: Prisma.EventWhereInput = {
    status: statusFilter,
    ...(typeFilter ? { eventType: typeFilter } : {}),
    ...(stateFilter ? { state: stateFilter } : {}),
  };

  const events = await prisma.event.findMany({
    where,
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
    const { categoryCount, ...rest } = parsed.data;

    const event = await prisma.event.create({
      data: {
        ...rest,
        categoryCount: categoryCount ?? null,
        flatFee: categoryCount ? flatFeeForCategoryCount(categoryCount) : null,
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
