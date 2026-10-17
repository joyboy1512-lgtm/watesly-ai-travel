"""Every screen of the Python trial is built here."""

from __future__ import annotations

from urllib.parse import quote

from weekendgate.catalog import DESTINATIONS
from weekendgate.inventory import available, hotel_key
from weekendgate.markup import esc
from weekendgate.pricing import CHILD_NIGHT_KWD, apply_markup, quote_stay


def _name(row: dict, lang: str, ar="name_ar", en="name_en") -> str:
    return row[en] if lang == "en" else row[ar]


def _city(row: dict, lang: str) -> str:
    return row["city_en"] if lang == "en" else row["city_ar"]


def _options(lang: str, selected: str) -> str:
    parts = []
    for place in DESTINATIONS:
        chosen = " selected" if place["code"] == selected else ""
        parts.append(f'<option value="{place["code"]}"{chosen}>{esc(_city(place, lang))}</option>')
    return "".join(parts)


def _shell(ctx: dict, body: str, title: str = "WeekendGate") -> str:
    c = ctx["c"]
    lang = ctx["lang"]
    path = ctx["request"].url.path
    query = ctx["request"].url.query
    nxt = path + (f"?{query}" if query else "")
    nav = [
        ("/", c.nav_home),
        ("/flights/results?origin=KWI&destination=DXB", c.nav_flights),
        ("/hotels/results?destination=DXB", c.nav_hotels),
        ("/activities/results?destination=DXB", c.nav_activities),
        ("/transfers/results?destination=DXB", c.nav_transfers),
        ("/offers", c.nav_offers),
        ("/destinations", c.nav_destinations),
        ("/assistant", c.nav_assistant),
    ]
    links = "".join(f'<a href="{href}">{esc(label)}</a>' for href, label in nav)
    currencies = "".join(
        f'<option value="{code}"{" selected" if code == ctx["currency"] else ""}>{code}</option>'
        for code in ctx["currencies"]
    )
    account = f'<a href="/account">{esc(c.nav_account)}</a>' if ctx["customer"] else f'<a href="/account/login">{esc(c.nav_login)}</a>'
    staff = f'<a href="/dashboard">{esc(c.nav_dashboard)}</a>' if ctx["staff"] else ""
    return f"""<!DOCTYPE html>
<html lang="{esc(lang)}" dir="{esc(ctx["dir"])}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)}</title>
  <link rel="stylesheet" href="/theme.css">
</head>
<body>
  <header class="top">
    <div class="top-row">
      <a class="brand" href="/" aria-label="WeekendGate"><img src="/brand/wg-lockup.png" alt="WeekendGate"></a>
      <nav class="nav" id="nav">{links}</nav>
      <div class="tools">
        <form action="/preferences" method="get">
          <input type="hidden" name="next" value="{esc(nxt)}">
          <select name="lang" aria-label="{esc(c.language)}" onchange="this.form.submit()">
            <option value="ar"{" selected" if lang == "ar" else ""}>العربية</option>
            <option value="en"{" selected" if lang == "en" else ""}>English</option>
          </select>
        </form>
        <form action="/preferences" method="get">
          <input type="hidden" name="next" value="{esc(nxt)}">
          <select name="currency" aria-label="{esc(c.currency)}" dir="ltr" onchange="this.form.submit()">{currencies}</select>
        </form>
        <a href="tel:+96590053224" dir="ltr">90053224</a>
        {account}{staff}
        <button type="button" onclick="document.getElementById('nav').classList.toggle('open')">☰</button>
      </div>
    </div>
  </header>
  <main>{body}</main>
  <footer class="foot">
    <div class="foot-in">
      <div><strong>WeekendGate</strong><p>{esc(c.legal_ar)}</p><p>{esc(c.license)} 2015/2587</p><p>{esc(c.footer_note)}</p></div>
      <div>
        <a href="/about">{esc(c.about)}</a><br>
        <a href="/faq">{esc(c.faq)}</a><br>
        <a href="/policy">{esc(c.policy)}</a><br>
        <a href="/terms">{esc(c.terms)}</a><br>
        <a href="/privacy">{esc(c.privacy)}</a><br>
        <a href="/contact">{esc(c.contact)}</a>
      </div>
      <div><div dir="ltr">90053224</div><a href="https://wa.me/96590053224">{esc(c.whatsapp)}</a><div>info@travelzone.tours</div><div>© {ctx["year"]} WeekendGate</div></div>
    </div>
  </footer>
</body>
</html>"""


def _field(label: str, control: str) -> str:
    return f'<label>{esc(label)}{control}</label>'


def _csrf(ctx: dict) -> str:
    return f'<input type="hidden" name="csrf" value="{esc(ctx.get("csrf") or "")}">'


def _status(c, status: str) -> str:
    key = {
        "confirmed": "status_confirmed",
        "pending": "status_pending",
        "cancelled": "status_cancelled",
        "pay_at_hotel": "status_pay_hotel",
    }.get(status or "", "status_pending")
    return c.get(key)


