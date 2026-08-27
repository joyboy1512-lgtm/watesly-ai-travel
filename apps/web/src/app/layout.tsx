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
  name: "WeekendGate",
  url: SITE_URL,
  logo: `${SITE_URL}/weekendgate-mark.png`,
  telephone: "+965-2222-0000",
  address: {
    "@type": "PostalAddress",
    addressCountry: "KW",
    addressLocality: "Kuwait City",
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
