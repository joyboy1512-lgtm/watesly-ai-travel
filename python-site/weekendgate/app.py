"""FastAPI shop. Serves the Python edition only; it never calls the live site."""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from itsdangerous import BadSignature, URLSafeSerializer

from weekendgate import views
from weekendgate.assistant import reply as assistant_reply
from weekendgate.catalog import DESTINATIONS, OFFERS, suggest_places
from weekendgate.i18n import copy_for
from weekendgate.money import CURRENCIES, format_kwd
from weekendgate.search import (
    find_hotel,
    flight_price,
    hotel_facets,
    map_pins,
    nights_between,
    place_label,
    search_activities,
    search_flights,
    search_hotels,
    stay_price,
    transfer_quote,
)
from weekendgate.theme import THEME
from weekendgate.store import (
    add_traveler,
    all_bookings,
    all_customers,
    authenticate_customer,
    authenticate_staff,
    booking_by_reference,
    bookings_for_email,
    create_booking,
    customer_by_id,
    init_db,
    register_customer,
    travelers_for,
    update_customer,
)

ROOT = Path(__file__).resolve().parent
signer = URLSafeSerializer("weekendgate-python-local-demo")
MULTI = {"facility", "stars", "property", "meals"}

app = FastAPI(title="WeekendGate Python", docs_url=None, redoc_url=None)
app.mount("/static", StaticFiles(directory=str(ROOT / "static")), name="static")
app.mount("/brand", StaticFiles(directory=str(ROOT / "static" / "brand")), name="brand")
app.mount("/media", StaticFiles(directory=str(ROOT / "static" / "media")), name="media")
init_db()


def _dump(payload: dict) -> str:
    return signer.dumps(payload)


def _load(token: str | None) -> dict | None:
    if not token:
        return None
    try:
        value = signer.loads(token)
    except BadSignature:
        return None
    return value if isinstance(value, dict) else None


def _lang(request: Request) -> str:
    lang = request.cookies.get("wg_lang", "ar")
    return lang if lang in ("ar", "en") else "ar"


def _currency(request: Request) -> str:
    code = request.cookies.get("wg_currency", "KWD").upper()
    return code if code in CURRENCIES else "KWD"


def _customer(request: Request):
    payload = _load(request.cookies.get("wg_customer"))
    if not payload or "id" not in payload:
        return None
    return customer_by_id(int(payload["id"]))


def _staff(request: Request):
    payload = _load(request.cookies.get("wg_staff"))
    if not payload:
        return None
    return payload


def _ctx(request: Request, **extra):
    lang = _lang(request)
    currency = _currency(request)
    data = {
        "request": request,
        "lang": lang,
        "dir": "rtl" if lang == "ar" else "ltr",
        "currency": currency,
        "currencies": CURRENCIES,
        "c": copy_for(lang),
        "customer": _customer(request),
        "staff": _staff(request),
        "home": False,
        "money": lambda amount: format_kwd(float(amount or 0), currency),
        "year": date.today().year,
    }
    data.update(extra)
    return data


def _filters(request: Request) -> dict:
    raw = {}
    for key in request.query_params.keys():
        values = request.query_params.getlist(key)
        raw[key] = values if key in MULTI else values[-1]
    check_in, check_out = _default_dates()
    raw.setdefault("check_in", check_in)
    raw.setdefault("check_out", check_out)
    raw.setdefault("rooms", "1")
    raw.setdefault("adults", "2")
    raw.setdefault("children", "0")
    raw.setdefault("cabin", "economy")
    raw.setdefault("trip", "round")
    for key in ("facility", "stars", "property", "meals"):
        raw.setdefault(key, [])
        if isinstance(raw[key], str):
            raw[key] = [raw[key]]
    raw["breakfast"] = raw.get("breakfast") in ("1", "on", "true", True)
    raw["free_cancel"] = raw.get("free_cancel") in ("1", "on", "true", True)
    return raw


def _default_dates() -> tuple[str, str]:
    start = date.today() + timedelta(days=21)
    end = start + timedelta(days=3)
    return start.isoformat(), end.isoformat()


def _safe_next(value: str | None) -> str:
    if not value or not value.startswith("/") or value.startswith("//"):
        return "/"
    return value


def _set_cookie(response: RedirectResponse, key: str, value: str) -> None:
    response.set_cookie(key, value, max_age=60 * 60 * 24 * 30, httponly=True, samesite="lax")


