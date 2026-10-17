"""Bundled shop catalogue. Sell prices are KWD per room-night, per adult, or per vehicle."""

from __future__ import annotations

DESTINATIONS = [
    {"code": "KWI", "city_ar": "الكويت", "city_en": "Kuwait", "country_ar": "الكويت", "country_en": "Kuwait", "image": "/media/hero/night-city-gold.jpg", "lat": 29.3375, "lng": 47.9783},
    {"code": "DXB", "city_ar": "دبي", "city_en": "Dubai", "country_ar": "الإمارات", "country_en": "UAE", "image": "/media/destinations/dubai.jpg", "lat": 25.2048, "lng": 55.2708},
    {"code": "IST", "city_ar": "إسطنبول", "city_en": "Istanbul", "country_ar": "تركيا", "country_en": "Türkiye", "image": "/media/destinations/istanbul.jpg", "lat": 41.0082, "lng": 28.9784},
    {"code": "RUH", "city_ar": "الرياض", "city_en": "Riyadh", "country_ar": "السعودية", "country_en": "Saudi Arabia", "image": "/media/destinations/riyadh.jpg", "lat": 24.7136, "lng": 46.6753},
    {"code": "DOH", "city_ar": "الدوحة", "city_en": "Doha", "country_ar": "قطر", "country_en": "Qatar", "image": "/media/destinations/doha.jpg", "lat": 25.2854, "lng": 51.5310},
    {"code": "BAH", "city_ar": "المنامة", "city_en": "Manama", "country_ar": "البحرين", "country_en": "Bahrain", "image": "/media/destinations/bahrain.jpg", "lat": 26.2285, "lng": 50.5860},
    {"code": "MCT", "city_ar": "مسقط", "city_en": "Muscat", "country_ar": "عُمان", "country_en": "Oman", "image": "/media/destinations/muscat.jpg", "lat": 23.5880, "lng": 58.3829},
    {"code": "CAI", "city_ar": "القاهرة", "city_en": "Cairo", "country_ar": "مصر", "country_en": "Egypt", "image": "/media/offers/hotel.jpg", "lat": 30.0444, "lng": 31.2357},
    {"code": "CDG", "city_ar": "باريس", "city_en": "Paris", "country_ar": "فرنسا", "country_en": "France", "image": "/media/destinations/paris.jpg", "lat": 48.8566, "lng": 2.3522},
    {"code": "LHR", "city_ar": "لندن", "city_en": "London", "country_ar": "بريطانيا", "country_en": "United Kingdom", "image": "/media/destinations/london.jpg", "lat": 51.5074, "lng": -0.1278},
    {"code": "MLE", "city_ar": "المالديف", "city_en": "Maldives", "country_ar": "المالديف", "country_en": "Maldives", "image": "/media/destinations/maldives.jpg", "lat": 4.1755, "lng": 73.5093},
]

