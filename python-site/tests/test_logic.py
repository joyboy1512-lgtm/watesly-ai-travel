import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from weekendgate.assistant import reply
from weekendgate.money import format_kwd
from weekendgate.search import flight_price, search_flights, search_hotels, stay_price


class MoneyTests(unittest.TestCase):
    def test_latin_digits_and_code(self):
        text = format_kwd(45, "KWD")
        self.assertEqual(text, "45.000 KWD")
        self.assertTrue(text.isascii())

    def test_usd_conversion(self):
        self.assertEqual(format_kwd(10, "USD"), "32.60 USD")


class HotelSearchTests(unittest.TestCase):
    def test_destination_stars_and_breakfast_change_price(self):
        base = search_hotels({"destination": "DXB", "check_in": "2026-11-01", "check_out": "2026-11-04", "rooms": "1", "sort": "price"})
        self.assertGreaterEqual(len(base), 3)
        self.assertEqual(base[0]["nights"], 3)
        five = search_hotels({"destination": "DXB", "stars": ["5"], "check_in": "2026-11-01", "check_out": "2026-11-03"})
        self.assertTrue(all(row["hotel"]["stars"] == 5 for row in five))
        breakfast = search_hotels({"destination": "DXB", "breakfast": True, "sort": "price", "check_in": "2026-11-01", "check_out": "2026-11-02"})
        self.assertTrue(all(row["rate"]["board"] in {"BB", "HB", "FB", "AI"} for row in breakfast))

    def test_stay_multiplies_nights_and_rooms(self):
        priced = stay_price("dxb-rove", "std-bb", "2026-12-01", "2026-12-05", 2)
        self.assertIsNotNone(priced)
        self.assertEqual(priced["nights"], 4)
        self.assertEqual(priced["stay_kwd"], 36.0 * 4 * 2)

    def test_best_sort_uses_rating_and_price(self):
        rows = search_hotels({"destination": "MLE", "sort": "best", "check_in": "2026-11-01", "check_out": "2026-11-02"})
        self.assertEqual(rows[0]["hotel"]["id"], "mle-water")


class FlightSearchTests(unittest.TestCase):
    def test_direct_filter_and_cabin_factor(self):
        direct = search_flights({"origin": "KWI", "destination": "DXB", "stops": "0", "adults": "2", "cabin": "economy"})
        self.assertTrue(direct)
        self.assertTrue(all(row["stops"] == 0 for row in direct))
        business = flight_price(direct[0]["id"], "business", 2, 0)
        economy = flight_price(direct[0]["id"], "economy", 2, 0)
        self.assertAlmostEqual(business["total_kwd"], economy["total_kwd"] * 2.7)


class AssistantTests(unittest.TestCase):
    def test_arabic_hotel_request(self):
        answer = reply("ar", "فندق في دبي")
        self.assertIn("destination=DXB", answer["href"])


class ShopFlowTests(unittest.TestCase):
    def test_pages_search_book_and_dashboard(self):
        from fastapi.testclient import TestClient
        from weekendgate.app import app

        client = TestClient(app)
        home = client.get("/")
        self.assertEqual(home.status_code, 200)
        self.assertIn("WeekendGate", home.text)
        self.assertIn("سافر في نهاية الأسبوع", home.text)
        self.assertIn('href="/theme.css"', home.text)
        self.assertNotIn("shop.css", home.text)
        theme = client.get("/theme.css")
        self.assertEqual(theme.status_code, 200)
        self.assertIn("--navy: #001b35", theme.text)

        english = client.get("/", cookies={"wg_lang": "en"})
        self.assertIn("Leave this weekend", english.text)
        self.assertIn('<html lang="en" dir="ltr">', english.text)

        hotels = client.get("/hotels/results?destination=DXB&check_in=2026-11-01&check_out=2026-11-04&stars=5")
        self.assertEqual(hotels.status_code, 200)
        self.assertIn("162.000 KWD", hotels.text)
        self.assertIn("العنوان وسط دبي", hotels.text)
        self.assertNotIn("١٦٢", hotels.text)

        dollars = client.get(
            "/hotels/results?destination=DXB&check_in=2026-11-01&check_out=2026-11-02",
            cookies={"wg_currency": "USD", "wg_lang": "en"},
        )
        self.assertIn("USD", dollars.text)
        self.assertIn("Dubai", dollars.text)

        detail = client.get("/hotels/dxb-address?check_in=2026-11-01&check_out=2026-11-03&rooms=1")
        self.assertEqual(detail.status_code, 200)
        selected = client.post(
            "/select",
            data={
                "kind": "hotel",
                "hotel_id": "dxb-address",
                "rate_id": "dlx-ro",
                "check_in": "2026-11-01",
                "check_out": "2026-11-03",
                "rooms": "1",
                "adults": "2",
            },
            follow_redirects=False,
        )
        self.assertEqual(selected.status_code, 303)
        booked = client.post(
            "/book",
            cookies={"wg_draft": selected.cookies.get("wg_draft")},
            data={"guest_name": "سارة", "email": "sara@example.com", "phone": "90053224", "passport": "", "notes": ""},
            follow_redirects=False,
        )
        self.assertEqual(booked.status_code, 303)
        self.assertIn("/book/confirmation/WG-", booked.headers["location"])
        page = client.get(booked.headers["location"])
        self.assertIn("سارة", page.text)
        self.assertIn("KWD", page.text)

        denied = client.get("/dashboard", follow_redirects=False)
        self.assertEqual(denied.status_code, 303)
        staff = client.post("/dashboard/login", data={"email": "demo@watesly.travel", "password": "Demo1234!"}, follow_redirects=False)
        desk = client.get("/dashboard/bookings", cookies={"wg_staff": staff.cookies.get("wg_staff")})
        self.assertEqual(desk.status_code, 200)
        self.assertIn("WG-", desk.text)

        flights = client.get("/flights/results?origin=KWI&destination=DXB&stops=0&trip=one&adults=1&cabin=economy")
        self.assertEqual(flights.status_code, 200)
        self.assertIn("الجزيرة", flights.text)
        suggest = client.get("/api/suggest?q=دبي")
        self.assertEqual(suggest.json()[0]["code"], "DXB")


if __name__ == "__main__":
    unittest.main()
