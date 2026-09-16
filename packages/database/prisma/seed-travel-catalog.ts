import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AIRPORTS_URL =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat";
const AIRLINES_URL =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat";

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function clean(value?: string) {
  if (!value || value === "\\N") return null;
  return value.trim() || null;
}

function airlineLogo(iata?: string | null) {
  if (!iata || iata.length !== 2) return null;
  return `https://pics.avs.io/120/40/${iata.toUpperCase()}.png`;
}

async function fetchText(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

export async function seedTravelCatalog(client: PrismaClient = prisma) {
  console.log("Seeding global airports & airlines from OpenFlights...");

  const [airportsRaw, airlinesRaw] = await Promise.all([
    fetchText(AIRPORTS_URL),
    fetchText(AIRLINES_URL),
  ]);

  const airports = airportsRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = splitCsvLine(line);
      const iata = clean(cols[4])?.toUpperCase() || null;
      const icao = clean(cols[5])?.toUpperCase() || null;
      if (!iata && !icao) return null;
      // Prefer rows with IATA for search UX; keep ICAO-only too with synthetic key later
      return {
        iataCode: iata && iata.length === 3 ? iata : null,
        icaoCode: icao && icao.length === 4 ? icao : null,
        name: clean(cols[1]) || "Airport",
        city: clean(cols[2]),
        country: clean(cols[3]),
        latitude: cols[6] ? Number(cols[6]) : null,
        longitude: cols[7] ? Number(cols[7]) : null,
        timezone: clean(cols[11]),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row?.name))
    .filter((row) => Boolean(row.iataCode));

  const airlines = airlinesRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = splitCsvLine(line);
      const iata = clean(cols[3])?.toUpperCase() || null;
      const icao = clean(cols[4])?.toUpperCase() || null;
      const active = (clean(cols[7]) || "Y").toUpperCase() !== "N";
      if (!iata || iata.length !== 2) return null;
      return {
        iataCode: iata,
        icaoCode: icao && icao.length === 3 ? icao : null,
        name: clean(cols[1]) || iata,
        alias: clean(cols[2]),
        country: clean(cols[6]),
        active,
        logoUrl: airlineLogo(iata),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  // Clear & reload for idempotent full catalog refresh
  await client.airport.deleteMany();
  await client.airline.deleteMany();

  const airportChunk = 500;
  for (let i = 0; i < airports.length; i += airportChunk) {
    await client.airport.createMany({
      data: airports.slice(i, i + airportChunk),
      skipDuplicates: true,
    });
  }

  const airlineChunk = 500;
  for (let i = 0; i < airlines.length; i += airlineChunk) {
    await client.airline.createMany({
      data: airlines.slice(i, i + airlineChunk),
      skipDuplicates: true,
    });
  }

  const [airportCount, airlineCount] = await Promise.all([
    client.airport.count(),
    client.airline.count(),
  ]);

  console.log(
    `Travel catalog ready: ${airportCount} airports, ${airlineCount} airlines`,
  );
}

const isDirectRun = process.argv[1]?.includes("seed-travel-catalog");
if (isDirectRun) {
  seedTravelCatalog()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error(err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