def home_page(ctx, destinations, offers, check_in, check_out, return_on) -> str:
    c = ctx["c"]
    lang = ctx["lang"]
    places = _options(lang, "DXB")
    from_places = _options(lang, "KWI")
    body = f"""
    <section class="hero" style="background-image:linear-gradient(180deg,rgba(0,27,53,.25),rgba(0,27,53,.55)),url('/media/hero/brand-city-flight.jpg')">
      <div class="hero-card">
        <h1>{esc(c.hero_title)}</h1>
        <p style="text-align:center;margin-top:0">{esc(c.hero_sub)}</p>
        <div class="tabs">
          <button type="button" class="on" data-tab="flights">{esc(c.tab_flights)}</button>
          <button type="button" data-tab="hotels">{esc(c.tab_hotels)}</button>
          <button type="button" data-tab="activities">{esc(c.tab_activities)}</button>
          <button type="button" data-tab="transfers">{esc(c.tab_transfers)}</button>
        </div>
        <form class="search" data-form="flights" action="/flights/results" method="get">
          {_field(c.get("from"), f'<select name="origin">{from_places}</select>')}
          {_field(c.to, f'<select name="destination">{places}</select>')}
          {_field(c.depart, f'<input type="date" name="depart" value="{esc(check_in)}" dir="ltr">')}
          {_field(c.get("return"), f'<input type="date" name="return_on" value="{esc(return_on)}" dir="ltr">')}
          {_field(c.cabin, f'<select name="cabin"><option value="economy">{esc(c.economy)}</option><option value="premium">{esc(c.premium)}</option><option value="business">{esc(c.business)}</option><option value="first">{esc(c.first)}</option></select>')}
          {_field(c.adults, '<input name="adults" type="number" min="1" max="9" value="1" dir="ltr">')}
          {_field(c.trip, f'<select name="trip"><option value="round">{esc(c.round_trip)}</option><option value="one">{esc(c.one_way)}</option></select>')}
          <button class="btn" type="submit">{esc(c.search)}</button>
        </form>
        <form class="search" data-form="hotels" action="/hotels/results" method="get" hidden>
          {_field(c.destination, f'<select name="destination">{places}</select>')}
          {_field(c.check_in, f'<input type="date" name="check_in" value="{esc(check_in)}" dir="ltr">')}
          {_field(c.check_out, f'<input type="date" name="check_out" value="{esc(check_out)}" dir="ltr">')}
          {_field(c.rooms, '<input name="rooms" type="number" min="1" max="5" value="1" dir="ltr">')}
          {_field(c.adults, '<input name="adults" type="number" min="1" max="8" value="2" dir="ltr">')}
          <button class="btn" type="submit">{esc(c.search)}</button>
        </form>
        <form class="search" data-form="activities" action="/activities/results" method="get" hidden>
          {_field(c.destination, f'<select name="destination">{places}</select>')}
          {_field(c.adults, '<input name="adults" type="number" min="1" value="2" dir="ltr">')}
          <button class="btn" type="submit">{esc(c.search)}</button>
        </form>
        <form class="search" data-form="transfers" action="/transfers/results" method="get" hidden>
          {_field(c.destination, f'<select name="destination">{places}</select>')}
          {_field(c.travelers, '<input name="adults" type="number" min="1" value="2" dir="ltr">')}
          <button class="btn" type="submit">{esc(c.search)}</button>
        </form>
      </div>
    </section>
    <div class="trust"><span>{esc(c.trust_1)}</span><span>{esc(c.trust_2)}</span><span>{esc(c.trust_3)}</span></div>
    <h2 class="section">{esc(c.destinations_title)}</h2>
    <div class="grid">{"".join(_dest_tile(item, lang) for item in destinations)}</div>
    <h2 class="section">{esc(c.offers_title)}</h2>
    <div class="grid">{"".join(_offer_tile(item, lang) for item in offers)}</div>
    <script>
      const tabs = document.querySelectorAll("[data-tab]");
      const forms = document.querySelectorAll("[data-form]");
      function show(id) {{
        forms.forEach((form) => {{ form.hidden = form.dataset.form !== id; }});
        tabs.forEach((tab) => tab.classList.toggle("on", tab.dataset.tab === id));
      }}
      tabs.forEach((tab) => tab.addEventListener("click", () => show(tab.dataset.tab)));
    </script>
    """
    return _shell(ctx, body, "WeekendGate")


def _dest_tile(item, lang) -> str:
    return f'<a class="tile" href="/hotels/results?destination={item["code"]}"><img src="{esc(item["image"])}" alt=""><strong>{esc(_city(item, lang))}</strong><p>{esc(item["country_en"] if lang == "en" else item["country_ar"])}</p></a>'


def _offer_tile(item, lang) -> str:
    title = item["title_en"] if lang == "en" else item["title_ar"]
    return f'<a class="tile" href="{esc(item["href"])}"><img src="{esc(item["image"])}" alt=""><strong>{esc(title)}</strong></a>'