_FLIGHT_ROWS = [
    ("J9", "طيران الجزيرة", "Jazeera Airways", "KWI", "DXB", "08:15", "10:05", 110, 0, 28.5, "20kg", False),
    ("KU", "الخطوط الكويتية", "Kuwait Airways", "KWI", "DXB", "14:40", "16:25", 105, 0, 36.0, "30kg", True),
    ("EK", "طيران الإمارات", "Emirates", "KWI", "DXB", "19:10", "22:40", 210, 1, 41.0, "25kg", True),
    ("FZ", "فلاي دبي", "flydubai", "DXB", "KWI", "09:20", "10:55", 95, 0, 27.0, "20kg", False),
    ("KU", "الخطوط الكويتية", "Kuwait Airways", "DXB", "KWI", "18:05", "19:40", 95, 0, 34.5, "30kg", True),
    ("J9", "طيران الجزيرة", "Jazeera Airways", "KWI", "IST", "02:10", "06:05", 235, 0, 49.0, "20kg", False),
    ("TK", "الخطوط التركية", "Turkish Airlines", "KWI", "IST", "11:25", "15:10", 225, 0, 62.0, "30kg", True),
    ("TK", "الخطوط التركية", "Turkish Airlines", "IST", "KWI", "16:40", "20:15", 215, 0, 58.0, "30kg", True),
    ("J9", "طيران الجزيرة", "Jazeera Airways", "IST", "KWI", "07:30", "11:20", 230, 0, 47.5, "20kg", False),
    ("KU", "الخطوط الكويتية", "Kuwait Airways", "KWI", "CAI", "06:50", "09:35", 165, 0, 44.0, "30kg", True),
    ("MS", "مصر للطيران", "EgyptAir", "KWI", "CAI", "21:15", "00:05", 170, 0, 39.0, "23kg", False),
    ("MS", "مصر للطيران", "EgyptAir", "CAI", "KWI", "01:20", "05:10", 170, 0, 40.0, "23kg", False),
    ("KU", "الخطوط الكويتية", "Kuwait Airways", "KWI", "LHR", "09:00", "13:40", 460, 0, 118.0, "30kg", True),
    ("BA", "الخطوط البريطانية", "British Airways", "LHR", "KWI", "21:10", "06:20", 430, 0, 124.0, "23kg", True),
    ("EK", "طيران الإمارات", "Emirates", "DXB", "LHR", "07:45", "11:50", 485, 0, 142.0, "30kg", True),
    ("EK", "طيران الإمارات", "Emirates", "LHR", "DXB", "14:10", "00:05", 415, 0, 138.0, "30kg", True),
    ("QR", "القطرية", "Qatar Airways", "KWI", "DOH", "10:00", "10:55", 55, 0, 22.0, "30kg", True),
    ("QR", "القطرية", "Qatar Airways", "DOH", "CDG", "02:20", "07:35", 435, 0, 131.0, "30kg", True),
    ("QR", "القطرية", "Qatar Airways", "CDG", "DOH", "10:15", "18:05", 410, 0, 128.0, "30kg", True),
    ("J9", "طيران الجزيرة", "Jazeera Airways", "KWI", "BAH", "16:00", "16:45", 45, 0, 18.5, "20kg", False),
    ("GF", "طيران الخليج", "Gulf Air", "BAH", "KWI", "20:10", "21:05", 55, 0, 21.0, "30kg", True),
    ("WY", "الطيران العُماني", "Oman Air", "KWI", "MCT", "13:30", "16:10", 160, 0, 33.0, "30kg", True),
    ("WY", "الطيران العُماني", "Oman Air", "MCT", "KWI", "17:20", "19:50", 150, 0, 32.0, "30kg", True),
    ("SV", "الخطوط السعودية", "Saudia", "KWI", "RUH", "12:15", "13:35", 80, 0, 29.0, "30kg", True),
    ("SV", "الخطوط السعودية", "Saudia", "RUH", "KWI", "18:40", "20:05", 85, 0, 31.0, "30kg", True),
    ("Q2", "الخطوط المالديفية", "Maldivian", "DXB", "MLE", "23:40", "04:10", 270, 0, 86.0, "20kg", False),
    ("EK", "طيران الإمارات", "Emirates", "MLE", "DXB", "06:30", "09:20", 230, 0, 91.0, "30kg", True),
]


def _flights():
    rows = []
    for index, row in enumerate(_FLIGHT_ROWS, start=1):
        code, ar, en, origin, dest, depart, arrive, minutes, stops, price, bag, refundable = row
        rows.append(
            {
                "id": f"{code.lower()}-{origin.lower()}-{dest.lower()}-{index}",
                "airline": code,
                "airline_ar": ar,
                "airline_en": en,
                "origin": origin,
                "destination": dest,
                "depart": depart,
                "arrive": arrive,
                "minutes": minutes,
                "stops": stops,
                "price": price,
                "baggage": bag,
                "refundable": refundable,
            }
        )
    return rows


FLIGHTS = _flights()


def _room(code, name_ar, name_en, rates):
    built = []
    for board, price, refundable, payment, allotment in rates:
        built.append(
            {
                "id": f"{code}-{board}".lower(),
                "board": board,
                "price": price,
                "refundable": refundable,
                "payment": payment,
                "allotment": allotment,
            }
        )
    return {"code": code, "name_ar": name_ar, "name_en": name_en, "rates": built}


def _hotel(id_, dest, name_ar, name_en, stars, review, reviews, zone_ar, zone_en, km, lat, lng, ptype, facilities, rooms, image=None):
    dest_row = next(item for item in DESTINATIONS if item["code"] == dest)
    return {
        "id": id_,
        "destination": dest,
        "name_ar": name_ar,
        "name_en": name_en,
        "stars": stars,
        "review": review,
        "reviews": reviews,
        "zone_ar": zone_ar,
        "zone_en": zone_en,
        "distance_km": km,
        "lat": lat,
        "lng": lng,
        "property_type": ptype,
        "facilities": facilities,
        "rooms": rooms,
        "image": image or dest_row["image"],
    }


