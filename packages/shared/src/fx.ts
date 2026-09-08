import { currencyExponent, currencyMinorFactor } from "./currency";

/** Mid-market units of KWD per 1 unit of the source currency. */
export const DEFAULT_UNITS_PER_KWD: Record<string, number> = {
  KWD: 1,
  EUR: 0.355,
  USD: 0.307,
  GBP: 0.412,
  SAR: 0.082,
  AED: 0.0836,
  BHD: 0.815,
  OMR: 0.797,
  QAR: 0.0843,
  EGP: 0.0062,
};

export type FxRatePair = {
  fromCurrency: string;
  toCurrency: string;
  /** 1 fromCurrency = rate toCurrency */
  rate: number;
};

export type FxRateLookup = Map<string, number>;

export function fxPairKey(from: string, to: string): string {
  return `${from.trim().toUpperCase()}_${to.trim().toUpperCase()}`;
}

export function buildFxLookup(pairs: FxRatePair[]): FxRateLookup {
  const map: FxRateLookup = new Map();
  for (const pair of pairs) {
    const from = pair.fromCurrency.trim().toUpperCase();
    const to = pair.toCurrency.trim().toUpperCase();
    if (!from || !to || !(pair.rate > 0)) continue;
    map.set(fxPairKey(from, to), pair.rate);
    if (from !== to) map.set(fxPairKey(to, from), 1 / pair.rate);
  }
  return map;
}

/** Default pivot rates into `toCurrency` for common ISO codes. */
export function defaultRatesToCurrency(toCurrency: string): FxRatePair[] {
  const to = toCurrency.trim().toUpperCase() || "KWD";
  const toKwd = DEFAULT_UNITS_PER_KWD[to];
  if (toKwd == null || toKwd <= 0) return [{ fromCurrency: to, toCurrency: to, rate: 1 }];

  const pairs: FxRatePair[] = [{ fromCurrency: to, toCurrency: to, rate: 1 }];
  for (const [code, unitsPerKwd] of Object.entries(DEFAULT_UNITS_PER_KWD)) {
    if (code === to) continue;
    // 1 CODE = (unitsPerKwd / toKwd) TO
    pairs.push({
      fromCurrency: code,
      toCurrency: to,
      rate: unitsPerKwd / toKwd,
    });
  }
  return pairs;
}

export function resolveFxRate(
  fromCurrency: string,
  toCurrency: string,
  lookup?: FxRateLookup | null,
): number | null {
  const from = fromCurrency.trim().toUpperCase();
  const to = toCurrency.trim().toUpperCase();
  if (!from || !to) return null;
  if (from === to) return 1;

  const direct = lookup?.get(fxPairKey(from, to));
  if (direct && direct > 0) return direct;

  // Pivot via KWD using defaults when org rates are incomplete.
  const fromKwd = lookup?.get(fxPairKey(from, "KWD")) ?? DEFAULT_UNITS_PER_KWD[from];
  const toKwd = lookup?.get(fxPairKey(to, "KWD")) ?? DEFAULT_UNITS_PER_KWD[to];
  if (fromKwd != null && toKwd != null && toKwd > 0) {
    return fromKwd / toKwd;
  }
  return null;
}

export function convertMinorAmount(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  lookup?: FxRateLookup | null,
): number {
  const from = fromCurrency.trim().toUpperCase();
  const to = toCurrency.trim().toUpperCase();
  if (!Number.isFinite(amountMinor)) return 0;
  if (from === to) return Math.round(amountMinor);

  const rate = resolveFxRate(from, to, lookup);
  if (rate == null) return Math.round(amountMinor);

  const major = amountMinor / currencyMinorFactor(from);
  const converted = major * rate;
  const factor = 10 ** currencyExponent(to);
  return Math.round(converted * factor);
}

export function canConvertCurrency(
  fromCurrency: string,
  toCurrency: string,
  lookup?: FxRateLookup | null,
): boolean {
  return resolveFxRate(fromCurrency, toCurrency, lookup) != null;
}

export type OrgFxSettings = {
  autoUpdateEnabled: boolean;
  /** frankfurter | open.er-api | custom */
  autoUpdateSource: "frankfurter" | "open.er-api" | "custom";
  autoUpdateUrl?: string | null;
  lastAutoSyncAt?: string | null;
};

export const DEFAULT_FX_SETTINGS: OrgFxSettings = {
  autoUpdateEnabled: false,
  autoUpdateSource: "frankfurter",
  autoUpdateUrl: null,
  lastAutoSyncAt: null,
};

export function parseOrgFxSettings(settings: unknown): OrgFxSettings {
  if (!settings || typeof settings !== "object") return { ...DEFAULT_FX_SETTINGS };
  const fx = (settings as { fx?: Partial<OrgFxSettings> }).fx;
  if (!fx || typeof fx !== "object") return { ...DEFAULT_FX_SETTINGS };
  const source = fx.autoUpdateSource;
  return {
    autoUpdateEnabled: Boolean(fx.autoUpdateEnabled),
    autoUpdateSource:
      source === "open.er-api" || source === "custom" || source === "frankfurter"
        ? source
        : "frankfurter",
    autoUpdateUrl: fx.autoUpdateUrl ? String(fx.autoUpdateUrl) : null,
    lastAutoSyncAt: fx.lastAutoSyncAt ? String(fx.lastAutoSyncAt) : null,
  };
}