def _quote(draft: dict, lang: str) -> dict | None:
    kind = draft.get("kind")
    if kind == "hotel":
        priced = stay_price(draft.get("hotel_id"), draft.get("rate_id"), draft.get("check_in"), draft.get("check_out"), int(draft.get("rooms") or 1))
        if not priced:
            return None
        hotel = priced["hotel"]
        name = hotel["name_en"] if lang == "en" else hotel["name_ar"]
        room = priced["room"]["name_en"] if lang == "en" else priced["room"]["name_ar"]
        board = copy_for(lang).get(f"board_{priced['rate']['board']}")
        return {
            "kind": "hotel",
            "title": name,
            "total_kwd": priced["stay_kwd"],
            "lines": [
                {"item": f"{room} · {board}", "qty": f"{priced['rooms']} × {priced['nights']}", "amount": priced["stay_kwd"]},
            ],
            "meta": priced,
        }
    if kind == "flight":
        outbound = flight_price(draft.get("outbound_id"), draft.get("cabin") or "economy", int(draft.get("adults") or 1), int(draft.get("children") or 0))
        if not outbound:
            return None
        total = outbound["total_kwd"]
        lines = [{"item": f"{outbound['origin']} → {outbound['destination']} {outbound['depart']}", "qty": outbound["passengers"], "amount": outbound["total_kwd"]}]
        back = None
        if draft.get("return_id"):
            back = flight_price(draft.get("return_id"), draft.get("cabin") or "economy", int(draft.get("adults") or 1), int(draft.get("children") or 0))
            if not back:
                return None
            total += back["total_kwd"]
            lines.append({"item": f"{back['origin']} → {back['destination']} {back['depart']}", "qty": back["passengers"], "amount": back["total_kwd"]})
        title = f"{outbound['origin']} → {outbound['destination']}"
        return {"kind": "flight", "title": title, "total_kwd": total, "lines": lines, "meta": {"outbound": outbound, "return": back}}
    if kind == "activity":
        rows, _place = search_activities(draft.get("destination"))
        activity = next((row for row in rows if row["id"] == draft.get("activity_id")), None)
        if not activity:
            return None
        pax = max(1, int(draft.get("adults") or 1))
        name = activity["name_en"] if lang == "en" else activity["name_ar"]
        return {"kind": "activity", "title": name, "total_kwd": activity["price"] * pax, "lines": [{"item": name, "qty": pax, "amount": activity["price"] * pax}], "meta": activity}
    if kind == "transfer":
        quotes = transfer_quote(draft.get("destination"), int(draft.get("adults") or 1), draft.get("transfer_id"))
        if not quotes:
            return None
        quote = quotes[0]
        name = quote["name_en"] if lang == "en" else quote["name_ar"]
        return {"kind": "transfer", "title": name, "total_kwd": quote["total_kwd"], "lines": [{"item": name, "qty": quote["cars"], "amount": quote["total_kwd"]}], "meta": quote}
    return None


@app.get("/health")
def health():
    return {"ok": True, "edition": "python", "design": "python", "live_site": False}


@app.get("/theme.css")
def theme_css():
    return Response(THEME, media_type="text/css")


@app.get("/api/suggest")
def suggest(q: str = ""):
    rows = []
    for place in suggest_places(q):
        rows.append({"code": place["code"], "city_ar": place["city_ar"], "city_en": place["city_en"]})
    return JSONResponse(rows)


@app.get("/preferences")
def preferences(request: Request, lang: str = "", currency: str = "", next: str = "/"):
    response = RedirectResponse(_safe_next(next), status_code=303)
    if lang in ("ar", "en"):
        _set_cookie(response, "wg_lang", lang)
    if currency.upper() in CURRENCIES:
        _set_cookie(response, "wg_currency", currency.upper())
    return response


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    check_in, check_out = _default_dates()
    return HTMLResponse(
        views.home_page(
            _ctx(request, home=True),
            DESTINATIONS,
            OFFERS,
            check_in,
            check_out,
            (date.fromisoformat(check_in) + timedelta(days=3)).isoformat(),
        )
    )


@app.get("/hotels/results", response_class=HTMLResponse)
def hotels_results(request: Request):
    filters = _filters(request)
    rows = search_hotels(filters) if filters.get("destination") else []
    return HTMLResponse(
        views.hotels_page(
            _ctx(request),
            filters,
            rows,
            hotel_facets(filters) if filters.get("destination") else None,
            map_pins(rows),
            place_label(filters.get("destination", ""), _lang(request)) if filters.get("destination") else "",
        )
    )


