import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from "@nestjs/common";
import { extractPassportFromImage } from "@watesly-travel/ai-core";
import { buildMockAncillaryOffers } from "@watesly-travel/shared";
import { RequirePermissions } from "../auth/decorators";
import { PrismaService } from "../prisma/prisma.service";


const AIRPORT_QUERY_ALIASES: Record<string, string[]> = {
  "الكويت": ["Kuwait", "KWI"],
  "كويت": ["Kuwait", "KWI"],
  "دبي": ["Dubai", "DXB"],
  "دبى": ["Dubai", "DXB"],
  "الشارقة": ["Sharjah", "SHJ"],
  "الشارقه": ["Sharjah", "SHJ"],
  "ابوظبي": ["Abu Dhabi", "AUH"],
  "أبوظبي": ["Abu Dhabi", "AUH"],
  "الدوحة": ["Doha", "DOH"],
  "الدوحه": ["Doha", "DOH"],
  "البحرين": ["Bahrain", "BAH"],
  "المنامة": ["Manama", "BAH"],
  "مسقط": ["Muscat", "MCT"],
  "صلالة": ["Salalah", "SLL"],
  "الرياض": ["Riyadh", "RUH"],
  "جدة": ["Jeddah", "JED"],
  "جده": ["Jeddah", "JED"],
  "الدمام": ["Dammam", "DMM"],
  "الخبر": ["Dammam", "DMM"],
  "المدينة": ["Madinah", "MED"],
  "المدينه": ["Madinah", "MED"],
  "المدينة المنورة": ["Madinah", "MED"],
  "أبها": ["Abha", "AHB"],
  "ابها": ["Abha", "AHB"],
  "تبوك": ["Tabuk", "TUU"],
  "القصيم": ["Qassim", "ELQ"],
  "ينبع": ["Yanbu", "YNB"],
  "الطائف": ["Taif", "TIF"],
  "القاهرة": ["Cairo", "CAI"],
  "القاهره": ["Cairo", "CAI"],
  "الإسكندرية": ["Alexandria", "HBE"],
  "الاسكندرية": ["Alexandria", "HBE"],
  "شرم": ["Sharm", "SSH"],
  "شرم الشيخ": ["Sharm el-Sheikh", "SSH"],
  "الأقصر": ["Luxor", "LXR"],
  "الاقصر": ["Luxor", "LXR"],
  "أسوان": ["Aswan", "ASW"],
  "اسوان": ["Aswan", "ASW"],
  "عمان": ["Amman", "AMM"],
  "عمّان": ["Amman", "AMM"],
  "بيروت": ["Beirut", "BEY"],
  "بغداد": ["Baghdad", "BGW"],
  "أربيل": ["Erbil", "EBL"],
  "اربيل": ["Erbil", "EBL"],
  "البصرة": ["Basra", "BSR"],
  "البصره": ["Basra", "BSR"],
  "اسطنبول": ["Istanbul", "IST", "SAW"],
  "إسطنبول": ["Istanbul", "IST", "SAW"],
  "أنقرة": ["Ankara", "ESB"],
  "انقره": ["Ankara", "ESB"],
  "أنطاليا": ["Antalya", "AYT"],
  "انطاليا": ["Antalya", "AYT"],
  "لندن": ["London", "LHR", "LGW", "STN"],
  "باريس": ["Paris", "CDG", "ORY"],
  "فرانكفورت": ["Frankfurt", "FRA"],
  "ميونخ": ["Munich", "MUC"],
  "أمستردام": ["Amsterdam", "AMS"],
  "امستردام": ["Amsterdam", "AMS"],
  "مدريد": ["Madrid", "MAD"],
  "برشلونة": ["Barcelona", "BCN"],
  "روما": ["Rome", "FCO"],
  "ميلانو": ["Milan", "MXP"],
  "نيويورك": ["New York", "JFK", "EWR", "LGA"],
  "لوس أنجلوس": ["Los Angeles", "LAX"],
  "شيكاغو": ["Chicago", "ORD"],
  "تورنتو": ["Toronto", "YYZ"],
  "مومباي": ["Mumbai", "BOM"],
  "بومباي": ["Mumbai", "BOM"],
  "دلهي": ["Delhi", "DEL"],
  "بانكوك": ["Bangkok", "BKK", "DMK"],
  "كوالالمبور": ["Kuala Lumpur", "KUL"],
  "سنغافورة": ["Singapore", "SIN"],
  "سنغافوره": ["Singapore", "SIN"],
  "هونج كونج": ["Hong Kong", "HKG"],
  "طوكيو": ["Tokyo", "NRT", "HND"],
  "سيول": ["Seoul", "ICN"],
  "الدار البيضاء": ["Casablanca", "CMN"],
  "مراكش": ["Marrakech", "RAK"],
  "تونس": ["Tunis", "TUN"],
  "الجزائر": ["Algiers", "ALG"],
  "جوهانسبرغ": ["Johannesburg", "JNB"],
  "نيروبي": ["Nairobi", "NBO"],
  "سيدني": ["Sydney", "SYD"],
  "ملبورن": ["Melbourne", "MEL"],
};

