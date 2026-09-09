import { EventType } from "@/generated/prisma/enums";

export interface PricingValues {
  eventTypeFees: Record<EventType, number>;
  commissionBps: number;
  gigFlatFee: number;
  gigWorkFee: number;
  gigConnectionFee: number;
}

export const DEFAULT_PRICING: PricingValues = {
  eventTypeFees: {
    WORKSHOP: 99,
    UNDERGROUND_BATTLE: 199,
    DANCE_COMPETITION: 249,
    MUSIC_COMPETITION: 249,
  },
  commissionBps: 500,
  gigFlatFee: 199,
  gigWorkFee: 99,
  gigConnectionFee: 49,
};

export function eventTypeFee(pricing: PricingValues, eventType: EventType): number {
  return pricing.eventTypeFees[eventType] ?? 0;
}

export function commissionFor(entryFeeSum: number, commissionBps: number): number {
  if (!entryFeeSum || entryFeeSum <= 0) return 0;
  return Math.round((entryFeeSum * commissionBps) / 10000);
}

export function chargeablePaise(amountInr: number): number {
  return Math.max(0, Math.round(amountInr * 100));
}

export const GIG_WORK_DURATION_MS = 3 * 30 * 24 * 60 * 60 * 1000;

export function gigWorkExpiryFrom(paidAt: Date): Date {
  const expiresAt = new Date(paidAt);
  expiresAt.setMonth(expiresAt.getMonth() + 3);
  return expiresAt;
}

export function isEventFlatFeePaid(event: { flatFee: number | null; flatFeePaid: boolean }): boolean {
  if (event.flatFee == null || event.flatFee <= 0) return true;
  return event.flatFeePaid;
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}