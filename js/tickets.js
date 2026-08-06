/* ---------------------------------------------------------
   Tickets — the meta-currency, earned by clearing a casino
   day's quota (with a bonus for beating it), spent in the shop.
   --------------------------------------------------------- */

const BASE_DAY_REWARD = 10;
const MAX_OVERSHOOT_BONUS = 50;

// Overshoot is measured against the quota, not the day's starting bank —
// e.g. finishing at $1,400 on a $1,200 quota is a 17% overshoot.
export function ticketsForDayClear(finalBank, quota) {
  const overshootPct = quota > 0 ? Math.max(0, (finalBank - quota) / quota) : 0;
  const bonus = Math.min(MAX_OVERSHOOT_BONUS, Math.round(overshootPct * 100));
  return { base: BASE_DAY_REWARD, bonus, total: BASE_DAY_REWARD + bonus };
}
