import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PRICING } from "@/lib/money";
import { EventType } from "@/generated/prisma/enums";

const pricingSchema = z.object({
  workshopFee: z.number().int().min(0).max(100000),
  undergroundBattleFee: z.number().int().min(0).max(100000),
  danceCompetitionFee: z.number().int().min(0).max(100000),
  musicCompetitionFee: z.number().int().min(0).max(100000),
  commissionBps: z.number().int().min(0).max(10000),
  gigFlatFee: z.number().int().min(0).max(100000),
  gigWorkFee: z.number().int().min(0).max(100000),
  gigConnectionFee: z.number().int().min(0).max(100000),
  applyFlatFeeToUnpaidEvents: z.boolean().optional().default(false),
});

function toFlat(fees: Record<EventType, number>, commissionBps: number, gigs: { gigFlatFee: number; gigWorkFee: number; gigConnectionFee: number }) {
  return {
    workshopFee: fees.WORKSHOP,
    undergroundBattleFee: fees.UNDERGROUND_BATTLE,
    danceCompetitionFee: fees.DANCE_COMPETITION,
    musicCompetitionFee: fees.MUSIC_COMPETITION,
    commissionBps,
    gigFlatFee: gigs.gigFlatFee,
    gigWorkFee: gigs.gigWorkFee,
    gigConnectionFee: gigs.gigConnectionFee,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  try {
    const row = await prisma.pricingConfig.findUnique({ where: { id: "singleton" } });
    if (!row) {
      return NextResponse.json(toFlat(DEFAULT_PRICING.eventTypeFees, DEFAULT_PRICING.commissionBps, DEFAULT_PRICING));
    }
    const raw = (row.eventTypeFees ?? {}) as Record<string, unknown>;
    return NextResponse.json(
      toFlat(
        {
          WORKSHOP: typeof raw.WORKSHOP === "number" ? raw.WORKSHOP : DEFAULT_PRICING.eventTypeFees.WORKSHOP,
          UNDERGROUND_BATTLE: typeof raw.UNDERGROUND_BATTLE === "number" ? raw.UNDERGROUND_BATTLE : DEFAULT_PRICING.eventTypeFees.UNDERGROUND_BATTLE,
          DANCE_COMPETITION: typeof raw.DANCE_COMPETITION === "number" ? raw.DANCE_COMPETITION : DEFAULT_PRICING.eventTypeFees.DANCE_COMPETITION,
          MUSIC_COMPETITION: typeof raw.MUSIC_COMPETITION === "number" ? raw.MUSIC_COMPETITION : DEFAULT_PRICING.eventTypeFees.MUSIC_COMPETITION,
        },
        row.commissionBps,
        row,
      ),
    );
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const parsed = pricingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid pricing values");

  const {
    workshopFee,
    undergroundBattleFee,
    danceCompetitionFee,
    musicCompetitionFee,
    commissionBps,
    gigFlatFee,
    gigWorkFee,
    gigConnectionFee,
    applyFlatFeeToUnpaidEvents,
  } = parsed.data;

  try {
    const eventTypeFees: Record<EventType, number> = {
      WORKSHOP: workshopFee,
      UNDERGROUND_BATTLE: undergroundBattleFee,
      DANCE_COMPETITION: danceCompetitionFee,
      MUSIC_COMPETITION: musicCompetitionFee,
    };

    await prisma.pricingConfig.upsert({
      where: { id: "singleton" },
      update: {
        eventTypeFees,
        commissionBps,
        gigFlatFee,
        gigWorkFee,
        gigConnectionFee,
        updatedBy: user.email,
      },
      create: {
        id: "singleton",
        eventTypeFees,
        commissionBps,
        gigFlatFee,
        gigWorkFee,
        gigConnectionFee,
        updatedBy: user.email,
      },
    });

    if (applyFlatFeeToUnpaidEvents) {
      const events = await prisma.event.findMany({
        where: { flatFeePaid: false },
        select: { id: true, eventType: true },
      });
      for (const event of events) {
        const fee = event.eventType ? eventTypeFees[event.eventType] : undefined;
        if (fee != null) {
          await prisma.event.update({ where: { id: event.id }, data: { flatFee: fee } });
        }
      }
    }

    return NextResponse.json({
      workshopFee,
      undergroundBattleFee,
      danceCompetitionFee,
      musicCompetitionFee,
      commissionBps,
      gigFlatFee,
      gigWorkFee,
      gigConnectionFee,
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}