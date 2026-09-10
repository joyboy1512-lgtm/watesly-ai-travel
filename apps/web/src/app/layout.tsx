import { COMPANY_LEGAL } from "@watesly-travel/shared";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const SITE_URL = "https://www.weekendgate.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "WeekendGate — احجز طيران وفنادق",
    template: "%s | WeekendGate",
  },
  description:
    "احجز طيران وفنادق ونقل وأنشطة مع WeekendGate — منصة سفر كويتية ببحث واضح ودعم بشري.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "ar_KW",
    url: SITE_URL,
    siteName: "WeekendGate",
    title: "WeekendGate — احجز طيران وفنادق",
    description: "منصة سفر كويتية — طيران، فنادق، نقل، وأنشطة.",
  },
  robots: {
    index: process.env.NEXT_PUBLIC_SITE_ENV !== "staging",
    follow: process.env.NEXT_PUBLIC_SITE_ENV !== "staging",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f3340",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  name: COMPANY_LEGAL.brandName,
  legalName: COMPANY_LEGAL.legalNameAr,
  url: SITE_URL,
  logo: `${SITE_URL}/weekendgate-mark.png`,
  telephone: COMPANY_LEGAL.phoneE164,
  email: COMPANY_LEGAL.supportEmail,
  address: {
    "@type": "PostalAddress",
    streetAddress: COMPANY_LEGAL.addressAr,
    addressLocality: "حولي",
    addressCountry: "KW",
  },
  areaServed: "KW",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