HOTELS = [
    _hotel("dxb-address", "DXB", "العنوان وسط دبي", "Address Downtown Dubai", 5, 9.2, 2410, "وسط المدينة", "Downtown", 0.4, 25.193, 55.279, "hotel", ["pool", "wifi", "gym", "spa", "restaurant", "parking"], [_room("DLX", "غرفة ديلوكس", "Deluxe room", [("BB", 62.0, True, "AT_WEB", 4), ("RO", 54.0, False, "AT_WEB", 6)]), _room("CLB", "غرفة كلوب", "Club room", [("HB", 81.0, True, "AT_WEB", 2)])], "/media/destinations/dubai.jpg"),
    _hotel("dxb-rove", "DXB", "روف سيتي ووك", "Rove City Walk", 4, 8.4, 980, "سيتي ووك", "City Walk", 3.1, 25.204, 55.262, "hotel", ["wifi", "gym", "restaurant"], [_room("STD", "غرفة مزدوجة", "Double room", [("RO", 31.5, False, "AT_WEB", 8), ("BB", 36.0, True, "AT_WEB", 3)])]),
    _hotel("dxb-atlantis", "DXB", "أتلانتس النخلة", "Atlantis The Palm", 5, 9.0, 5300, "نخلة جميرا", "Palm Jumeirah", 18.4, 25.130, 55.117, "resort", ["pool", "wifi", "gym", "spa", "restaurant", "shuttle", "parking"], [_room("OCN", "غرفة بإطلالة بحرية", "Ocean room", [("BB", 96.0, True, "AT_WEB", 3), ("AI", 140.0, True, "AT_HOTEL", 2)])], "/media/offers/hotel.jpg"),
    _hotel("dxb-marina-apt", "DXB", "شقة مارينا ووك", "Marina Walk apartment", 4, 8.1, 640, "دبي مارينا", "Dubai Marina", 12.2, 25.080, 55.140, "apartment", ["wifi", "pool", "parking"], [_room("1BR", "شقة غرفة واحدة", "One-bedroom apartment", [("RO", 42.0, True, "AT_WEB", 5)])]),
    _hotel("kwi-fs", "KWI", "فور سيزونز الكويت", "Four Seasons Kuwait", 5, 9.4, 870, "شرق", "Sharq", 2.2, 29.380, 47.990, "hotel", ["pool", "wifi", "gym", "spa", "restaurant", "parking"], [_room("DLX", "غرفة ديلوكس", "Deluxe room", [("BB", 78.0, True, "AT_WEB", 3), ("RO", 69.0, False, "AT_WEB", 4)])], "/media/hero/night-city-gold.jpg"),
    _hotel("kwi-symphony", "KWI", "سيمفوني ستايل", "Symphony Style Kuwait", 4, 8.6, 1100, "السالمية", "Salmiya", 6.4, 29.337, 48.076, "hotel", ["wifi", "gym", "restaurant", "parking"], [_room("STD", "غرفة قياسية", "Standard room", [("RO", 29.0, False, "AT_WEB", 9), ("BB", 34.5, True, "AT_WEB", 4)])]),
    _hotel("kwi-messilah", "KWI", "جميرا المسيلة", "Jumeirah Messilah", 5, 9.1, 760, "المسيلة", "Messilah", 11.0, 29.300, 48.100, "resort", ["pool", "wifi", "spa", "restaurant", "shuttle", "parking"], [_room("SEA", "غرفة بحرية", "Sea-view room", [("BB", 71.0, True, "AT_WEB", 3)])]),
    _hotel("ist-pears", "IST", "بيرا بالاس", "Pera Palace", 5, 9.3, 3200, "بيه أوغلو", "Beyoğlu", 1.1, 41.031, 28.974, "hotel", ["wifi", "restaurant", "spa"], [_room("HIS", "غرفة تاريخية", "Historic room", [("BB", 58.0, True, "AT_WEB", 2), ("RO", 51.0, False, "AT_HOTEL", 3)])], "/media/destinations/istanbul.jpg"),
    _hotel("ist-sultan", "IST", "شقق السلطان أحمد", "Sultanahmet apartment", 4, 8.7, 540, "الفاتح", "Fatih", 0.8, 41.006, 28.977, "apartment", ["wifi"], [_room("1BR", "شقة بإطلالة", "View apartment", [("RO", 33.0, True, "AT_WEB", 4)])]),
    _hotel("ist-bosphorus", "IST", "منتجع البوسفور", "Bosphorus resort", 5, 8.9, 410, "بشكتاش", "Beşiktaş", 4.6, 41.043, 29.007, "resort", ["pool", "wifi", "spa", "restaurant"], [_room("BOS", "غرفة بوسفور", "Bosphorus room", [("HB", 88.0, True, "AT_WEB", 2)])]),
    _hotel("ruh-kingdom", "RUH", "كينغدوم سنتر", "Kingdom Centre hotel", 5, 8.8, 1500, "العليا", "Olaya", 0.6, 24.711, 46.675, "hotel", ["pool", "wifi", "gym", "restaurant", "parking"], [_room("DLX", "غرفة ديلوكس", "Deluxe room", [("BB", 55.0, True, "AT_WEB", 5), ("RO", 48.0, False, "AT_WEB", 6)])], "/media/destinations/riyadh.jpg"),
    _hotel("ruh-apt", "RUH", "شقة العليا", "Olaya apartment", 4, 8.0, 220, "العليا", "Olaya", 1.4, 24.700, 46.685, "apartment", ["wifi", "parking"], [_room("1BR", "شقة غرفة واحدة", "One-bedroom apartment", [("RO", 27.5, True, "AT_WEB", 7)])]),
    _hotel("doh-museum", "DOH", "فندق مشيرب", "Msheireb hotel", 5, 9.1, 860, "مشيرب", "Msheireb", 0.9, 25.286, 51.528, "hotel", ["wifi", "gym", "spa", "restaurant", "parking"], [_room("DLX", "غرفة ديلوكس", "Deluxe room", [("BB", 67.0, True, "AT_WEB", 3)])], "/media/destinations/doha.jpg"),
    _hotel("doh-pearl", "DOH", "منتجع اللؤلؤة", "Pearl resort", 5, 8.5, 430, "اللؤلؤة", "The Pearl", 8.8, 25.368, 51.551, "resort", ["pool", "wifi", "spa", "shuttle"], [_room("SEA", "غرفة بحرية", "Sea room", [("HB", 79.0, True, "AT_HOTEL", 2)])]),
    _hotel("bah-gulf", "BAH", "الخليج البحرين", "Gulf Hotel Bahrain", 5, 8.7, 1900, "العدلية", "Adliya", 3.2, 26.216, 50.578, "hotel", ["pool", "wifi", "gym", "restaurant", "parking"], [_room("STD", "غرفة قياسية", "Standard room", [("BB", 41.0, True, "AT_WEB", 6), ("RO", 36.0, False, "AT_WEB", 8)])], "/media/destinations/bahrain.jpg"),
    _hotel("mct-opera", "MCT", "فندق الأوبرا مسقط", "Muscat opera hotel", 5, 9.0, 510, "الخوير", "Al Khuwair", 4.0, 23.593, 58.405, "hotel", ["pool", "wifi", "spa", "restaurant"], [_room("DLX", "غرفة ديلوكس", "Deluxe room", [("BB", 46.0, True, "AT_WEB", 4)])], "/media/destinations/muscat.jpg"),
    _hotel("cai-nile", "CAI", "نيل ريتز", "Nile Ritz", 5, 8.9, 2700, "وسط البلد", "Downtown", 0.5, 30.045, 31.232, "hotel", ["pool", "wifi", "gym", "spa", "restaurant"], [_room("NIL", "غرفة نيلية", "Nile room", [("BB", 39.0, True, "AT_WEB", 5), ("RO", 32.0, False, "AT_WEB", 7)])], "/media/offers/hotel.jpg"),
    _hotel("cdg-marais", "CDG", "لو ماريه", "Le Marais house", 4, 8.8, 980, "لو ماريه", "Le Marais", 2.4, 48.859, 2.362, "guest_house", ["wifi"], [_room("DBL", "غرفة مزدوجة", "Double room", [("BB", 74.0, True, "AT_WEB", 2)])], "/media/destinations/paris.jpg"),
    _hotel("lhr-cove", "LHR", "كوفت غاردن", "Covent stay", 4, 8.3, 1400, "كوفت غاردن", "Covent Garden", 1.8, 51.512, -0.124, "hotel", ["wifi", "restaurant"], [_room("STD", "غرفة قياسية", "Standard room", [("RO", 69.0, False, "AT_WEB", 4), ("BB", 78.0, True, "AT_WEB", 2)])], "/media/destinations/london.jpg"),
    _hotel("mle-water", "MLE", "فيلا الماء", "Water villa", 5, 9.5, 860, "أتول شمالي", "North Malé", 6.0, 4.210, 73.540, "resort", ["pool", "wifi", "spa", "shuttle", "restaurant"], [_room("VIL", "فيلا مائية", "Water villa", [("AI", 210.0, True, "AT_WEB", 2), ("BB", 160.0, True, "AT_WEB", 1)])], "/media/destinations/maldives.jpg"),
]

