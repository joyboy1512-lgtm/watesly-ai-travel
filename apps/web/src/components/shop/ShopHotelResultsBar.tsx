"use client";

import { useState } from "react";
import { ShopAutocomplete, type SuggestItem } from "@/components/shop/ShopAutocomplete";
import { ShopDateRangePicker } from "@/components/shop/ShopDateRangePicker";

type Props = {
  stayQuery: string;
  departDate: string;
  returnDate: string;
  adults: number;
  children: number;
  rooms: number;
  loading: boolean;
  onStayQueryChange: (text: string) => void;
  onStayPick: (item: SuggestItem) => void;
  onDepartDateChange: (v: string) => void;
  onReturnDateChange: (v: string) => void;
  onAdultsChange: (n: number) => void;
  onChildrenChange: (n: number) => void;
  onRoomsChange: (n: number) => void;
  onSearch: () => void;
  searchCities: (q: string) => Promise<SuggestItem[]>;
};

export function ShopHotelResultsBar(props: Props) {
  const [guestsOpen, setGuestsOpen] = useState(false);
  const guestSummary = `${props.adults + props.children} ضيف · ${props.rooms} غرفة`;

  return (
    <div className="shop-hotel-results-bar-wrap">
      <form
        className="shop-hotel-results-bar"
        onSubmit={(e) => {
          e.preventDefault();
          props.onSearch();
        }}
      >
        <div className="shop-hotel-results-bar-cell shop-hotel-results-bar-dest">
          <span className="shop-hotel-results-bar-icon" aria-hidden>
            📍
          </span>
          <ShopAutocomplete
            inline
            label="الوجهة"
            value={props.stayQuery}
            display={props.stayQuery}
            placeholder="مدينة أو فندق"
            onQuery={props.searchCities}
            onClearText={props.onStayQueryChange}
            onPick={props.onStayPick}
          />
        </div>

        <div className="shop-hotel-results-bar-cell shop-hotel-results-bar-dates">
          <span className="shop-hotel-results-bar-icon" aria-hidden>
            📅
          </span>
          <ShopDateRangePicker
            checkIn={props.departDate}
            checkOut={props.returnDate}
            onChange={(checkIn, checkOut) => {
              props.onDepartDateChange(checkIn);
              props.onReturnDateChange(checkOut);
            }}
          />
        </div>

        <div className="shop-hotel-results-bar-cell shop-hotel-results-bar-guests">
          <button
            type="button"
            className="shop-hotel-results-bar-guests-btn"
            onClick={() => setGuestsOpen((v) => !v)}
          >
            <span className="shop-hotel-results-bar-icon" aria-hidden>
              👤
            </span>
            <span>{guestSummary}</span>
          </button>
          {guestsOpen ? (
            <div className="shop-hotel-results-bar-guests-pop">
              <div className="exp-travelers-row">
                <span>بالغون</span>
                <div className="exp-stepper">
                  <button
                    type="button"
                    onClick={() => props.onAdultsChange(Math.max(1, props.adults - 1))}
                  >
                    −
                  </button>
                  <strong>{props.adults}</strong>
                  <button type="button" onClick={() => props.onAdultsChange(props.adults + 1)}>
                    +
                  </button>
                </div>
              </div>
              <div className="exp-travelers-row">
                <span>أطفال</span>
                <div className="exp-stepper">
                  <button
                    type="button"
                    onClick={() => props.onChildrenChange(Math.max(0, props.children - 1))}
                  >
                    −
                  </button>
                  <strong>{props.children}</strong>
                  <button type="button" onClick={() => props.onChildrenChange(props.children + 1)}>
                    +
                  </button>
                </div>
              </div>
              <div className="exp-travelers-row">
                <span>غرف</span>
                <div className="exp-stepper">
                  <button
                    type="button"
                    onClick={() => props.onRoomsChange(Math.max(1, props.rooms - 1))}
                  >
                    −
                  </button>
                  <strong>{props.rooms}</strong>
                  <button type="button" onClick={() => props.onRoomsChange(props.rooms + 1)}>
                    +
                  </button>
                </div>
              </div>
              <button type="button" className="exp-pop-done" onClick={() => setGuestsOpen(false)}>
                تم
              </button>
            </div>
          ) : null}
        </div>

        <button type="submit" className="shop-hotel-results-bar-search" disabled={props.loading}>
          {props.loading ? "..." : "بحث"}
        </button>
      </form>
    </div>
  );
}
