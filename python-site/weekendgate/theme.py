"""Visual design for the Python trial. This stylesheet is Python, not a copy of the live site."""

THEME = """
:root {
  --navy: #001b35;
  --blue: #0266c0;
  --ink: #111111;
  --muted: #334155;
  --line: #d5deea;
  --card: #ffffff;
  --bg: #eef4fb;
  --price: #e7f3fc;
  --price-line: #8ec8ef;
  --price-ink: #013e6b;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); font-family: "Segoe UI", Tahoma, sans-serif; }
a { color: inherit; }
img { max-width: 100%; }
button, input, select, textarea { font: inherit; }
.top {
  position: sticky; top: 0; z-index: 20;
  background: var(--navy); color: #fff;
}
.top-row, .wrap, .foot-in { width: min(1180px, calc(100% - 28px)); margin: 0 auto; }
.top-row { min-height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.brand img { height: 36px; display: block; }
.nav { display: flex; flex-wrap: wrap; gap: 14px; }
.nav a, .tools a, .tools button { color: #fff; font-weight: 700; text-decoration: none; background: none; border: 0; cursor: pointer; white-space: nowrap; }
.tools { display: flex; align-items: center; gap: 8px; }
.tools select { background: #fff; color: var(--navy); border: 0; border-radius: 999px; padding: 6px 10px; font-weight: 800; }
.hero {
  min-height: 78vh;
  display: flex; align-items: flex-end; justify-content: center;
  padding: 28px 16px 40px;
  background: #071526 center/cover no-repeat;
}
.hero-card { width: min(980px, 100%); background: rgba(255,255,255,.94); border-radius: 22px; padding: 16px; box-shadow: 0 16px 40px rgba(0,0,0,.25); }
.hero h1 { margin: 0 0 12px; text-align: center; color: var(--navy); font-size: clamp(1.4rem, 3vw, 2rem); }
.tabs { display: flex; gap: 8px; justify-content: center; margin-bottom: 12px; }
.tabs button { border: 0; background: #fff; border-radius: 999px; padding: 8px 14px; font-weight: 800; cursor: pointer; color: var(--navy); }
.tabs button.on { background: var(--blue); color: #fff; }
.search { display: flex; gap: 8px; align-items: end; flex-wrap: wrap; }
.search label { display: grid; gap: 4px; font-size: .75rem; font-weight: 800; color: var(--muted); min-width: 110px; flex: 1; }
.search input, .search select, .field input, .field select, .field textarea {
  border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; background: #fff; color: var(--ink); font-weight: 700;
}
.btn { background: var(--blue); color: #fff; border: 0; border-radius: 10px; padding: 12px 16px; font-weight: 800; cursor: pointer; text-decoration: none; display: inline-block; }
.trust, .grid { width: min(1180px, calc(100% - 28px)); margin: 18px auto; }
.trust { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.trust span, .chip { background: #fff; border-radius: 999px; padding: 8px 12px; font-weight: 700; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
.tile { background: #fff; border-radius: 16px; overflow: hidden; text-decoration: none; border: 1px solid var(--line); }
.tile img { width: 100%; height: 140px; object-fit: cover; display: block; }
.tile strong, .tile p { display: block; margin: 8px 12px; }
h2.section { width: min(1180px, calc(100% - 28px)); margin: 22px auto 0; }
.results { width: min(1180px, calc(100% - 20px)); margin: 16px auto 28px; display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 12px; align-items: start; }
.side { display: flex; flex-direction: column; gap: 8px; position: sticky; top: 80px; }
.map { height: 4.5cm; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); position: relative; background: #d7ebf8 center/cover; }
.pin { position: absolute; transform: translate(-50%, -50%); width: 22px; height: 22px; display: grid; place-items: center; background: var(--price-ink); color: #fff; border-radius: 50%; font-size: 11px; font-weight: 800; text-decoration: none; }
.filters, .panel, .flight { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 12px; }
.filters h3 { margin: 0; }
.filters-head, .sort { display: flex; justify-content: space-between; gap: 8px; align-items: center; flex-wrap: wrap; }
.check { display: flex; gap: 8px; align-items: center; font-weight: 700; margin: 4px 0; }
.sort a { text-decoration: none; border: 1px solid var(--line); background: #fff; border-radius: 8px; padding: 6px 10px; font-weight: 800; font-size: .82rem; }
.sort a.on { background: var(--price); border-color: var(--blue); color: var(--blue); }
.hotel-card { display: grid; grid-template-columns: 220px minmax(0, 1fr) 250px; background: #fff; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; margin: 0 0 12px; min-height: 250px; }
.hotel-card img.photo { width: 100%; height: 100%; min-height: 250px; object-fit: cover; display: block; }
.hotel-main, .hotel-price { padding: 14px; display: flex; flex-direction: column; justify-content: center; gap: 8px; }
.hotel-price { border-inline-start: 1px solid var(--line); align-items: stretch; }
.stay { background: var(--price); border: 1px solid var(--price-line); border-radius: 10px; padding: 12px; color: var(--price-ink); }
.stay strong { display: block; font-size: 1.35rem; }
.score { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 28px; background: var(--blue); color: #fff; border-radius: 6px; font-weight: 800; }
.stars { color: #d4a017; letter-spacing: 1px; }
.good { color: #0f7a45; font-weight: 800; }
.flight { display: grid; grid-template-columns: 1.4fr .8fr auto; gap: 12px; align-items: center; margin: 10px 0; }
.times { display: flex; gap: 24px; font-size: 1.3rem; font-weight: 800; }
.note { background: #fff8e8; border: 1px solid #efd59a; border-radius: 12px; padding: 10px 12px; }
.table { width: 100%; border-collapse: collapse; background: #fff; }
.table th, .table td { border-bottom: 1px solid var(--line); padding: 8px; text-align: start; }
.dash { display: grid; grid-template-columns: 220px 1fr; min-height: 70vh; }
.dash nav { background: var(--navy); color: #fff; padding: 18px; display: grid; align-content: start; gap: 10px; }
.dash nav a { color: #fff; font-weight: 800; text-decoration: none; }
.dash main, .page { width: min(860px, calc(100% - 28px)); margin: 18px auto; }
.field { display: grid; gap: 4px; font-weight: 800; margin-bottom: 10px; }
.table form { margin: 0; }
.btn.small { padding: 6px 10px; }
.foot { background: var(--navy); color: #fff; margin-top: 28px; padding: 28px 0 36px; }
.foot-in { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 16px; }
.foot a { color: #fff; }
[hidden] { display: none !important; }
@media (max-width: 860px) {
  .nav { display: none; }
  .tools a[href^="tel"] { display: none; }
  .nav.open { display: flex; flex-direction: column; background: var(--navy); padding: 8px 0; }
  .results, .hotel-card, .flight, .dash, .foot-in { grid-template-columns: 1fr; }
  .side { position: static; }
  .hotel-card img.photo { min-height: 180px; }
}
@media print { .top, .foot, .btn { display: none !important; } }
"""
