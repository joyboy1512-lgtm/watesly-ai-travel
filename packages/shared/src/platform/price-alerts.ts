export type PriceAlert = {
  id: string;
  customerId: string;
  origin: string;
  destination: string;
  departDate?: string;
  returnDate?: string;
  currentPriceMinor: number;
  targetPriceMinor: number;
  currency: string;
  active: boolean;
  createdAt: string;
  lastNotifiedAt?: string;
};

export function shouldFirePriceAlert(
  alert: PriceAlert,
  latestPriceMinor: number,
): boolean {
  return alert.active && latestPriceMinor <= alert.targetPriceMinor;
}