@app.get("/hotels/{hotel_id}", response_class=HTMLResponse)
def hotel_detail(request: Request, hotel_id: str):
    hotel = find_hotel(hotel_id)
    if not hotel:
        return RedirectResponse("/hotels/results", status_code=303)
    filters = _filters(request)
    nights = nights_between(filters.get("check_in"), filters.get("check_out"))
    rooms = max(1, int(filters.get("rooms") or 1))
    return HTMLResponse(
        views.hotel_detail_page(
            _ctx(request),
            hotel,
            filters,
            nights,
            rooms,
            place_label(hotel["destination"], _lang(request)),
        )
    )


@app.get("/flights/results", response_class=HTMLResponse)
def flights_results(request: Request):
    filters = _filters(request)
    rows = search_flights(filters) if filters.get("origin") and filters.get("destination") else []
    airlines = sorted({row["airline"] for row in search_flights({**filters, "airline": ""})}) if rows or filters.get("origin") else []
    return HTMLResponse(
        views.flights_page(
            _ctx(request),
            filters,
            rows,
            airlines,
            place_label(filters.get("origin", ""), _lang(request)),
            place_label(filters.get("destination", ""), _lang(request)),
        )
    )


@app.get("/flights/return", response_class=HTMLResponse)
def flights_return(request: Request, outbound_id: str):
    filters = _filters(request)
    outbound = flight_price(outbound_id, filters.get("cabin") or "economy", int(filters.get("adults") or 1), int(filters.get("children") or 0))
    if not outbound:
        return RedirectResponse("/flights/results", status_code=303)
    back_filters = dict(filters)
    back_filters["origin"] = outbound["destination"]
    back_filters["destination"] = outbound["origin"]
    rows = search_flights(back_filters)
    return HTMLResponse(views.return_page(_ctx(request), filters, outbound, rows))


@app.get("/activities/results", response_class=HTMLResponse)
def activities_results(request: Request):
    filters = _filters(request)
    rows, place = search_activities(filters.get("destination"))
    return HTMLResponse(views.activities_page(_ctx(request), filters, rows, place))


@app.get("/transfers/results", response_class=HTMLResponse)
def transfers_results(request: Request):
    filters = _filters(request)
    rows = transfer_quote(filters.get("destination"), int(filters.get("adults") or 1))
    return HTMLResponse(views.transfers_page(_ctx(request), filters, rows))


@app.post("/select")
async def select_trip(request: Request):
    form = await request.form()
    draft = {key: str(form.get(key) or "") for key in (
        "kind", "hotel_id", "rate_id", "check_in", "check_out", "rooms", "adults", "children",
        "outbound_id", "return_id", "cabin", "origin", "destination", "activity_id", "transfer_id", "trip",
    )}
    if not _quote(draft, _lang(request)):
        return RedirectResponse("/", status_code=303)
    response = RedirectResponse("/book", status_code=303)
    _set_cookie(response, "wg_draft", _dump(draft))
    return response


@app.get("/book", response_class=HTMLResponse)
def book_form(request: Request, error: str = ""):
    draft = _load(request.cookies.get("wg_draft"))
    quote = _quote(draft, _lang(request)) if draft else None
    customer = _customer(request)
    return HTMLResponse(views.book_page(_ctx(request), quote, error, customer))


@app.post("/book")
async def book_submit(
    request: Request,
    guest_name: str = Form(""),
    email: str = Form(""),
    phone: str = Form(""),
    passport: str = Form(""),
    notes: str = Form(""),
):
    draft = _load(request.cookies.get("wg_draft"))
    lang = _lang(request)
    quote = _quote(draft, lang) if draft else None
    if not quote or not guest_name.strip() or "@" not in email or not phone.strip():
        return HTMLResponse(views.book_page(_ctx(request), quote, "required", _customer(request)), status_code=400)
    if quote["kind"] == "flight" and len(passport.strip()) < 5:
        return HTMLResponse(views.book_page(_ctx(request), quote, "required", _customer(request)), status_code=400)
    details = {"lines": quote["lines"], "passport": passport.strip(), "notes": notes.strip(), "draft": draft}
    row = create_booking(guest_name, email, phone, quote["kind"], quote["title"], details, quote["total_kwd"])
    response = RedirectResponse(f"/book/confirmation/{row['reference']}", status_code=303)
    response.delete_cookie("wg_draft")
    return response


@app.get("/book/confirmation/{reference}", response_class=HTMLResponse)
def confirmation(request: Request, reference: str):
    row = booking_by_reference(reference)
    if not row:
        return RedirectResponse("/", status_code=303)
    import json
    details = json.loads(row["details_json"])
    return HTMLResponse(views.confirmation_page(_ctx(request), row, details))