function expandAirportQuery(query: string): string[] {
  const q = query.trim();
  if (!q) return [];
  const out: string[] = [];
  const lower = q.toLowerCase();
  for (const [alias, terms] of Object.entries(AIRPORT_QUERY_ALIASES)) {
    if (alias === q || alias.includes(q) || q.includes(alias)) {
      out.push(...terms);
    }
  }
  if (lower === "kuw" || lower.startsWith("kuwait")) out.push("Kuwait", "KWI");
  if (lower.startsWith("dub")) out.push("Dubai", "DXB");
  if (lower.startsWith("riy")) out.push("Riyadh", "RUH");
  if (lower.startsWith("jed")) out.push("Jeddah", "JED");
  return out;
}

@Controller("travel-meta")
export class TravelMetaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("airports")
  @RequirePermissions("conversations.read")
  async airports(
    @Query("q") q?: string,
    @Query("limit") limitRaw?: string,
  ) {
    const limit = Math.min(80, Math.max(5, Number(limitRaw) || 40));
    const query = q?.trim() || "";

    // Popular defaults shown when the field is focused with no query
    const popularCodes = [
      "KWI", "RUH", "JED", "DMM", "MED", "AHB", "TUU", "ELQ", "YNB", "TIF",
      "DXB", "AUH", "SHJ", "DOH", "BAH", "MCT", "SLL",
      "CAI", "HBE", "SSH", "LXR", "ASW",
      "AMM", "BEY", "DAM", "ALP", "BGW", "EBL", "BSR",
      "IST", "SAW", "AYT", "ESB", "ADB",
      "LHR", "LGW", "STN", "MAN", "BHX", "EDI",
      "CDG", "ORY", "FRA", "MUC", "AMS", "MAD", "BCN", "FCO", "MXP", "ZRH", "VIE",
      "JFK", "EWR", "LGA", "LAX", "ORD", "IAD", "MIA", "SFO", "YYZ",
      "BOM", "DEL", "BLR", "MAA", "CCU", "HYD",
      "BKK", "DMK", "KUL", "SIN", "CGK", "HKG", "NRT", "HND", "ICN", "PEK", "PVG",
      "CMN", "RAK", "TUN", "ALG", "TIP", "JNB", "CPT", "NBO", "ADD",
      "GRU", "GIG", "EZE", "SCL", "BOG", "LIM",
      "SYD", "MEL", "AKL",
    ];

    if (!query) {
      const rows = await this.prisma.airport.findMany({
        where: { iataCode: { in: popularCodes } },
      });
      const rank = new Map(popularCodes.map((code, idx) => [code, idx]));
      return rows
        .sort(
          (a, b) =>
            (rank.get(a.iataCode || "") ?? 9999) -
            (rank.get(b.iataCode || "") ?? 9999),
        )
        .slice(0, limit);
    }

    const upper = query.toUpperCase();
    const aliases = expandAirportQuery(query);
    const terms = Array.from(new Set([query, upper, ...aliases].filter(Boolean)));

    const rows = await this.prisma.airport.findMany({
      where: {
        OR: terms.flatMap((term) => [
          { iataCode: { equals: term.toUpperCase(), mode: "insensitive" as const } },
          { iataCode: { startsWith: term.toUpperCase(), mode: "insensitive" as const } },
          { city: { contains: term, mode: "insensitive" as const } },
          { name: { contains: term, mode: "insensitive" as const } },
          { country: { contains: term, mode: "insensitive" as const } },
        ]),
      },
      orderBy: [{ city: "asc" }, { name: "asc" }],
      take: Math.max(limit * 3, 60),
    });

    // Rank: exact IATA > IATA prefix > city start > other
    const scored = rows.map((row) => {
      const iata = (row.iataCode || "").toUpperCase();
      const city = (row.city || "").toUpperCase();
      const name = (row.name || "").toUpperCase();
      let score = 100;
      if (iata === upper) score = 0;
      else if (iata.startsWith(upper)) score = 1;
      else if (city.startsWith(upper) || terms.some((t) => city.startsWith(t.toUpperCase()))) score = 2;
      else if (city.includes(upper) || name.startsWith(upper)) score = 3;
      else score = 4;
      return { row, score };
    });
    scored.sort((a, b) => a.score - b.score || (a.row.city || "").localeCompare(b.row.city || ""));
    return scored.slice(0, limit).map((s) => s.row);
  }

  @Get("airlines")
  @RequirePermissions("conversations.read")
  async airlines(
    @Query("q") q?: string,
    @Query("limit") limitRaw?: string,
  ) {
    const limit = Math.min(60, Math.max(5, Number(limitRaw) || 30));
    const query = q?.trim();
    if (!query) {
      return this.prisma.airline.findMany({
        where: {
          active: true,
          iataCode: {
            in: ["SV", "XY", "F3", "EK", "EY", "QR", "MS", "TK", "BA", "AF", "LH", "UA", "AA"],
          },
        },
        orderBy: { name: "asc" },
        take: limit,
      });
    }

    return this.prisma.airline.findMany({
      where: {
        active: true,
        OR: [
          { iataCode: { equals: query.toUpperCase(), mode: "insensitive" } },
          { iataCode: { startsWith: query.toUpperCase(), mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { country: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: limit,
    });
  }

  @Get("countries")
  @RequirePermissions("conversations.read")
  async countries(@Query("q") q?: string) {
    const rows = await this.prisma.airport.findMany({
      where: q?.trim()
        ? { country: { contains: q.trim(), mode: "insensitive" } }
        : undefined,
      distinct: ["country"],
      select: { country: true },
      orderBy: { country: "asc" },
      take: 80,
    });
    return rows.map((r) => r.country).filter(Boolean);
  }

  @Get("cities")
  @RequirePermissions("conversations.read")
  async cities(
    @Query("q") q?: string,
    @Query("country") country?: string,
  ) {
    const rows = await this.prisma.airport.findMany({
      where: {
        AND: [
          country?.trim()
            ? { country: { contains: country.trim(), mode: "insensitive" } }
            : {},
          q?.trim()
            ? {
                OR: [
                  { city: { contains: q.trim(), mode: "insensitive" } },
                  { name: { contains: q.trim(), mode: "insensitive" } },
                  { country: { contains: q.trim(), mode: "insensitive" } },
                ],
              }
            : {},
        ],
      },
      distinct: ["city", "country"],
      select: { city: true, country: true, iataCode: true },
      orderBy: [{ country: "asc" }, { city: "asc" }],
      take: 40,
    });
    return rows.filter((r) => r.city);
  }

  /**
   * Ancillary catalog (cars / transfers / tours / packages) via API —
   * UI must not import mock builders directly.
   */
  @Get("ancillaries")
  @RequirePermissions("conversations.read")
  async ancillaries(
    @Query("destination") destination?: string,
    @Query("adults") adultsRaw?: string,
    @Query("nights") nightsRaw?: string,
  ) {
    const adults = Math.max(1, Number(adultsRaw) || 1);
    const nights = Math.max(1, Number(nightsRaw) || 1);
    const destinationLabel = destination?.trim() || "الوجهة";
    const rows = buildMockAncillaryOffers({
      destinationLabel,
      adults,
      nights,
    });
    return {
      providerKey: "mock",
      currency: "KWD",
      items: rows.map((row) => ({
        id: row.id,
        serviceType: row.serviceType,
        name: row.nameAr,
        description: row.descriptionAr,
        // minor units (fils) for KWD
        sellAmountMinor: Math.round(row.priceKwd * 1000),
        meta: row.meta,
      })),
    };
  }

  @Post("passport-scan")
  @RequirePermissions("quotes.create")
  async passportScan(
    @Body()
    body: {
      imageBase64?: string;
      mimeType?: string;
    },
  ) {
    if (!body?.imageBase64?.trim()) {
      throw new BadRequestException("أرفق صورة جواز السفر");
    }

    try {
      const result = await extractPassportFromImage({
        imageBase64: body.imageBase64,
        mimeType: body.mimeType || "image/jpeg",
      });

      if (result.provider === "none") {
        throw new BadRequestException(
          result.notes ||
            "مسح الجواز غير مفعّل. أضف OPENAI_API_KEY أو AI_API_KEY",
        );
      }

      if (!result.fields.passportNumber && !result.fields.firstName) {
        throw new BadRequestException(
          result.notes || "تعذر قراءة بيانات الجواز من الصورة",
        );
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message =
        error instanceof Error ? error.message : "فشل مسح الجواز";
      throw new BadRequestException(message);
    }
  }
}