def hotels_page(ctx, filters, rows, facets, pins, place) -> str:
    c = ctx["c"]
    lang = ctx["lang"]
    if not filters.get("destination"):
        return _shell(ctx, f'<div class="page"><p>{esc(c.need_destination)}</p></div>', c.nav_hotels)
    hidden = "".join(
        f'<input type="hidden" name="{key}" value="{esc(filters.get(key) or "")}">'
        for key in ("destination", "check_in", "check_out", "rooms", "adults", "children")
    )
    hidden += f'<input type="hidden" name="sort" value="{esc(filters.get("sort") or "best")}">'
    stars = []
    for level in ("5", "4", "3"):
        checked = " checked" if level in filters["stars"] else ""
        count = facets["stars"][level] if facets else 0
        stars.append(f'<label class="check"><input type="checkbox" name="stars" value="{level}"{checked}><span dir="ltr">{level}</span><b dir="ltr">{count}</b></label>')
    facilities = []
    for key in ("pool", "wifi", "parking", "gym", "spa", "restaurant", "shuttle"):
        checked = " checked" if key in filters["facility"] else ""
        count = facets["facilities"][key] if facets else 0
        facilities.append(f'<label class="check"><input type="checkbox" name="facility" value="{key}"{checked}><span>{esc(c.get(key))}</span><b dir="ltr">{count}</b></label>')
    properties = []
    for key in ("hotel", "apartment", "resort", "guest_house"):
        checked = " checked" if key in filters["property"] else ""
        properties.append(f'<label class="check"><input type="checkbox" name="property" value="{key}"{checked}><span>{esc(c.get(key))}</span></label>')
    sorts = []
    for key, label in (("best", c.sort_best), ("price", c.sort_price), ("price_desc", c.sort_price_desc), ("rating", c.sort_rating), ("distance", c.sort_distance)):
        href = _keep("/hotels/results", filters, sort=key)
        on = " class=\"on\"" if (filters.get("sort") or "best") == key else ""
        sorts.append(f'<a{on} href="{esc(href)}">{esc(label)}</a>')
    pin_html = "".join(
        f'<a class="pin" style="left:{min(88, max(12, pin["x"] + (index % 3) * 8))}%;top:{min(78, max(18, pin["y"] + (index % 4) * 12))}%" href="#hotel-{esc(pin["id"])}" dir="ltr">{index + 1}</a>'
        for index, pin in enumerate(pins)
    )
    cards = "".join(_hotel_card(ctx, row, filters) for row in rows) or f'<p>{esc(c.no_results)}</p>'
    free_checked = " checked" if filters["free_cancel"] else ""
    breakfast_checked = " checked" if filters["breakfast"] else ""
    body = f"""
    <section class="wrap">
      <h1>{esc(c.nav_hotels)} — {esc(place)}</h1>
      <p class="note">{esc(c.catalog_note)}</p>
    </section>
    <div class="results">
      <aside class="side">
        <div class="map" style="background-image:url('/media/hero/brand-blue-hour.jpg')" aria-label="{esc(c.map)}">{pin_html}</div>
        <form class="filters" action="/hotels/results" method="get">
          {hidden}
          <div class="filters-head"><h3>{esc(c.filters)}</h3><a href="/hotels/results?destination={esc(filters["destination"])}&check_in={esc(filters["check_in"])}&check_out={esc(filters["check_out"])}">{esc(c.clear)}</a></div>
          <label class="field">{esc(c.hotel_name)}<input name="q" value="{esc(filters.get("q") or "")}"></label>
          <strong>{esc(c.stars)}</strong>{"".join(stars)}
          <label class="check"><input type="checkbox" name="free_cancel" value="1"{free_checked}><span>{esc(c.free_cancel)}</span><b dir="ltr">{facets["free_cancel"] if facets else 0}</b></label>
          <label class="check"><input type="checkbox" name="breakfast" value="1"{breakfast_checked}><span>{esc(c.breakfast)}</span><b dir="ltr">{facets["breakfast"] if facets else 0}</b></label>
          <strong>{esc(c.facilities)}</strong>{"".join(facilities)}
          <strong>{esc(c.property)}</strong>{"".join(properties)}
          <label class="field">{esc(c.max_price)}<input name="max_price" dir="ltr" value="{esc(filters.get("max_price") or "")}"></label>
          <label class="field">{esc(c.distance)}<input name="max_km" dir="ltr" value="{esc(filters.get("max_km") or "")}"></label>
          <button class="btn" type="submit">{esc(c.apply)}</button>
        </form>
      </aside>
      <div>
        <div class="sort">{"".join(sorts)}<span dir="ltr">{len(rows)}</span></div>
        {cards}
      </div>
    </div>
    """
    return _shell(ctx, body, c.nav_hotels)


def _keep(path: str, filters: dict, **updates) -> str:
    merged = dict(filters)
    merged.update(updates)
    pairs = []
    for key, value in merged.items():
        if value in (None, "", False):
            continue
        if isinstance(value, list):
            for item in value:
                pairs.append(f"{quote(str(key))}={quote(str(item))}")
        else:
            pairs.append(f"{quote(str(key))}={quote(str(value))}")
    return path + ("?" + "&".join(pairs) if pairs else "")


def _hotel_card(ctx, row, filters) -> str:
    c = ctx["c"]
    lang = ctx["lang"]
    hotel = row["hotel"]
    href = _keep(f"/hotels/{hotel['id']}", filters)
    chips = []
    if row["rate"]["refundable"]:
        chips.append(f'<span class="chip good">{esc(c.free_cancel)}</span>')
    if row["rate"]["board"] in {"BB", "HB", "FB", "AI"}:
        chips.append(f'<span class="chip">{esc(c.breakfast)}</span>')
    facilities = " · ".join(esc(c.get(item)) for item in hotel["facilities"][:4])
    highlight = f'<span class="chip">{esc(c.get(row["highlight"]))}</span>' if row["highlight"] else ""
    room = row["room"]["name_en"] if lang == "en" else row["room"]["name_ar"]
    zone = hotel["zone_en"] if lang == "en" else hotel["zone_ar"]
    return f"""
    <article class="hotel-card" id="hotel-{esc(hotel["id"])}">
      <a href="{esc(href)}"><img class="photo" src="{esc(hotel["image"])}" alt=""></a>
      <div class="hotel-main">
        {highlight}
        <h2 style="margin:0"><a href="{esc(href)}">{esc(_name(hotel, lang))}</a></h2>
        <div class="stars" dir="ltr">{"★" * hotel["stars"]}</div>
        <div><strong class="score" dir="ltr">{hotel["review"]:.1f}</strong> {esc(c.score)} <span dir="ltr">{hotel["reviews"]}</span></div>
        <div>{esc(zone)} · <span dir="ltr">{hotel["distance_km"]:.1f} {esc(c.km)}</span></div>
        <div>{"".join(chips)}</div>
        <div>{facilities}</div>
      </div>
      <div class="hotel-price">
        <div class="stay">
          <span>{esc(c.per_stay)} · <span dir="ltr">{row["nights"]}</span> {esc(c.nights)}</span>
          <strong dir="ltr">{esc(ctx["money"](row["stay_kwd"]))}</strong>
        </div>
        <span class="good" dir="ltr">{row["rate"]["allotment"]} {esc(c.rooms_left)}</span>
        <div>{esc(room)}</div>
        <a class="btn" href="{esc(href)}">{esc(c.details)}</a>
      </div>
    </article>
    """


