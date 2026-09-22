"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ShopDateRangePicker } from "@/components/shop/ShopDateRangePicker";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import type { SuggestItem } from "@/components/shop/ShopAutocomplete";
import { HOTEL_STAY_CAPS, type HotelResultsSearchParams } from "@/lib/hotel-results-url";
import { groupHotelSuggests, hotelSuggestBadge, type HotelSuggestItem } from "@/lib/hotel-suggest";
import { shopAdultCount, shopChildCount, shopRoomCount } from "@/lib/hotel-occupancy";

export type StayTypeTab = "all" | "hotel" | "apartment" | "villa";

type Props = {
  draft: HotelResultsSearchParams;
  loading: boolean;
  stayType: StayTypeTab;
  onDraftChange: (next: HotelResultsSearchParams) => void;
  onStayTypeChange: (tab: StayTypeTab) => void;
  onSearch: () => void;
  onPickHotel: (item: SuggestItem) => void;
  searchCities: (q: string) => Promise<SuggestItem[]>;
};

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
      />
    </svg>
  );
}

function IconCal() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3V2zm13 8H4v10h16V10z"
      />
    </svg>
  );
}

function IconGuest() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z"
      />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 21.5 21.5 20l-6-6zM9.5 14C7 14 5 12 5 9.5S7 5 9.5 5 14 7 14 9.5 12 14 9.5 14z"
      />
    </svg>
  );
}

function IconBed() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M4 11V4h2v5h8V4h2v7h4v9h-2v-3H4v3H2v-9h2zm0 2v2h16v-2H4z" />
    </svg>
  );
}

function IconApt() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M4 21V3h10v6h6v12H4zm2-2h2v-2H6v2zm0-4h2v-2H6v2zm0-4h2V9H6v2zm0-4h2V5H6v2zm4 12h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V9h-2v2zm0-4h2V5h-2v2zm4 12h6v-8h-6v2h2v2h-2v2h2v2h-2v2z"
      />
    </svg>
  );
}

function IconVilla() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M4 21V10l8-6 8 6v11h-6v-6H10v6H4z" />
    </svg>
  );
}

function IconAll() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"
      />
    </svg>
  );
}

function badgeLabel(
  t: (key: "suggestRegion" | "suggestHotelKind" | "typeApartment" | "typeVilla") => string,
  badge: string,
) {
  if (badge === "apartment") return t("typeApartment");
  if (badge === "villa") return t("typeVilla");
  if (badge === "region") return t("suggestRegion");
  return t("suggestHotelKind");
}

