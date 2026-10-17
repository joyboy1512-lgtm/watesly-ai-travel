import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from weekendgate.assistant import reply
from weekendgate.inventory import available, hotel_key, seed_stock, set_stock
from weekendgate.money import format_kwd
from weekendgate.search import flight_price, search_flights, search_hotels, stay_price
from weekendgate.store import init_db, set_setting


def setUpModule():
    init_db()
    seed_stock()
    set_stock("hotel:dxb-address:dlx-ro", 6)
    set_stock("hotel:dxb-rove:std-bb", 3)
    set_setting("markup_percent", "0")


def _csrf(client) -> str:
    if "wg_csrf" not in client.cookies:
        client.get("/")
    return client.cookies["wg_csrf"]


def _data(client, payload: dict) -> dict:
    body = dict(payload)
    body["csrf"] = _csrf(client)
    return body


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

        set_stock("hotel:dxb-address:dlx-ro", 6)
        set_setting("markup_percent", "0")
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
            data=_data(client, {
                "kind": "hotel",
                "hotel_id": "dxb-address",
                "rate_id": "dlx-ro",
                "check_in": "2026-11-01",
                "check_out": "2026-11-03",
                "rooms": "1",
                "adults": "2",
            }),
            follow_redirects=False,
        )
        self.assertEqual(selected.status_code, 303)
        booked = client.post(
            "/book",
            data=_data(client, {"guest_name": "سارة", "email": "sara@example.com", "phone": "90053224", "passport": "", "notes": ""}),
            follow_redirects=False,
        )
        self.assertEqual(booked.status_code, 303)
        self.assertIn("/book/confirmation/WG-", booked.headers["location"])
        page = client.get(booked.headers["location"])
        self.assertIn("سارة", page.text)
        self.assertIn("KWD", page.text)

        denied = client.get("/dashboard", follow_redirects=False)
        self.assertEqual(denied.status_code, 303)
        staff = client.post(
            "/dashboard/login",
            data=_data(client, {"email": "demo@watesly.travel", "password": "Demo1234!"}),
            follow_redirects=False,
        )
        desk = client.get("/dashboard/bookings", cookies={"wg_staff": staff.cookies.get("wg_staff")})
        self.assertEqual(desk.status_code, 200)
        self.assertIn("WG-", desk.text)

        flights = client.get("/flights/results?origin=KWI&destination=DXB&stops=0&trip=one&adults=1&cabin=economy")
        self.assertEqual(flights.status_code, 200)
        self.assertIn("الجزيرة", flights.text)
        suggest = client.get("/api/suggest?q=دبي")
        self.assertEqual(suggest.json()[0]["code"], "DXB")


class DevelopmentTests(unittest.TestCase):
    def test_post_without_csrf_is_rejected(self):
        from fastapi.testclient import TestClient
        from weekendgate.app import app

        client = TestClient(app)
        client.get("/")
        rejected = client.post("/select", data={"kind": "hotel"}, follow_redirects=False)
        self.assertEqual(rejected.status_code, 403)

    def test_child_supplement(self):
        priced = stay_price("dxb-rove", "std-bb", "2026-12-01", "2026-12-05", 1, 2)
        self.assertEqual(priced["stay_kwd"], 36.0 * 4 + 5.0 * 4 * 2)

    def test_markup_changes_price_then_resets(self):
        set_setting("markup_percent", "10")
        try:
            priced = stay_price("dxb-address", "dlx-ro", "2026-11-01", "2026-11-04", 1)
            self.assertEqual(priced["stay_kwd"], round(54.0 * 3 * 1.1, 3))
        finally:
            set_setting("markup_percent", "0")
        restored = stay_price("dxb-address", "dlx-ro", "2026-11-01", "2026-11-04", 1)
        self.assertEqual(restored["stay_kwd"], 162.0)

    def test_book_pay_and_cancel_restores_stock(self):
        from fastapi.testclient import TestClient
        from weekendgate.app import app

        key = hotel_key("dxb-address", "dlx-ro")
        set_stock(key, 6)
        set_setting("markup_percent", "0")
        client = TestClient(app)
        client.get("/")
        selected = client.post(
            "/select",
            data=_data(client, {
                "kind": "hotel",
                "hotel_id": "dxb-address",
                "rate_id": "dlx-ro",
                "check_in": "2026-11-01",
                "check_out": "2026-11-04",
                "rooms": "1",
                "adults": "2",
                "children": "0",
            }),
            follow_redirects=False,
        )
        self.assertEqual(selected.status_code, 303)
        booked = client.post(
            "/book",
            data=_data(client, {"guest_name": "منى", "email": "mona@example.com", "phone": "90053224"}),
            follow_redirects=False,
        )
        self.assertEqual(booked.status_code, 303)
        self.assertEqual(available(key), 5)
        location = booked.headers["location"]
        reference = location.split("/book/confirmation/")[1].split("?")[0]
        access = location.split("key=")[1]
        page = client.get(location)
        self.assertIn("بانتظار الدفع", page.text)
        self.assertIn("لا يتصل ببنك", page.text)
        paid = client.post(f"/book/pay/{reference}", data=_data(client, {"key": access}), follow_redirects=False)
        self.assertEqual(paid.status_code, 303)
        confirmed = client.get(paid.headers["location"])
        self.assertIn("مؤكد", confirmed.text)
        cancelled = client.post(f"/book/cancel/{reference}", data=_data(client, {"key": access}), follow_redirects=False)
        self.assertEqual(cancelled.status_code, 303)
        self.assertEqual(available(key), 6)
        closed = client.get(cancelled.headers["location"])
        self.assertIn("ملغى", closed.text)


if __name__ == "__main__":
    unittest.main()