ACTIVITIES = [
    {"id": "dxb-desert", "destination": "DXB", "name_ar": "سفاري الصحراء", "name_en": "Desert safari", "price": 18.0, "hours": "6h", "image": "/media/offers/boat-sunset.jpg"},
    {"id": "dxb-frame", "destination": "DXB", "name_ar": "برواز دبي", "name_en": "Dubai Frame", "price": 7.5, "hours": "2h", "image": "/media/destinations/dubai.jpg"},
    {"id": "ist-cruise", "destination": "IST", "name_ar": "رحلة البوسفور", "name_en": "Bosphorus cruise", "price": 12.0, "hours": "2h", "image": "/media/destinations/istanbul.jpg"},
    {"id": "cai-museum", "destination": "CAI", "name_ar": "المتحف المصري", "name_en": "Egyptian Museum", "price": 9.0, "hours": "3h", "image": "/media/offers/hotel.jpg"},
    {"id": "cdg-seine", "destination": "CDG", "name_ar": "نزهة السين", "name_en": "Seine walk", "price": 14.0, "hours": "2h", "image": "/media/destinations/paris.jpg"},
    {"id": "mle-snorkel", "destination": "MLE", "name_ar": "غوص الشعاب", "name_en": "Reef snorkel", "price": 24.0, "hours": "4h", "image": "/media/destinations/maldives.jpg"},
    {"id": "kwi-towers", "destination": "KWI", "name_ar": "أبراج الكويت", "name_en": "Kuwait Towers", "price": 4.5, "hours": "1h", "image": "/media/hero/night-city-gold.jpg"},
    {"id": "doh-museum", "destination": "DOH", "name_ar": "متحف الفن الإسلامي", "name_en": "Museum of Islamic Art", "price": 6.0, "hours": "2h", "image": "/media/destinations/doha.jpg"},
]

