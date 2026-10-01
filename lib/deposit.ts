/** Percent of estimated total collected as booking deposit (balance due before/at service). */
export const DEPOSIT_PERCENT = Number(process.env.BOOKING_DEPOSIT_PERCENT) || 20;

export function depositFromTotal(totalPrice: number): number {
  const raw = (totalPrice * DEPOSIT_PERCENT) / 100;
  return Math.round(raw * 100) / 100;
}