def hotel_detail_page(ctx, hotel, filters, nights, rooms, place) -> str:
    c = ctx["c"]
    lang = ctx["lang"]
    rates = []
    for room in hotel["rooms"]:
        for rate in room["rates"]:
            room_name = room["name_en"] if lang == "en" else room["name_ar"]
            pay = c.pay_hotel if rate["payment"] == "AT_HOTEL" else c.pay_now
            cancel = c.free_cancel if rate["refundable"] else c.nonrefundable
            children = int(filters.get("children") or 0)
            live = available(hotel_key(hotel["id"], rate["id"]))
            qty = rate["allotment"] if live is None else live
            amount = quote_stay(rate["price"], nights, rooms, children)
            if qty < rooms:
                action = f'<p class="note">{esc(c.sold_out)}</p>'
            else:
                action = f"""
                <form action="/select" method="post">
                  {_csrf(ctx)}
                  <input type="hidden" name="kind" value="hotel">
                  <input type="hidden" name="hotel_id" value="{esc(hotel["id"])}">
                  <input type="hidden" name="rate_id" value="{esc(rate["id"])}">
                  <input type="hidden" name="check_in" value="{esc(filters["check_in"])}">
                  <input type="hidden" name="check_out" value="{esc(filters["check_out"])}">
                  <input type="hidden" name="rooms" value="{rooms}">
                  <input type="hidden" name="adults" value="{esc(filters["adults"])}">
                  <input type="hidden" name="children" value="{children}">
                  <button class="btn" type="submit">{esc(c.select)}</button>
                </form>"""
            child_note = f'<div>{esc(c.child_fee)} <span dir="ltr">{CHILD_NIGHT_KWD:.3f} KWD</span></div>' if children else ""
            rates.append(f"""
            <div class="flight">
              <div><strong>{esc(room_name)}</strong><div>{esc(c.get("board_" + rate["board"]))}</div><div>{esc(cancel)} · {esc(pay)}</div><div dir="ltr">{qty} {esc(c.rooms_left)}</div></div>
              <div class="stay"><strong dir="ltr">{esc(ctx["money"](amount))}</strong>
                {child_note}
                {action}
              </div>
            </div>""")
    facilities = " ".join(f'<span class="chip">{esc(c.get(item))}</span>' for item in hotel["facilities"])
    body = f"""
    <article class="page panel">
      <p><a href="/hotels/results?destination={esc(hotel["destination"])}&check_in={esc(filters["check_in"])}&check_out={esc(filters["check_out"])}&rooms={esc(filters["rooms"])}">{esc(c.back)}</a></p>
      <img src="{esc(hotel["image"])}" alt="" style="width:100%;max-height:320px;object-fit:cover;border-radius:12px">
      <h1>{esc(_name(hotel, lang))}</h1>
      <p><strong class="score" dir="ltr">{hotel["review"]:.1f}</strong> {esc(place)} · {esc(hotel["zone_en"] if lang == "en" else hotel["zone_ar"])}</p>
      <p>{facilities}</p>
      <h2>{esc(c.room_rates)}</h2>
      <p dir="ltr">{esc(filters["check_in"])} → {esc(filters["check_out"])} · {nights} {esc(c.nights)} · {rooms} {esc(c.rooms)}</p>
      {"".join(rates)}
    </article>
    """
    return _shell(ctx, body, _name(hotel, lang))


