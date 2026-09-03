import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../shop.css";
import "../../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { DESTINATION_GUIDES, getDestination } from "@watesly-travel/shared";
import { DestinationGuideClient } from "@/components/platform/DestinationGuideClient";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return DESTINATION_GUIDES.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = getDestination(slug);
  if (!d) return { title: "Destination" };
  return {
    title: `${d.seoTitleAr} | ${d.seoTitleEn}`,
    description: d.seoDescriptionAr,
    alternates: { canonical: `https://www.weekendgate.com/destinations/${d.slug}` },
    openGraph: {
      title: d.seoTitleAr,
      description: d.seoDescriptionAr,
      images: [{ url: d.image }],
    },
  };
}

export default async function DestinationPage({ params }: Props) {
  const { slug } = await params;
  const d = getDestination(slug);
  if (!d) notFound();

  return (
    <StoreFront wide>
      <DestinationGuideClient d={d} />
    </StoreFront>
  );
}
