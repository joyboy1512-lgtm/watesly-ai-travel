/** Loyalty — Weekend Points. Admin can override rates via CMS later. */

export type PointsRules = {
  earnPerKwdMinor: number; // points per 1 KWD (1000 minor)
  redeemKwdMinorPerPoint: number; // value of 1 point in minor
  minRedeemPoints: number;
  welcomeBonus: number;
};

export const DEFAULT_POINTS_RULES: PointsRules = {
  earnPerKwdMinor: 1, // 1 point per 1 KWD spent (per 1000 minor)
  redeemKwdMinorPerPoint: 10, // 1 point = 0.010 KWD
  minRedeemPoints: 100,
  welcomeBonus: 50,
};

export function pointsEarnedFromSpend(
  spendMinor: number,
  rules: PointsRules = DEFAULT_POINTS_RULES,
): number {
  const kwd = Math.floor(Math.max(0, spendMinor) / 1000);
  return Math.max(0, kwd * rules.earnPerKwdMinor);
}

export function pointsToCreditMinor(
  points: number,
  rules: PointsRules = DEFAULT_POINTS_RULES,
): number {
  return Math.max(0, Math.floor(points) * rules.redeemKwdMinorPerPoint);
}

export type PointsLedgerEntry = {
  id: string;
  customerId: string;
  delta: number;
  reason: string;
  createdAt: string;
  bookingId?: string;
};

export type CustomerPointsAccount = {
  customerId: string;
  balance: number;
  entries: PointsLedgerEntry[];
};