def flights_page(ctx, filters, rows, airlines, origin_label, dest_label) -> str:
    c = ctx["c"]
    lang = ctx["lang"]
    if not (filters.get("origin") and filters.get("destination")):
        return _shell(ctx, f'<div class="page"><p>{esc(c.need_destination)}</p></div>', c.nav_flights)
    cabin = "".join(
        f'<option value="{key}"{" selected" if filters.get("cabin") == key else ""}>{esc(c.get(key))}</option>'
        for key in ("economy", "premium", "business", "first")
    )
    airline_options = '<option value="">' + esc(c.any) + "</option>" + "".join(
        f'<option value="{code}"{" selected" if filters.get("airline") == code else ""}>{code}</option>' for code in airlines
    )
    cards = []
    for row in rows:
        airline = row["airline_en"] if lang == "en" else row["airline_ar"]
        stop = c.direct if row["stops"] == 0 else c.stop
        refund = c.refundable if row["refundable"] else c.nonrefundable
        if filters.get("trip") == "round":
            action = f"""
            <form action="/flights/return" method="get">
              <input type="hidden" name="outbound_id" value="{esc(row["id"])}">
              <input type="hidden" name="origin" value="{esc(filters["origin"])}">
              <input type="hidden" name="destination" value="{esc(filters["destination"])}">
              <input type="hidden" name="cabin" value="{esc(filters["cabin"])}">
              <input type="hidden" name="adults" value="{esc(filters["adults"])}">
              <input type="hidden" name="children" value="{esc(filters["children"])}">
              <input type="hidden" name="trip" value="round">
              <button class="btn" type="submit">{esc(c.pick_return)}</button>
            </form>"""
        else:
            action = f"""
            <form action="/select" method="post">
              {_csrf(ctx)}
              <input type="hidden" name="kind" value="flight">
              <input type="hidden" name="outbound_id" value="{esc(row["id"])}">
              <input type="hidden" name="cabin" value="{esc(filters["cabin"])}">
              <input type="hidden" name="adults" value="{esc(filters["adults"])}">
              <input type="hidden" name="children" value="{esc(filters["children"])}">
              <input type="hidden" name="origin" value="{esc(row["origin"])}">
              <input type="hidden" name="destination" value="{esc(row["destination"])}">
              <button class="btn" type="submit">{esc(c.select)}</button>
            </form>"""
        cards.append(f"""
        <article class="flight">
          <div><strong>{esc(airline)}</strong> <span dir="ltr">{esc(row["airline"])}</span>
            <div class="times" dir="ltr"><span>{esc(row["depart"])}</span><span>{esc(row["arrive"])}</span></div>
            <div dir="ltr">{esc(row["origin"])} → {esc(row["destination"])} · {row["minutes"]} {esc(c.duration)}</div>
          </div>
          <div>{esc(stop)} · {esc(c.baggage)} <span dir="ltr">{esc(row["baggage"])}</span> · {esc(c.get(row["cabin"]))} · {esc(refund)}</div>
          <div class="stay"><strong dir="ltr">{esc(ctx["money"](row["total_kwd"]))}</strong><div>{esc(c.per_person)}</div>{action}</div>
        </article>""")
    body = f"""
    <section class="wrap">
      <h1>{esc(c.nav_flights)} — {esc(origin_label)} → {esc(dest_label)}</h1>
      <p class="note">{esc(c.catalog_note)}</p>
      <form class="search" action="/flights/results" method="get">
        <input type="hidden" name="origin" value="{esc(filters["origin"])}">
        <input type="hidden" name="destination" value="{esc(filters["destination"])}">
        <input type="hidden" name="depart" value="{esc(filters.get("depart") or filters.get("check_in"))}">
        <input type="hidden" name="return_on" value="{esc(filters.get("return_on") or "")}">
        <input type="hidden" name="trip" value="{esc(filters.get("trip"))}">
        <input type="hidden" name="adults" value="{esc(filters.get("adults"))}">
        <input type="hidden" name="children" value="{esc(filters.get("children"))}">
        {_field(c.cabin, f"<select name='cabin'>{cabin}</select>")}
        {_field(c.stops, f'<select name="stops"><option value="any">{esc(c.any)}</option><option value="0"{" selected" if filters.get("stops") == "0" else ""}>{esc(c.direct)}</option><option value="1"{" selected" if filters.get("stops") == "1" else ""}>{esc(c.stop)}</option></select>')}
        {_field(c.airline, f"<select name='airline'>{airline_options}</select>")}
        {_field(c.sort, f'<select name="sort"><option value="price">{esc(c.sort_price)}</option><option value="duration"{" selected" if filters.get("sort") == "duration" else ""}>{esc(c.sort_duration)}</option><option value="depart"{" selected" if filters.get("sort") == "depart" else ""}>{esc(c.sort_depart)}</option></select>')}
        <button class="btn" type="submit">{esc(c.apply)}</button>
      </form>
      <p dir="ltr">{len(rows)}</p>
      {"".join(cards) or f"<p>{esc(c.no_results)}</p>"}
    </section>
    """
    return _shell(ctx, body, c.nav_flights)


def return_page(ctx, filters, outbound, rows) -> str:
    c = ctx["c"]
    lang = ctx["lang"]
    cards = []
    for row in rows:
        airline = row["airline_en"] if lang == "en" else row["airline_ar"]
        cards.append(f"""
        <article class="flight">
          <div><strong>{esc(airline)}</strong><div class="times" dir="ltr"><span>{esc(row["depart"])}</span><span>{esc(row["arrive"])}</span></div><div dir="ltr">{esc(row["origin"])} → {esc(row["destination"])}</div></div>
          <div>{esc(c.direct if row["stops"] == 0 else c.stop)}</div>
          <div class="stay"><strong dir="ltr">{esc(ctx["money"](outbound["total_kwd"] + row["total_kwd"]))}</strong>
            <form action="/select" method="post">
              {_csrf(ctx)}
              <input type="hidden" name="kind" value="flight">
              <input type="hidden" name="outbound_id" value="{esc(outbound["id"])}">
              <input type="hidden" name="return_id" value="{esc(row["id"])}">
              <input type="hidden" name="cabin" value="{esc(filters["cabin"])}">
              <input type="hidden" name="adults" value="{esc(filters["adults"])}">
              <input type="hidden" name="children" value="{esc(filters["children"])}">
              <input type="hidden" name="origin" value="{esc(outbound["origin"])}">
              <input type="hidden" name="destination" value="{esc(outbound["destination"])}">
              <button class="btn" type="submit">{esc(c.select)}</button>
            </form>
          </div>
        </article>""")
    body = f"""
    <section class="wrap">
      <h1>{esc(c.pick_return)}</h1>
      <article class="panel"><strong>{esc(c.outbound)}</strong><div class="times" dir="ltr"><span>{esc(outbound["depart"])}</span><span>{esc(outbound["arrive"])}</span></div><div dir="ltr">{esc(outbound["origin"])} → {esc(outbound["destination"])} · {esc(ctx["money"](outbound["total_kwd"]))}</div></article>
      {"".join(cards) or f"<p>{esc(c.no_results)}</p>"}
    </section>
    """
    return _shell(ctx, body, c.pick_return)


def activities_page(ctx, filters, rows, place) -> str:
    c = ctx["c"]
    lang = ctx["lang"]
    title = c.nav_activities + (f" — {_city(place, lang)}" if place else "")
    cards = []
    for row in rows:
        cards.append(f"""
        <article class="tile"><img src="{esc(row["image"])}" alt=""><strong>{esc(_name(row, lang))}</strong>
          <p dir="ltr">{esc(row["hours"])} · {esc(ctx["money"](apply_markup(row["price"])))} {esc(c.per_person)}</p>
          <form action="/select" method="post" style="margin:0 12px 12px">
            {_csrf(ctx)}
            <input type="hidden" name="kind" value="activity">
            <input type="hidden" name="activity_id" value="{esc(row["id"])}">
            <input type="hidden" name="destination" value="{esc(row["destination"])}">
            <input type="hidden" name="adults" value="{esc(filters["adults"])}">
            <button class="btn" type="submit">{esc(c.select)}</button>
          </form>
        </article>""")
    body = f'<section class="wrap"><h1>{esc(title)}</h1><div class="grid">{"".join(cards) or esc(c.no_results)}</div></section>'
    return _shell(ctx, body, c.nav_activities)


