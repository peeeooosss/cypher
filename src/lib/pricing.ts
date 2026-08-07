export const EVENT_FLAT_FEES: Record<number, number> = {
  2: 49,
  3: 99,
  5: 199,
};

export const COMMISSION_RATE = 0.015;

export const GIG_FLAT_FEE = 149;

export const GIG_WORK_FEE = 49;

export const GIG_WORK_DURATION_MS = 3 * 30 * 24 * 60 * 60 * 1000;

export function gigWorkExpiryFrom(paidAt: Date): Date {
  const expiresAt = new Date(paidAt);
  expiresAt.setMonth(expiresAt.getMonth() + 3);
  return expiresAt;
}

export function flatFeeForCategoryCount(categoryCount: number): number {
  if (categoryCount <= 2) return EVENT_FLAT_FEES[2];
  if (categoryCount <= 4) return EVENT_FLAT_FEES[3];
  return EVENT_FLAT_FEES[5];
}

export function isEventFlatFeePaid(event: {
  flatFee: number | null;
  flatFeePaid: boolean;
}): boolean {
  if (event.flatFee == null || event.flatFee <= 0) return true;
  return event.flatFeePaid;
}

export function commissionFor(entryFee: number): number {
  if (!entryFee || entryFee <= 0) return 0;
  return Math.round(entryFee * COMMISSION_RATE);
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