export function TvlkHotelResultsSearch(props: Props) {
  const { t, locale } = useShopI18n();
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [acOpen, setAcOpen] = useState(false);
  const [acItems, setAcItems] = useState<HotelSuggestItem[]>([]);
  const destRef = useRef<HTMLDivElement | null>(null);
  const guestsRef = useRef<HTMLDivElement | null>(null);
  const destValue = props.draft.destinationLabel || props.draft.destination;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const node = e.target as Node;
      if (!destRef.current?.contains(node)) setAcOpen(false);
      if (!guestsRef.current?.contains(node)) setGuestsOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function runSuggest(q: string) {
    try {
      const rows = await props.searchCities(q);
      setAcItems(
        rows.map((row) => ({
          ...row,
          kind: row.kind,
          badge: hotelSuggestBadge(row.title, row.kind || (row.subtitle?.includes("فندق") || /hotel/i.test(row.subtitle || "") ? "hotel" : "")),
          meta: row.meta,
        })),
      );
    } catch {
      setAcItems([]);
    }
  }

  function scheduleSuggest(text: string) {
    props.onDraftChange({
      ...props.draft,
      destination: text,
      destinationLabel: text,
    });
    setAcOpen(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void runSuggest(text.trim());
    }, 220);
  }

  const grouped = useMemo(() => groupHotelSuggests(acItems), [acItems]);
  const guestSummary = [
    shopAdultCount(locale, props.draft.adults),
    props.draft.children > 0
      ? shopChildCount(locale, props.draft.children)
      : locale === "en"
        ? "0 children"
        : "0 أطفال",
    shopRoomCount(locale, props.draft.rooms),
  ].join(locale === "en" ? ", " : "، ");

  const tabs: Array<{ id: StayTypeTab; label: string; icon: ReactNode }> = [
    { id: "all", label: t("stayTypeAll"), icon: <IconAll /> },
    { id: "hotel", label: t("typeHotel"), icon: <IconBed /> },
    { id: "apartment", label: t("typeApartment"), icon: <IconApt /> },
    { id: "villa", label: t("typeVilla"), icon: <IconVilla /> },
  ];

  function patch(partial: Partial<HotelResultsSearchParams>) {
    props.onDraftChange({ ...props.draft, ...partial, occ: "" });
  }

  function setChildren(n: number) {
    const children = Math.max(0, Math.min(HOTEL_STAY_CAPS.maxChildren, n));
    const ages = String(props.draft.childrenAges || "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    while (ages.length < children) ages.push(String(HOTEL_STAY_CAPS.defaultChildAge));
    patch({ children, childrenAges: ages.slice(0, children).join(",") });
  }

  return (
    <div className="tvlk-hotel-search">
      <div className="tvlk-hotel-search-tabs" role="tablist" aria-label={t("propertyType")}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={props.stayType === tab.id}
            className={props.stayType === tab.id ? "on" : undefined}
            onClick={() => props.onStayTypeChange(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <form
        className="tvlk-hotel-search-card"
        onSubmit={(e) => {
          e.preventDefault();
          setAcOpen(false);
          props.onSearch();
        }}
      >
        <div className="tvlk-hotel-search-cell dest" ref={destRef}>
          <span className="tvlk-hotel-search-label">{t("cityDestHotelName")}</span>
          <div className="tvlk-hotel-search-field">
            <span className="tvlk-hotel-search-icon">
              <IconPin />
            </span>
            <input
              type="text"
              value={destValue}
              placeholder={t("cityDestHotelName")}
              autoComplete="off"
              onChange={(e) => scheduleSuggest(e.target.value)}
              onFocus={() => {
                setAcOpen(true);
                void runSuggest(destValue.trim());
              }}
            />
            {destValue ? (
              <button
                type="button"
                className="tvlk-hotel-search-clear"
                aria-label={t("done")}
                onClick={() => {
                  props.onDraftChange({
                    ...props.draft,
                    destination: "",
                    destinationLabel: "",
                  });
                  setAcItems([]);
                  setAcOpen(true);
                }}
              >
                ×
              </button>
            ) : null}
          </div>
          {acOpen && (grouped.destinations.length || grouped.hotels.length) ? (
            <div className="tvlk-hotel-search-ac" role="listbox">
              {grouped.destinations.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  className={idx === 0 ? "is-primary" : undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    props.onDraftChange({
                      ...props.draft,
                      destination: item.title,
                      destinationLabel: item.title,
                    });
                    setAcOpen(false);
                  }}
                >
                  <span className="tvlk-hotel-search-ac-icon">
                    <IconPin />
                  </span>
                  <span className="tvlk-hotel-search-ac-text">
                    <strong>{item.title}</strong>
                    {item.subtitle ? <em>{item.subtitle}</em> : null}
                  </span>
                  <span className="tvlk-hotel-search-ac-meta">
                    <b>{badgeLabel(t, item.badge || "region")}</b>
                    {item.meta ? <i>{item.meta}</i> : null}
                  </span>
                </button>
              ))}
              {grouped.hotels.length ? (
                <p className="tvlk-hotel-search-ac-head">
                  {t("otherResultsFor", { q: destValue.trim() || props.draft.destination })}
                </p>
              ) : null}
              {grouped.hotels.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setAcOpen(false);
                    props.onPickHotel(item);
                  }}
                >
                  <span className="tvlk-hotel-search-ac-icon">
                    <IconBed />
                  </span>
                  <span className="tvlk-hotel-search-ac-text">
                    <strong>{item.title}</strong>
                    {item.subtitle ? <em>{item.subtitle}</em> : null}
                  </span>
                  <span className="tvlk-hotel-search-ac-meta">
                    <b>{badgeLabel(t, item.badge || "hotel")}</b>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="tvlk-hotel-search-cell dates">
          <span className="tvlk-hotel-search-label">{t("checkInOutDates")}</span>
          <div className="tvlk-hotel-search-field">
            <span className="tvlk-hotel-search-icon">
              <IconCal />
            </span>
            <ShopDateRangePicker
              checkIn={props.draft.checkIn}
              checkOut={props.draft.checkOut}
              showNights
              onChange={(checkIn, checkOut) => patch({ checkIn, checkOut })}
            />
          </div>
        </div>

        <div className="tvlk-hotel-search-cell guests" ref={guestsRef}>
          <span className="tvlk-hotel-search-label">{t("guestsAndRooms")}</span>
          <button
            type="button"
            className="tvlk-hotel-search-field tvlk-hotel-search-guests-btn"
            onClick={() => setGuestsOpen((v) => !v)}
          >
            <span className="tvlk-hotel-search-icon">
              <IconGuest />
            </span>
            <span>{guestSummary}</span>
          </button>
          {guestsOpen ? (
            <div className="tvlk-hotel-search-guests-pop">
              <div className="exp-travelers-row">
                <span>{t("adults")}</span>
                <div className="exp-stepper">
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        adults: Math.max(1, Math.min(HOTEL_STAY_CAPS.maxGuests, props.draft.adults - 1)),
                      })
                    }
                  >
                    −
                  </button>
                  <strong>{props.draft.adults}</strong>
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        adults: Math.max(1, Math.min(HOTEL_STAY_CAPS.maxGuests, props.draft.adults + 1)),
                      })
                    }
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="exp-travelers-row">
                <span>{t("children")}</span>
                <div className="exp-stepper">
                  <button type="button" onClick={() => setChildren(props.draft.children - 1)}>
                    −
                  </button>
                  <strong>{props.draft.children}</strong>
                  <button type="button" onClick={() => setChildren(props.draft.children + 1)}>
                    +
                  </button>
                </div>
              </div>
              <div className="exp-travelers-row">
                <span>{t("rooms")}</span>
                <div className="exp-stepper">
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        rooms: Math.max(1, Math.min(HOTEL_STAY_CAPS.maxRooms, props.draft.rooms - 1)),
                      })
                    }
                  >
                    −
                  </button>
                  <strong>{props.draft.rooms}</strong>
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        rooms: Math.max(1, Math.min(HOTEL_STAY_CAPS.maxRooms, props.draft.rooms + 1)),
                      })
                    }
                  >
                    +
                  </button>
                </div>
              </div>
              {props.draft.children > 0 ? (
                <div className="tvlk-hotel-search-ages">
                  {Array.from({ length: props.draft.children }, (_, i) => (
                    <label key={i}>
                      {t("childAgeN", { n: i + 1 })}
                      <select
                        value={Number(String(props.draft.childrenAges || "").split(",")[i] || HOTEL_STAY_CAPS.defaultChildAge)}
                        onChange={(e) => {
                          const ages = String(props.draft.childrenAges || "")
                            .split(",")
                            .map((p) => p.trim());
                          while (ages.length < props.draft.children) {
                            ages.push(String(HOTEL_STAY_CAPS.defaultChildAge));
                          }
                          ages[i] = String(Number(e.target.value));
                          patch({ childrenAges: ages.slice(0, props.draft.children).join(",") });
                        }}
                      >
                        {Array.from({ length: HOTEL_STAY_CAPS.maxChildAge + 1 }, (_, age) => (
                          <option key={age} value={age}>
                            {t("yearsOld", { n: age })}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              ) : null}
              <button type="button" className="exp-pop-done" onClick={() => setGuestsOpen(false)}>
                {t("done")}
              </button>
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          className="tvlk-hotel-search-go"
          disabled={props.loading}
          aria-label={t("search")}
        >
          <IconSearch />
        </button>
      </form>
    </div>
  );
}