def transfers_page(ctx, filters, rows) -> str:
    c = ctx["c"]
    lang = ctx["lang"]
    cards = []
    for row in rows:
        cards.append(f"""
        <article class="flight">
          <div><strong>{esc(_name(row, lang))}</strong><div>{esc(c.vehicle)} · <span dir="ltr">{row["seats"]} {esc(c.pax)}</span></div><div>{esc(_city(row["place"], lang))}</div></div>
          <div dir="ltr">× {row["cars"]}</div>
          <div class="stay"><strong dir="ltr">{esc(ctx["money"](row["total_kwd"]))}</strong>
            <form action="/select" method="post">
              {_csrf(ctx)}
              <input type="hidden" name="kind" value="transfer">
              <input type="hidden" name="transfer_id" value="{esc(row["id"])}">
              <input type="hidden" name="destination" value="{esc(row["place"]["code"])}">
              <input type="hidden" name="adults" value="{esc(filters["adults"])}">
              <button class="btn" type="submit">{esc(c.select)}</button>
            </form>
          </div>
        </article>""")
    return _shell(ctx, f'<section class="wrap"><h1>{esc(c.nav_transfers)}</h1>{"".join(cards)}</section>', c.nav_transfers)


def _lines(ctx, lines) -> str:
    c = ctx["c"]
    rows = "".join(
        f'<tr><td>{esc(line["item"])}</td><td dir="ltr">{esc(line["qty"])}</td><td dir="ltr">{esc(ctx["money"](line["amount"]))}</td></tr>'
        for line in lines
    )
    return f'<table class="table"><thead><tr><th>{esc(c.item)}</th><th>{esc(c.qty)}</th><th>{esc(c.amount)}</th></tr></thead><tbody>{rows}</tbody></table>'


def book_page(ctx, quote, error, prefill, travelers=None) -> str:
    c = ctx["c"]
    if not quote:
        return _shell(ctx, f'<div class="page"><p>{esc(c.need_destination)}</p><a class="btn" href="/">{esc(c.nav_home)}</a></div>', c.book)
    name = prefill["name"] if prefill else ""
    email = prefill["email"] if prefill else ""
    phone = prefill["phone"] if prefill else ""
    passport = " required minlength=\"5\"" if quote["kind"] == "flight" else ""
    messages = {"required": c.required, "sold_out": c.sold_out, "forbidden": c.forbidden}
    err = f'<p class="note">{esc(messages.get(error, c.required))}</p>' if error else ""
    options = ""
    for person in travelers or []:
        options += (
            f'<option value="{esc(person["full_name"])}" data-passport="{esc(person["passport"] or "")}">'
            f'{esc(person["full_name"])}</option>'
        )
    picker = ""
    if options:
        picker = f"""
        <label class="field">{esc(c.saved_travelers)}
          <select id="traveler-pick"><option value="">{esc(c.any)}</option>{options}</select>
        </label>
        <script>
          document.getElementById("traveler-pick").addEventListener("change", function (event) {{
            var option = event.target.selectedOptions[0];
            if (!option || !option.value) return;
            var name = document.querySelector("[name=guest_name]");
            var passport = document.querySelector("[name=passport]");
            if (name) name.value = option.value;
            if (passport && option.dataset.passport) passport.value = option.dataset.passport;
          }});
        </script>"""
    body = f"""
    <section class="page">
      <h1>{esc(c.book)}</h1>
      <article class="panel"><h2>{esc(quote["title"])}</h2>{_lines(ctx, quote["lines"])}<p><strong>{esc(c.total)}</strong> <span dir="ltr">{esc(ctx["money"](quote["total_kwd"]))}</span></p><p>{esc(c.includes_tax)}</p></article>
      {err}
      <form class="panel" method="post" action="/book">
        {_csrf(ctx)}
        {picker}
        <label class="field">{esc(c.guest_name)}<input name="guest_name" required value="{esc(name)}"></label>
        <label class="field">{esc(c.email)}<input name="email" type="email" required dir="ltr" value="{esc(email)}"></label>
        <label class="field">{esc(c.phone)}<input name="phone" required dir="ltr" value="{esc(phone)}"></label>
        <label class="field">{esc(c.passport)}<input name="passport" dir="ltr"{passport}></label>
        <label class="field">{esc(c.notes)}<textarea name="notes"></textarea></label>
        <button class="btn" type="submit">{esc(c.confirm)}</button>
      </form>
    </section>
    """
    return _shell(ctx, body, c.book)


