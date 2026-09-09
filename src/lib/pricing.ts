import { EventType } from "@/generated/prisma/enums";

export const PAYU_TEST_MODE = process.env.NEXT_PUBLIC_PAYU_TEST_MODE === "true";

const testRate = PAYU_TEST_MODE ? 1 : null;

export const EVENT_TYPE_FEES: Record<EventType, number> = {
  WORKSHOP: testRate ?? 99,
  UNDERGROUND_BATTLE: testRate ?? 199,
  DANCE_COMPETITION: testRate ?? 249,
  MUSIC_COMPETITION: testRate ?? 249,
};

export const COMMISSION_RATE = 0.05;

export const GIG_FLAT_FEE = testRate ?? 199;

export const GIG_WORK_FEE = testRate ?? 99;

export const GIG_CONNECTION_FEE = testRate ?? 49;

export function commissionFor(entryFeeSum: number): number {
  if (!entryFeeSum || entryFeeSum <= 0) return 0;
  if (PAYU_TEST_MODE) return 1;
  return Math.round(entryFeeSum * COMMISSION_RATE);
}

export function chargeablePaise(amountInr: number): number {
  if (PAYU_TEST_MODE) return 100;
  return Math.max(0, Math.round(amountInr * 100));
}

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
