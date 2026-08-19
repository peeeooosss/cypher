import { NextResponse } from "next/server";
import { z } from "zod";
import { EventStatus, EventType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { badRequest, conflict, forbidden, isUniqueConstraintError, notFound, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { COMMISSION_RATE, flatFeeForEventType, isEventFlatFeePaid } from "@/lib/pricing";
import { isValidState } from "@/lib/states";
import { prisma } from "@/lib/prisma";
import { generateBracket, BracketError } from "@/lib/bracket";
import { emitToSocket } from "@/lib/socket-emit";

const updateEventSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  eventType: z.enum(EventType).nullable().optional(),
  posterUrl: z.string().trim().max(3_000_000).nullable().optional(),
  venue: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  state: z.string().trim().max(120).nullable().optional().refine((s) => s === undefined || s === null || s === "" || isValidState(s), {
    message: "Invalid state",
  }),
  startsAt: z.coerce.date().optional(),
  status: z.enum(EventStatus).optional(),
});

type EventRouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_: Request, { params }: EventRouteContext) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: { select: { id: true, name: true } },
      categories: {
        include: { _count: { select: { registrations: true, matches: true } } },
      },
      _count: { select: { matches: true } },
    },
  });

  return event ? NextResponse.json(event) : notFound("Event");
}

export async function PATCH(request: Request, { params }: EventRouteContext) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const ownedEvent = await prisma.event.findFirst({
    where: { id: eventId, organizerId: user.id },
    select: {
      id: true,
      status: true,
      eventType: true,
      flatFee: true,
      flatFeePaid: true,
      commissionPaid: true,
      commissionPaymentStatus: true,
    },
  });

  if (!ownedEvent) {
    return notFound("Event");
  }

  const parsed = updateEventSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid event data");
  }

  const targetStatus = parsed.data.status;

  if (targetStatus === EventStatus.PUBLISHED || targetStatus === EventStatus.LIVE) {
    if (!isEventFlatFeePaid(ownedEvent)) {
      return NextResponse.json(
        {
          error: "Pay the flat fee before the event can go live.",
          code: "FLAT_FEE_REQUIRED",
          billUrl: `/organizer/${eventId}/bill`,
        },
        { status: 402 },
      );
    }
  }

  if (targetStatus === EventStatus.COMPLETED) {
    const registrations = await prisma.registration.findMany({
      where: { category: { eventId }, status: "CONFIRMED" },
      select: { entryFee: true },
    });
    const totalEntryFees = registrations.reduce((sum, r) => sum + (r.entryFee ?? 0), 0);
    const commissionDue = Math.round(totalEntryFees * COMMISSION_RATE);

    if (commissionDue > 0 && ownedEvent.commissionPaymentStatus !== "VERIFIED") {
      await prisma.event.update({
        where: { id: eventId },
        data: { commissionDue },
      });
      return NextResponse.json(
        {
          error: "Settle the 2.99% commission before completing the event.",
          code: "COMMISSION_REQUIRED",
          commissionDue,
          billUrl: `/organizer/${eventId}/bill#commission`,
        },
        { status: 402 },
      );
    }
  }

  const BATTLE_TYPES = ["BATTLE_1V1", "BATTLE_2V2", "BATTLE_3V3", "BATTLE_4V4", "CREW_VS_CREW", "FINAL"];

  // Auto-activate first phase when event transitions to LIVE
  if (targetStatus === EventStatus.LIVE && ownedEvent.status !== EventStatus.LIVE) {
    const categories = await prisma.category.findMany({
      where: { eventId },
      include: { rounds: { orderBy: { order: "asc" } } },
    });
    for (const category of categories) {
      const firstPending = category.rounds.find(
        (r) => r.phaseStatus !== "COMPLETE" && r.phaseStatus !== "ACTIVE",
      );
      if (!firstPending) continue;
      await prisma.category.update({ where: { id: category.id }, data: { currentPhaseOrder: firstPending.order } });
      await prisma.roundFormat.update({ where: { id: firstPending.id }, data: { phaseStatus: "ACTIVE" } });

      if (BATTLE_TYPES.includes(firstPending.type)) {
        try {
          await generateBracket(category.id, user.id);
        } catch (error) {
          if (!(error instanceof BracketError)) throw error;
        }
      }

      await emitToSocket(eventId, "phase:activated", {
        phaseId: firstPending.id,
        phaseOrder: firstPending.order,
        type: firstPending.type,
        label: firstPending.label,
        categoryId: category.id,
      });
    }
  }

  try {
    const updateData: Prisma.EventUpdateInput = { ...parsed.data };

    if (
      parsed.data.eventType &&
      parsed.data.eventType !== ownedEvent.eventType &&
      !ownedEvent.flatFeePaid
    ) {
      updateData.flatFee = flatFeeForEventType(parsed.data.eventType);
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });

    return NextResponse.json(event);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("An event with this slug already exists");
    }

    console.error(error);
    return serverError();
  }
}

export async function DELETE(_: Request, { params }: EventRouteContext) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== "ORGANIZER") {
    return forbidden();
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: user.id },
    select: { id: true, status: true },
  });

  if (!event) {
    return notFound("Event");
  }

  if (event.status !== EventStatus.DRAFT) {
    return conflict("Only draft events can be deleted");
  }

  await prisma.event.delete({ where: { id: eventId } });
  return new NextResponse(null, { status: 204 });
}