def confirmation_page(ctx, booking, details, access_key: str = "") -> str:
    c = ctx["c"]
    status = booking["status"]
    heading = c.confirmed if status in ("confirmed", "pay_at_hotel") else _status(c, status)
    pay = ""
    if status == "pending":
        pay = f"""
        <p class="note">{esc(c.payment_note)}</p>
        <form method="post" action="/book/pay/{esc(booking["reference"])}">
          {_csrf(ctx)}
          <input type="hidden" name="key" value="{esc(access_key)}">
          <button class="btn" type="submit">{esc(c.record_payment)}</button>
        </form>"""
    cancel = ""
    if status != "cancelled":
        cancel = f"""
        <form method="post" action="/book/cancel/{esc(booking["reference"])}">
          {_csrf(ctx)}
          <input type="hidden" name="key" value="{esc(access_key)}">
          <button class="btn small" type="submit">{esc(c.cancel_booking)}</button>
        </form>"""
    body = f"""
    <article class="page panel">
      <h1>{esc(heading)}</h1>
      <p>{esc(c.reference)} <strong dir="ltr">{esc(booking["reference"])}</strong></p>
      <p>{esc(booking["title"])}</p>
      <p>{esc(booking["guest_name"])} · <span dir="ltr">{esc(booking["phone"])}</span></p>
      <p dir="ltr">{esc(booking["created_at"])}</p>
      {_lines(ctx, details["lines"])}
      <p><strong>{esc(c.total)}</strong> <span dir="ltr">{esc(ctx["money"](booking["total_kwd"]))}</span> · {esc(_status(c, status))}</p>
      {pay}
      {cancel}
      <button class="btn" type="button" onclick="window.print()">{esc(c.print)}</button>
    </article>
    """
    return _shell(ctx, body, booking["reference"])


def auth_page(ctx, mode, error) -> str:
    c = ctx["c"]
    err = f'<p class="note">{esc(c.login_bad)}</p>' if error else ""
    if mode == "staff":
        heading = c.staff_login
        action = "/dashboard/login"
        extra = f'<p class="note" dir="ltr">{esc(c.demo_hint)}</p>'
        fields = ""
        button = c.nav_login
        links = ""
    elif mode == "register":
        heading = c.nav_register
        action = "/account/register"
        extra = ""
        fields = f'<label class="field">{esc(c.name)}<input name="name" required></label><label class="field">{esc(c.phone)}<input name="phone" dir="ltr"></label>'
        button = c.create
        links = f'<p><a href="/account/login">{esc(c.have_account)}</a></p>'
    else:
        heading = c.customer_login
        action = "/account/login"
        extra = f'<p class="note" dir="ltr">{esc(c.guest_hint)}</p>'
        fields = ""
        button = c.nav_login
        links = f'<p><a href="/account/register">{esc(c.no_account)}</a></p>'
    body = f"""
    <section class="page panel">
      <h1>{esc(heading)}</h1>{extra}{err}
      <form method="post" action="{action}">
        {_csrf(ctx)}
        {fields}
        <label class="field">{esc(c.email)}<input name="email" type="email" required dir="ltr"></label>
        <label class="field">{esc(c.password)}<input name="password" type="password" required></label>
        <button class="btn" type="submit">{esc(button)}</button>
      </form>
      {links}
    </section>
    """
    return _shell(ctx, body, heading)


def account_page(ctx, bookings, travelers, saved) -> str:
    c = ctx["c"]
    customer = ctx["customer"]
    saved_note = f'<p class="note">{esc(c.saved)}</p>' if saved else ""
    booking_rows = []
    for row in bookings:
        key = row["access_key"] or ""
        href = f"/book/confirmation/{row['reference']}" + (f"?key={quote(key)}" if key else "")
        cancel = ""
        if row["status"] != "cancelled":
            cancel = f'<form method="post" action="/account/bookings/{esc(row["reference"])}/cancel">{_csrf(ctx)}<button class="btn small" type="submit">{esc(c.cancel_booking)}</button></form>'
        booking_rows.append(
            f'<tr><td dir="ltr"><a href="{esc(href)}">{esc(row["reference"])}</a></td><td>{esc(row["title"])}</td><td dir="ltr">{esc(ctx["money"](row["total_kwd"]))}</td><td>{esc(_status(c, row["status"]))}</td><td>{cancel}</td></tr>'
        )
    booking_html = "".join(booking_rows) or f"<tr><td>{esc(c.empty_bookings)}</td></tr>"
    people = "".join(
        f'<li>{esc(person["full_name"])} · <span dir="ltr">{esc(person["passport"])}</span> · <span dir="ltr">{esc(person["dob"])}</span> · {esc(person["nationality"])}</li>'
        for person in travelers
    )
    body = f"""
    <section class="page">
      <h1>{esc(c.nav_account)}</h1>{saved_note}
      <form class="panel" method="post" action="/account">
        {_csrf(ctx)}
        <label class="field">{esc(c.name)}<input name="name" value="{esc(customer["name"])}"></label>
        <label class="field">{esc(c.email)}<input value="{esc(customer["email"])}" dir="ltr" disabled></label>
        <label class="field">{esc(c.phone)}<input name="phone" value="{esc(customer["phone"] or "")}" dir="ltr"></label>
        <button class="btn" type="submit">{esc(c.save)}</button>
      </form>
      <form method="post" action="/account/logout">{_csrf(ctx)}<button class="btn" type="submit">{esc(c.nav_logout)}</button></form>
      <h2>{esc(c.nav_bookings)}</h2>
      <table class="table">{booking_html}</table>
      <h2>{esc(c.nav_travelers)}</h2>
      <ul>{people}</ul>
      <form class="panel" method="post" action="/account/travelers">
        {_csrf(ctx)}
        <label class="field">{esc(c.name)}<input name="full_name" required></label>
        <label class="field">{esc(c.passport)}<input name="passport" dir="ltr"></label>
        <label class="field">{esc(c.dob)}<input name="dob" type="date" dir="ltr"></label>
        <label class="field">{esc(c.nationality)}<input name="nationality"></label>
        <button class="btn" type="submit">{esc(c.add_traveler)}</button>
      </form>
    </section>
    """
    return _shell(ctx, body, c.nav_account)