@app.get("/account/login", response_class=HTMLResponse)
def login_form(request: Request, error: str = ""):
    return HTMLResponse(views.auth_page(_ctx(request), "login", error))


@app.post("/account/login")
def login_submit(email: str = Form(""), password: str = Form("")):
    row = authenticate_customer(email, password)
    if not row:
        return RedirectResponse("/account/login?error=1", status_code=303)
    response = RedirectResponse("/account", status_code=303)
    _set_cookie(response, "wg_customer", _dump({"id": row["id"]}))
    return response


@app.get("/account/register", response_class=HTMLResponse)
def register_form(request: Request, error: str = ""):
    return HTMLResponse(views.auth_page(_ctx(request), "register", error))


@app.post("/account/register")
def register_submit(name: str = Form(""), email: str = Form(""), phone: str = Form(""), password: str = Form("")):
    if not name.strip() or "@" not in email or len(password) < 8:
        return RedirectResponse("/account/register?error=1", status_code=303)
    try:
        row = register_customer(name, email, phone, password)
    except Exception:
        return RedirectResponse("/account/register?error=1", status_code=303)
    response = RedirectResponse("/account", status_code=303)
    _set_cookie(response, "wg_customer", _dump({"id": row["id"]}))
    return response


@app.post("/account/logout")
def account_logout():
    response = RedirectResponse("/", status_code=303)
    response.delete_cookie("wg_customer")
    return response


@app.get("/account", response_class=HTMLResponse)
def account(request: Request, saved: str = ""):
    customer = _customer(request)
    if not customer:
        return RedirectResponse("/account/login", status_code=303)
    return HTMLResponse(
        views.account_page(
            _ctx(request),
            bookings_for_email(customer["email"]),
            travelers_for(customer["id"]),
            saved,
        )
    )


@app.post("/account")
async def account_save(request: Request, name: str = Form(""), phone: str = Form("")):
    customer = _customer(request)
    if not customer:
        return RedirectResponse("/account/login", status_code=303)
    update_customer(customer["id"], name or customer["name"], phone)
    return RedirectResponse("/account?saved=1", status_code=303)


@app.post("/account/travelers")
async def account_traveler(request: Request, full_name: str = Form(""), passport: str = Form(""), dob: str = Form(""), nationality: str = Form("")):
    customer = _customer(request)
    if not customer:
        return RedirectResponse("/account/login", status_code=303)
    if full_name.strip():
        add_traveler(customer["id"], full_name, passport, dob, nationality)
    return RedirectResponse("/account", status_code=303)


@app.get("/dashboard/login", response_class=HTMLResponse)
def staff_login_form(request: Request, error: str = ""):
    return HTMLResponse(views.auth_page(_ctx(request), "staff", error))


@app.post("/dashboard/login")
def staff_login_submit(email: str = Form(""), password: str = Form("")):
    row = authenticate_staff(email, password)
    if not row:
        return RedirectResponse("/dashboard/login?error=1", status_code=303)
    response = RedirectResponse("/dashboard", status_code=303)
    _set_cookie(response, "wg_staff", _dump({"id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"]}))
    return response


@app.post("/dashboard/logout")
def staff_logout():
    response = RedirectResponse("/", status_code=303)
    response.delete_cookie("wg_staff")
    return response


@app.get("/dashboard", response_class=HTMLResponse)
@app.get("/dashboard/{panel}", response_class=HTMLResponse)
def dashboard(request: Request, panel: str = "overview"):
    if not _staff(request):
        return RedirectResponse("/dashboard/login", status_code=303)
    if panel not in ("overview", "bookings", "customers", "providers", "pricing"):
        panel = "overview"
    bookings = all_bookings()
    return HTMLResponse(
        views.dashboard_page(
            _ctx(request),
            panel,
            bookings,
            all_customers(),
            len(search_hotels({"destination": "DXB"})),
            len(search_flights({"origin": "KWI", "destination": "DXB"})),
        )
    )


@app.get("/assistant", response_class=HTMLResponse)
def assistant_page(request: Request, q: str = ""):
    answer = assistant_reply(_lang(request), q) if q else None
    return HTMLResponse(views.assistant_page(_ctx(request), q, answer))


@app.get("/offers", response_class=HTMLResponse)
def offers_page(request: Request):
    return HTMLResponse(views.offers_page(_ctx(request), OFFERS))


