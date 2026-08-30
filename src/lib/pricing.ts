import { EventType } from "@/generated/prisma/enums";

export const EVENT_TYPE_FEES: Record<EventType, number> = {
  WORKSHOP: 99,
  UNDERGROUND_BATTLE: 199,
  DANCE_COMPETITION: 249,
  MUSIC_COMPETITION: 249,
};

export const COMMISSION_RATE = 0.0299;

export const GIG_FLAT_FEE = 199;

export const GIG_WORK_FEE = 99;

export const GIG_CONNECTION_FEE = 49;

export const GIG_WORK_DURATION_MS = 3 * 30 * 24 * 60 * 60 * 1000;

export function gigWorkExpiryFrom(paidAt: Date): Date {
  const expiresAt = new Date(paidAt);
  expiresAt.setMonth(expiresAt.getMonth() + 3);
  return expiresAt;
}

export function flatFeeForEventType(eventType: EventType): number {
  return EVENT_TYPE_FEES[eventType];
}

export function isEventFlatFeePaid(event: {
  flatFee: number | null;
  flatFeePaid: boolean;
}): boolean {
  if (event.flatFee == null || event.flatFee <= 0) return true;
  return event.flatFeePaid;
}

export interface CommissionBreakdown {
  categoryId: string;
  name: string;
  paidRegistrations: number;
  entryFeeSum: number;
  commission: number;
}

export interface CommissionCalculation {
  commissionDue: number;
  categories: CommissionBreakdown[];
}

export interface CommissionRegistration {
  entryFee: number | null;
  paid: boolean;
  categoryEntryFee: number | null;
}

export function calculateCommission(registrations: CommissionRegistration[]): CommissionCalculation {
  const breakdown: CommissionBreakdown[] = [];

  let totalEntryFees = 0;

  for (const r of registrations) {
    if (!r.paid) continue;
    const entryFee = r.entryFee ?? r.categoryEntryFee ?? 0;
    totalEntryFees += entryFee;
  }

  const totalCommission = Math.round(totalEntryFees * COMMISSION_RATE);

  return {
    commissionDue: totalCommission,
    categories: breakdown,
  };
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