def dashboard_page(ctx, panel, bookings, customers, hotel_count, flight_count, markup: str = "0", lows=None, source=None) -> str:
    c = ctx["c"]
    staff = ctx["staff"]
    if panel == "bookings":
        lines = []
        for row in bookings:
            cancel = ""
            if row["status"] != "cancelled":
                cancel = f'<form method="post" action="/dashboard/bookings/{esc(row["reference"])}/cancel">{_csrf(ctx)}<button class="btn small" type="submit">{esc(c.cancel_booking)}</button></form>'
            lines.append(
                f'<tr><td dir="ltr">{esc(row["reference"])}</td><td>{esc(row["title"])}</td><td dir="ltr">{esc(row["customer_email"])}</td><td dir="ltr">{esc(ctx["money"](row["total_kwd"]))}</td><td>{esc(_status(c, row["status"]))}</td><td>{esc(row["created_at"])}</td><td>{cancel}</td></tr>'
            )
        main = f'<h1>{esc(c.nav_bookings)}</h1><table class="table">{"".join(lines) or esc(c.empty_bookings)}</table>'
    elif panel == "customers":
        rows = "".join(f'<tr><td>{esc(row["name"])}</td><td dir="ltr">{esc(row["email"])}</td><td dir="ltr">{esc(row["phone"])}</td></tr>' for row in customers)
        main = f'<h1>{esc(c.customers)}</h1><table class="table">{rows}</table>'
    elif panel == "providers":
        label = ""
        state = ""
        if source:
            label = source.label_en if ctx["lang"] == "en" else source.label_ar
            state = c.connected if source.connected() else ""
        low_rows = "".join(
            f'<li dir="ltr">{esc(item["item_key"])} · {esc(item["qty"])}</li>' for item in (lows or [])
        ) or f"<li>{esc(c.any)}</li>"
        main = f"""<h1>{esc(c.providers)}</h1>
        <article class="panel"><strong>{esc(c.source)}</strong><p>{esc(label)}</p><p>{esc(state)}</p><p>{esc(c.catalog_note)}</p></article>
        <article class="panel"><strong>{esc(c.low_stock)}</strong><ul>{low_rows}</ul></article>"""
    elif panel == "pricing":
        main = f"""<h1>{esc(c.pricing)}</h1>
        <form class="panel" method="post" action="/dashboard/pricing">
          {_csrf(ctx)}
          <label class="field">{esc(c.markup_percent)}<input name="markup_percent" dir="ltr" value="{esc(markup)}"></label>
          <button class="btn" type="submit">{esc(c.save)}</button>
        </form>
        <p>{esc(c.child_fee)} <span dir="ltr">{CHILD_NIGHT_KWD:.3f} KWD</span></p>
        <ul><li dir="ltr">1 KWD = 3.26 USD</li><li dir="ltr">1 KWD = 12.23 SAR</li><li dir="ltr">1 KWD = 11.97 AED</li></ul>
        <p dir="ltr">{esc(ctx["money"](45))}</p>"""
    else:
        main = f"""<h1>{esc(c.overview)}</h1><div class="grid">
          <article class="tile"><strong dir="ltr">{len(bookings)}</strong><p>{esc(c.nav_bookings)}</p></article>
          <article class="tile"><strong dir="ltr">{len(customers)}</strong><p>{esc(c.customers)}</p></article>
          <article class="tile"><strong dir="ltr">{hotel_count}</strong><p>{esc(c.nav_hotels)} DXB</p></article>
          <article class="tile"><strong dir="ltr">{flight_count}</strong><p>{esc(c.nav_flights)} KWI–DXB</p></article>
        </div>"""
    body = f"""
    <div class="dash">
      <nav>
        <strong>{esc(c.dashboard)}</strong>
        <a href="/dashboard">{esc(c.overview)}</a>
        <a href="/dashboard/bookings">{esc(c.nav_bookings)}</a>
        <a href="/dashboard/customers">{esc(c.customers)}</a>
        <a href="/dashboard/providers">{esc(c.providers)}</a>
        <a href="/dashboard/pricing">{esc(c.pricing)}</a>
        <form method="post" action="/dashboard/logout">{_csrf(ctx)}<button class="btn" type="submit">{esc(c.nav_logout)}</button></form>
      </nav>
      <main><p>{esc(staff["name"])} · {esc(staff["role"])}</p>{main}</main>
    </div>
    """
    return _shell(ctx, body, c.dashboard)


def assistant_page(ctx, q, answer) -> str:
    c = ctx["c"]
    result = ""
    if answer:
        link = f'<a class="btn" href="{esc(answer["href"])}">{esc(answer["label"])}</a>' if answer.get("href") else ""
        result = f'<article class="panel"><p>{esc(answer["text"])}</p>{link}</article>'
    body = f"""
    <section class="page">
      <h1>{esc(c.assistant)}</h1>
      <form class="panel" action="/assistant" method="get">
        <label class="field">{esc(c.ask)}<input name="q" value="{esc(q)}" required></label>
        <button class="btn" type="submit">{esc(c.send)}</button>
      </form>
      {result}
    </section>
    """
    return _shell(ctx, body, c.assistant)


def offers_page(ctx, offers) -> str:
    c = ctx["c"]
    tiles = "".join(_offer_tile(item, ctx["lang"]) for item in offers)
    return _shell(ctx, f'<section class="wrap"><h1>{esc(c.offers_title)}</h1><div class="grid">{tiles}</div></section>', c.nav_offers)


def destinations_page(ctx, destinations) -> str:
    c = ctx["c"]
    tiles = "".join(_dest_tile(item, ctx["lang"]) for item in destinations)
    return _shell(ctx, f'<section class="wrap"><h1>{esc(c.destinations_title)}</h1><div class="grid">{tiles}</div></section>', c.nav_destinations)


def text_page(ctx, title, paragraphs) -> str:
    body = f'<section class="page"><h1>{esc(title)}</h1>{"".join(f"<p>{esc(p)}</p>" for p in paragraphs)}</section>'
    return _shell(ctx, body, title)
