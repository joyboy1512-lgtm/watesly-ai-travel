"""Hotel and flight search. Filter and sort follow the published shop rules."""

from __future__ import annotations

import math
from datetime import date, datetime

from weekendgate.catalog import (
    ACTIVITIES,
    DESTINATIONS,
    FLIGHTS,
    HOTELS,
    TRANSFERS,
    destination_by_code,
    resolve_place,
)
from weekendgate.inventory import available, flight_key, hotel_key
from weekendgate.pricing import apply_markup, quote_stay

BREAKFAST = {"BB", "HB", "FB", "AI"}
CABIN_FACTOR = {"economy": 1.0, "premium": 1.55, "business": 2.7, "first": 4.1}
FACILITY_IDS = ("pool", "wifi", "parking", "gym", "spa", "restaurant", "shuttle")
PROPERTY_IDS = ("hotel", "apartment", "resort", "guest_house")


def nights_between(check_in: str | None, check_out: str | None) -> int:
    start = _parse_date(check_in)
    end = _parse_date(check_out)
    if not start or not end or end <= start:
        return 1
    return max(1, (end - start).days)


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def _as_list(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [part for part in value.split(",") if part]
    return [str(item) for item in value if str(item)]


def _hotel_text(hotel: dict) -> str:
    return " ".join(
        [
            hotel["name_ar"],
            hotel["name_en"],
            hotel["zone_ar"],
            hotel["zone_en"],
            hotel["destination"],
        ]
    ).casefold()


def _meal_ok(board: str, meals: list[str]) -> bool:
    if not meals:
        return True
    for meal in meals:
        if meal == "BB" and board in BREAKFAST:
            return True
        if meal == "HB" and board in {"HB", "FB", "AI"}:
            return True
        if meal == "FB" and board in {"FB", "AI"}:
            return True
        if board == meal:
            return True
    return False


def matching_rates(hotel: dict, filters: dict) -> list[tuple[dict, dict]]:
    meals = _as_list(filters.get("meals"))
    found: list[tuple[dict, dict]] = []
    for room in hotel["rooms"]:
        for rate in room["rates"]:
            if filters.get("breakfast") and rate["board"] not in BREAKFAST:
                continue
            if meals and not _meal_ok(rate["board"], meals):
                continue
            if filters.get("free_cancel") and not rate["refundable"]:
                continue
            if filters.get("pay_at_hotel") and rate["payment"] != "AT_HOTEL":
                continue
            max_price = filters.get("max_price")
            if max_price not in (None, ""):
                try:
                    ceiling = float(max_price)
                except (TypeError, ValueError):
                    ceiling = 0
                if ceiling > 0 and rate["price"] > ceiling + 0.0001:
                    continue
            found.append((room, rate))
    found.sort(key=lambda pair: pair[1]["price"])
    return found


def hotel_passes(hotel: dict, filters: dict) -> bool:
    query = str(filters.get("q") or "").strip().casefold()
    if query and query not in _hotel_text(hotel):
        return False
    stars = _as_list(filters.get("stars"))
    if stars and str(hotel["stars"]) not in stars:
        return False
    min_stars = filters.get("min_stars")
    if min_stars not in (None, "", "any"):
        try:
            if hotel["stars"] < int(min_stars):
                return False
        except ValueError:
            pass
    min_review = filters.get("min_review")
    if min_review not in (None, "", "any"):
        try:
            if hotel["review"] < float(min_review):
                return False
        except ValueError:
            pass
    properties = _as_list(filters.get("property"))
    if properties and hotel["property_type"] not in properties:
        return False
    facilities = _as_list(filters.get("facility"))
    if facilities and not all(item in hotel["facilities"] for item in facilities):
        return False
    max_km = filters.get("max_km")
    if max_km not in (None, ""):
        try:
            limit = float(max_km)
        except (TypeError, ValueError):
            limit = 0
        if limit > 0 and hotel["distance_km"] > limit:
            return False
    destination = filters.get("destination")
    if destination:
        place = resolve_place(str(destination))
        if place and hotel["destination"] != place["code"]:
            return False
    return True


def _highlight(hotel: dict, per_night: float) -> str | None:
    if hotel["review"] >= 9:
        return "guest_favorite"
    if hotel["stars"] >= 4 and per_night < 40:
        return "best_value"
    return None


def _count(value, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _sellable(rate: dict, key: str, needed: int) -> dict | None:
    live = available(key)
    qty = rate["allotment"] if live is None else live
    if qty < needed:
        return None
    shown = dict(rate)
    shown["allotment"] = qty
    return shown


def search_hotels(filters: dict | None = None) -> list[dict]:
    filters = dict(filters or {})
    stay_nights = nights_between(filters.get("check_in"), filters.get("check_out"))
    rooms_count = max(1, _count(filters.get("rooms"), 1))
    children = max(0, _count(filters.get("children"), 0))
    rows = []
    for hotel in HOTELS:
        if not hotel_passes(hotel, filters):
            continue
        rates = []
        for room, rate in matching_rates(hotel, filters):
            shown = _sellable(rate, hotel_key(hotel["id"], rate["id"]), rooms_count)
            if shown:
                rates.append((room, shown))
        if not rates:
            continue
        room, rate = rates[0]
        per_night = rate["price"]
        stay = quote_stay(per_night, stay_nights, rooms_count, children)
        rows.append(
            {
                "hotel": hotel,
                "room": room,
                "rate": rate,
                "nights": stay_nights,
                "rooms": rooms_count,
                "children": children,
                "per_night_kwd": per_night,
                "stay_kwd": stay,
                "highlight": _highlight(hotel, per_night),
                "rates": rates,
            }
        )
    sort = filters.get("sort") or "best"
    if sort == "price":
        rows.sort(key=lambda row: row["stay_kwd"])
    elif sort == "price_desc":
        rows.sort(key=lambda row: row["stay_kwd"], reverse=True)
    elif sort == "rating":
        rows.sort(key=lambda row: row["hotel"]["review"], reverse=True)
    elif sort == "distance":
        rows.sort(key=lambda row: (row["hotel"]["distance_km"], row["stay_kwd"]))
    else:
        def score(row: dict) -> float:
            hotel = row["hotel"]
            price = max(1.0, row["stay_kwd"])
            return (hotel["review"] * 12 + hotel["stars"] * 8) * 100000 / price

        rows.sort(key=score, reverse=True)
    return rows


def hotel_facets(filters: dict | None = None) -> dict:
    """Counts inside the destination before sidebar filters, matching a results sidebar."""
    filters = dict(filters or {})
    base = {
        "destination": filters.get("destination"),
        "check_in": filters.get("check_in"),
        "check_out": filters.get("check_out"),
        "rooms": filters.get("rooms") or 1,
    }
    rows = search_hotels(base)
    hotels = [row["hotel"] for row in rows]
    stars = {str(level): 0 for level in (5, 4, 3)}
    facilities = {item: 0 for item in FACILITY_IDS}
    properties = {item: 0 for item in PROPERTY_IDS}
    breakfast = 0
    free_cancel = 0
    max_night = 0.0
    for hotel in hotels:
        key = str(hotel["stars"])
        if key in stars:
            stars[key] += 1
        if hotel["property_type"] in properties:
            properties[hotel["property_type"]] += 1
        for facility in hotel["facilities"]:
            if facility in facilities:
                facilities[facility] += 1
        if any(rate["board"] in BREAKFAST for room in hotel["rooms"] for rate in room["rates"]):
            breakfast += 1
        if any(rate["refundable"] for room in hotel["rooms"] for rate in room["rates"]):
            free_cancel += 1
        for room in hotel["rooms"]:
            for rate in room["rates"]:
                max_night = max(max_night, rate["price"])
    return {
        "count": len(hotels),
        "stars": stars,
        "facilities": facilities,
        "properties": properties,
        "breakfast": breakfast,
        "free_cancel": free_cancel,
        "max_night": math.ceil(max_night) if max_night else 0,
    }


def find_hotel(hotel_id: str):
    return next((hotel for hotel in HOTELS if hotel["id"] == hotel_id), None)


def find_rate(hotel: dict, rate_id: str):
    for room in hotel["rooms"]:
        for rate in room["rates"]:
            if rate["id"] == rate_id or f"{room['code']}-{rate['board']}".lower() == rate_id:
                return room, rate
    return None, None


def stay_price(hotel_id: str, rate_id: str, check_in: str, check_out: str, rooms: int, children: int = 0) -> dict | None:
    hotel = find_hotel(hotel_id)
    if not hotel:
        return None
    room, rate = find_rate(hotel, rate_id)
    if not rate:
        return None
    stay_nights = nights_between(check_in, check_out)
    room_count = max(1, int(rooms or 1))
    child_count = max(0, int(children or 0))
    shown = _sellable(rate, hotel_key(hotel_id, rate["id"]), room_count) or dict(rate)
    return {
        "hotel": hotel,
        "room": room,
        "rate": shown,
        "nights": stay_nights,
        "rooms": room_count,
        "children": child_count,
        "stay_kwd": quote_stay(rate["price"], stay_nights, room_count, child_count),
        "per_night_kwd": rate["price"],
    }


def map_pins(rows: list[dict]) -> list[dict]:
    if not rows:
        return []
    lats = [row["hotel"]["lat"] for row in rows]
    lngs = [row["hotel"]["lng"] for row in rows]
    min_lat, max_lat = min(lats), max(lats)
    min_lng, max_lng = min(lngs), max(lngs)
    if max_lat == min_lat:
        max_lat += 0.02
        min_lat -= 0.02
    if max_lng == min_lng:
        max_lng += 0.02
        min_lng -= 0.02
    pins = []
    for row in rows:
        hotel = row["hotel"]
        x = 8 + (hotel["lng"] - min_lng) / (max_lng - min_lng) * 84
        y = 12 + (max_lat - hotel["lat"]) / (max_lat - min_lat) * 70
        pins.append({"id": hotel["id"], "x": round(x, 1), "y": round(y, 1), "stay_kwd": row["stay_kwd"]})
    return pins


def search_flights(filters: dict | None = None) -> list[dict]:
    filters = dict(filters or {})
    origin = resolve_place(str(filters.get("origin") or ""))
    destination = resolve_place(str(filters.get("destination") or ""))
    cabin = filters.get("cabin") or "economy"
    factor = CABIN_FACTOR.get(cabin, 1.0)
    adults = max(1, int(filters.get("adults") or 1))
    children = max(0, int(filters.get("children") or 0))
    passengers = adults + children
    max_stops = filters.get("stops")
    airline = (filters.get("airline") or "").strip().upper()
    rows = []
    for flight in FLIGHTS:
        if origin and flight["origin"] != origin["code"]:
            continue
        if destination and flight["destination"] != destination["code"]:
            continue
        if max_stops not in (None, "", "any"):
            try:
                if flight["stops"] > int(max_stops):
                    continue
            except ValueError:
                pass
        if airline and flight["airline"] != airline:
            continue
        seats = available(flight_key(flight["id"]))
        if seats is not None and seats < passengers:
            continue
        unit = flight["price"] * factor
        rows.append(
            {
                **flight,
                "cabin": cabin,
                "passengers": passengers,
                "seats_left": flight.get("seats_left") if seats is None else seats,
                "unit_kwd": unit,
                "total_kwd": apply_markup(unit * passengers),
            }
        )
    sort = filters.get("sort") or "price"
    if sort == "duration":
        rows.sort(key=lambda row: (row["minutes"], row["total_kwd"]))
    elif sort == "depart":
        rows.sort(key=lambda row: row["depart"])
    else:
        rows.sort(key=lambda row: (row["total_kwd"], row["minutes"]))
    return rows


def find_flight(flight_id: str):
    return next((flight for flight in FLIGHTS if flight["id"] == flight_id), None)


def flight_price(flight_id: str, cabin: str, adults: int, children: int) -> dict | None:
    flight = find_flight(flight_id)
    if not flight:
        return None
    factor = CABIN_FACTOR.get(cabin or "economy", 1.0)
    passengers = max(1, int(adults or 1)) + max(0, int(children or 0))
    unit = flight["price"] * factor
    return {**flight, "cabin": cabin or "economy", "passengers": passengers, "unit_kwd": unit, "total_kwd": apply_markup(unit * passengers)}


def search_activities(destination: str | None):
    place = resolve_place(destination or "")
    if not place:
        return ACTIVITIES, None
    return [row for row in ACTIVITIES if row["destination"] == place["code"]], place


def transfer_quote(destination: str | None, passengers: int, vehicle_id: str | None = None):
    place = resolve_place(destination or "") or destination_by_code("DXB")
    pax = max(1, int(passengers or 1))
    vehicles = TRANSFERS
    if vehicle_id:
        vehicles = [row for row in TRANSFERS if row["id"] == vehicle_id] or TRANSFERS
    quotes = []
    for vehicle in vehicles:
        cars = math.ceil(pax / vehicle["seats"])
        quotes.append({**vehicle, "cars": cars, "passengers": pax, "total_kwd": apply_markup(vehicle["price"] * cars), "place": place})
    return quotes


def airlines_for(rows: list[dict]) -> list[str]:
    return sorted({row["airline"] for row in rows})


def place_label(code: str, lang: str) -> str:
    row = destination_by_code(code)
    if not row:
        return code
    return row["city_en"] if lang == "en" else row["city_ar"]
