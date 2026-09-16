export type ReferralProgram = {
  rewardReferrerPoints: number;
  rewardFriendPoints: number;
  minBookingMinor: number;
  currency: string;
};

export const DEFAULT_REFERRAL: ReferralProgram = {
  rewardReferrerPoints: 200,
  rewardFriendPoints: 100,
  minBookingMinor: 50_000,
  currency: "KWD",
};

export function buildReferralCode(nameOrPhone: string): string {
  const clean = (nameOrPhone || "GUEST")
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "")
    .slice(0, 12)
    .toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WEEKEND-${clean || "GUEST"}-${suffix}`;
}

export type ReferralRecord = {
  code: string;
  ownerCustomerId: string;
  uses: number;
  createdAt: string;
};