TRANSFERS = [
    {"id": "sedan", "name_ar": "سيدان المطار", "name_en": "Airport sedan", "price": 12.0, "seats": 3},
    {"id": "van", "name_ar": "فان عائلي", "name_en": "Family van", "price": 18.0, "seats": 6},
    {"id": "coach", "name_ar": "حافلة صغيرة", "name_en": "Minibus", "price": 28.0, "seats": 12},
]

OFFERS = [
    {"title_ar": "دبي لعطلة قصيرة", "title_en": "A short Dubai break", "image": "/media/destinations/dubai.jpg", "href": "/hotels/results?destination=DXB"},
    {"title_ar": "طيران من الكويت", "title_en": "Flights from Kuwait", "image": "/media/offers/flight.jpg", "href": "/flights/results?origin=KWI&destination=DXB"},
    {"title_ar": "توصيل المطار", "title_en": "Airport transfer", "image": "/media/offers/transfer.jpg", "href": "/transfers/results?destination=DXB"},
]


def destination_by_code(code: str | None):
    if not code:
        return None
    wanted = code.strip().upper()
    for row in DESTINATIONS:
        if row["code"] == wanted:
            return row
    return None


def resolve_place(value: str | None):
    if not value:
        return None
    raw = value.strip()
    if not raw:
        return None
    code = raw.split("—")[0].split("-")[0].strip().upper()
    found = destination_by_code(code)
    if found:
        return found
    needle = raw.casefold()
    for row in DESTINATIONS:
        hay = " ".join(
            [row["code"], row["city_ar"], row["city_en"], row["country_ar"], row["country_en"]]
        ).casefold()
        if needle in hay or row["city_ar"] in raw:
            return row
    return None


def suggest_places(query: str, limit: int = 8):
    needle = (query or "").strip().casefold()
    rows = DESTINATIONS if not needle else []
    if needle:
        for row in DESTINATIONS:
            hay = " ".join(
                [row["code"], row["city_ar"], row["city_en"], row["country_ar"], row["country_en"]]
            ).casefold()
            if needle in hay:
                rows.append(row)
    return rows[:limit]