@app.get("/destinations", response_class=HTMLResponse)
def destinations_page(request: Request):
    return HTMLResponse(views.destinations_page(_ctx(request), DESTINATIONS))


PAGES = {
    "about": {
        "title": "about",
        "ar": [
            "WeekendGate واجهة الحجز التي تديرها شركة ترافل زون للسياحة والسفر في حولي.",
            "ترخيص سياحي 2015/2587. العنوان: حولي، شارع تونس، مجمع البحر سنتر، سرداب، مكتب ١٨.",
            "هذه النسخة مكتوبة ببايثون وتعرض البحث والأسعار والحجز على كتالوج محلي بنفس قواعد الترتيب والتصفية والعملة.",
        ],
        "en": [
            "WeekendGate is the booking front operated by Travel Zone Tourism & Travel in Hawally.",
            "Tourism licence 2015/2587. Address: Hawally, Tunisia St., Al Bahar Center, basement, office 18.",
            "This edition is written in Python and runs search, prices, and booking on a local catalogue with the same sort, filter, and currency rules.",
        ],
    },
    "policy": {
        "title": "policy",
        "ar": [
            "السعر المعروض هو إجمالي الإقامة أو الرحلة بالعملة التي تختارها، والأرقام تبقى لاتينية.",
            "الإلغاء المجاني يظهر فقط على الأسعار التي تحمل هذا الشرط في الكتالوج.",
            "بعض الفنادق تُدفع في مكان الإقامة، ويظهر ذلك بجانب سعر الغرفة.",
        ],
        "en": [
            "The shown price is the stay or trip total in the currency you pick. Digits stay Latin.",
            "Free cancellation appears only on rates that carry that condition in the catalogue.",
            "Some hotels are paid at the property, and that is shown beside the room price.",
        ],
    },
    "terms": {
        "title": "terms",
        "ar": [
            "الحجز في هذه النسخة يُحفظ محلياً على جهازك ولا يُرسل إلى موقع WeekendGate المنشور.",
            "أسماء المزوّدين مذكورة للشرح. لا تُستخدم مفاتيحهم ولا تُخصم أرصدتهم.",
        ],
        "en": [
            "A booking in this edition is stored on your machine and is not sent to the published WeekendGate site.",
            "Supplier names are shown for context. Their keys are not used and their balances are not charged.",
        ],
    },
    "privacy": {
        "title": "privacy",
        "ar": [
            "الاسم والبريد والهاتف ورقم الجواز تُحفظ في قاعدة SQLite داخل مجلد النسخة.",
            "لا يوجد إرسال خارجي. يمكنك حذف ملف weekendgate.sqlite لإزالة البيانات.",
        ],
        "en": [
            "Name, email, phone, and passport number are stored in a SQLite file inside this edition.",
            "Nothing is sent out. Delete weekendgate.sqlite to remove the data.",
        ],
    },
    "contact": {
        "title": "contact",
        "ar": [
            "الهاتف وواتساب: 90053224",
            "البريد: info@travelzone.tours",
            "الأحد–الخميس 9:00–18:00، والجمعة والسبت حسب الموسم.",
        ],
        "en": [
            "Phone and WhatsApp: 90053224",
            "Email: info@travelzone.tours",
            "Sun–Thu 9:00–18:00. Fri–Sat are seasonal.",
        ],
    },
    "faq": {
        "title": "faq",
        "ar": [
            "لماذا الأسعار بالإنجليزية؟ لأن المتجر يثبّت الأرقام اللاتينية ورمز العملة في كل اللغات.",
            "هل هذه النتائج حية من Hotelbeds؟ لا. الكتالوج محلي ويطبّق قواعد التصفية والسعر حتى تعمل النسخة بدون مفاتيح.",
            "كيف أبدّل اللغة؟ من أعلى الصفحة. الاتجاه والمحتوى يتبدلان معاً.",
        ],
        "en": [
            "Why are prices in English digits? The shop keeps Latin numerals and the currency code in every language.",
            "Are these live Hotelbeds results? No. The catalogue is local and applies the filter and price rules so the edition runs without keys.",
            "How do I switch language? From the top of the page. Direction and copy change together.",
        ],
    },
}


@app.get("/{page_name}", response_class=HTMLResponse)
def static_page(request: Request, page_name: str):
    page = PAGES.get(page_name)
    if not page:
        return RedirectResponse("/", status_code=303)
    lang = _lang(request)
    paragraphs = page["en"] if lang == "en" else page["ar"]
    return HTMLResponse(views.text_page(_ctx(request), copy_for(lang).get(page["title"]), paragraphs))
