import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { EventType } from "@/generated/prisma/enums";
import {
  DEFAULT_PRICING,
  PricingValues,
  eventTypeFee as moneyEventTypeFee,
  commissionFor as moneyCommissionFor,
} from "@/lib/money";

export type { PricingValues } from "@/lib/money";
export {
  DEFAULT_PRICING,
  chargeablePaise,
  formatInr,
  gigWorkExpiryFrom,
  isEventFlatFeePaid,
} from "@/lib/money";

function normalize(row: {
  eventTypeFees: unknown;
  commissionBps: number;
  gigFlatFee: number;
  gigWorkFee: number;
  gigConnectionFee: number;
}): PricingValues {
  const raw = (row.eventTypeFees ?? {}) as Record<string, unknown>;
  const eventTypeFees = { ...DEFAULT_PRICING.eventTypeFees } as Record<EventType, number>;
  for (const type of Object.keys(DEFAULT_PRICING.eventTypeFees) as EventType[]) {
    const value = raw[type];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      eventTypeFees[type] = Math.round(value);
    }
  }
  return {
    eventTypeFees,
    commissionBps:
      Number.isFinite(row.commissionBps) && row.commissionBps >= 0 ? Math.round(row.commissionBps) : DEFAULT_PRICING.commissionBps,
    gigFlatFee:
      Number.isFinite(row.gigFlatFee) && row.gigFlatFee >= 0 ? Math.round(row.gigFlatFee) : DEFAULT_PRICING.gigFlatFee,
    gigWorkFee:
      Number.isFinite(row.gigWorkFee) && row.gigWorkFee >= 0 ? Math.round(row.gigWorkFee) : DEFAULT_PRICING.gigWorkFee,
    gigConnectionFee:
      Number.isFinite(row.gigConnectionFee) && row.gigConnectionFee >= 0
        ? Math.round(row.gigConnectionFee)
        : DEFAULT_PRICING.gigConnectionFee,
  };
}

export const getPricingConfig = cache(async (): Promise<PricingValues> => {
  try {
    const row = await prisma.pricingConfig.findFirst();
    if (!row) {
      await prisma.pricingConfig.upsert({
        where: { id: "singleton" },
        update: {},
        create: {
          id: "singleton",
          eventTypeFees: DEFAULT_PRICING.eventTypeFees,
          commissionBps: DEFAULT_PRICING.commissionBps,
          gigFlatFee: DEFAULT_PRICING.gigFlatFee,
          gigWorkFee: DEFAULT_PRICING.gigWorkFee,
          gigConnectionFee: DEFAULT_PRICING.gigConnectionFee,
        },
      });
      return DEFAULT_PRICING;
    }
    return normalize(row);
  } catch {
    return DEFAULT_PRICING;
  }
});

export async function flatFeeForEventType(eventType: EventType): Promise<number> {
  const pricing = await getPricingConfig();
  return moneyEventTypeFee(pricing, eventType);
}

export async function commissionFor(entryFeeSum: number): Promise<number> {
  const pricing = await getPricingConfig();
  return moneyCommissionFor(entryFeeSum, pricing.commissionBps);
}