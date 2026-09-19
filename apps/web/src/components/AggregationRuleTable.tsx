"use client";

export type AggregationMode = "cheapest" | "preferred";

export type CapabilityAggregation = {
  mode: AggregationMode;
  preferredProviderKey?: string;
};

export type TravelAggregation = {
  hotel: CapabilityAggregation;
  flight: CapabilityAggregation;
  transfer: CapabilityAggregation;
  activity: CapabilityAggregation;
};

export const DEFAULT_TRAVEL_AGGREGATION: TravelAggregation = {
  hotel: { mode: "cheapest" },
  flight: { mode: "cheapest" },
  transfer: { mode: "cheapest" },
  activity: { mode: "cheapest" },
};

export const AGG_CAPS: Array<{
  key: keyof TravelAggregation;
  label: string;
  result: string;
}> = [
  {
    key: "flight",
    label: "طيران",
    result: "رحلة واحدة — الأرخص أو مزودك المفضّل",
  },
  {
    key: "hotel",
    label: "فنادق",
    result: "فندق واحد — لا نسخ مكررة من الموردين",
  },
  {
    key: "transfer",
    label: "مواصلات",
    result: "عرض واحد لكل انتقال مطابق",
  },
  {
    key: "activity",
    label: "أنشطة",
    result: "عرض واحد لكل نشاط مطابق",
  },
];

export type AggregationProvider = {
  providerKey: string;
  displayName: string;
  enabled?: boolean;
  archivedAt?: string | null;
  capabilities?: string[];
  priority?: number;
};

function providersForCap(rows: AggregationProvider[], cap: string) {
  return rows.filter((row) => {
    if (row.archivedAt) return false;
    if (row.enabled === false) return false;
    const caps = Array.isArray(row.capabilities) ? row.capabilities : [];
    if (!caps.length) return true;
    return caps.includes(cap);
  });
}

function resultLabel(spec: CapabilityAggregation, cap: (typeof AGG_CAPS)[number]) {
  if (spec.mode === "preferred") {
    return spec.preferredProviderKey
      ? `مزود مفضّل أولاً · ${cap.result}`
      : `حسب رقم الأولوية · ${cap.result}`;
  }
  return `الأرخص يفوز · ${cap.result}`;
}

export function AggregationRuleTable({
  aggregation,
  providers,
  saving,
  tableClassName = "prov-table",
  onChange,
}: {
  aggregation: TravelAggregation;
  providers: AggregationProvider[];
  saving?: boolean;
  tableClassName?: string;
  onChange: (next: TravelAggregation) => void;
}) {
  return (
    <div className="cust-table-scroll">
      <table className={tableClassName}>
        <thead>
          <tr>
            <th>الخدمة</th>
            <th>أسلوب العرض</th>
            <th>المزود المفضّل</th>
            <th>ما يظهر للعميل</th>
          </tr>
        </thead>
        <tbody>
          {AGG_CAPS.map((cap) => {
            const spec = aggregation[cap.key];
            const options = providersForCap(providers, cap.key);
            return (
              <tr key={cap.key}>
                <td>
                  <strong>{cap.label}</strong>
                </td>
                <td>
                  <label className="prov-field agg-inline-field">
                    <span className="sr-only">أسلوب العرض</span>
                    <select
                      value={spec.mode}
                      disabled={saving}
                      onChange={(e) => {
                        const mode = e.target.value as AggregationMode;
                        onChange({
                          ...aggregation,
                          [cap.key]: { ...spec, mode },
                        });
                      }}
                    >
                      <option value="cheapest">الأرخص من كل الموردين</option>
                      <option value="preferred">حسب أولوية المزود</option>
                    </select>
                  </label>
                </td>
                <td>
                  <label className="prov-field agg-inline-field">
                    <span className="sr-only">المزود المفضّل</span>
                    <select
                      value={spec.preferredProviderKey || ""}
                      disabled={saving || spec.mode !== "preferred"}
                      onChange={(e) => {
                        onChange({
                          ...aggregation,
                          [cap.key]: {
                            ...spec,
                            preferredProviderKey: e.target.value || undefined,
                          },
                        });
                      }}
                    >
                      <option value="">أول رقم أولوية في الجدول</option>
                      {options.map((row) => (
                        <option key={row.providerKey} value={row.providerKey}>
                          {row.displayName}
                          {row.priority != null ? ` (${row.priority})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </td>
                <td className="prc-cond-cell">{resultLabel(spec, cap)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
