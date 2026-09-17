import type { Metadata } from "next";
import { LegalPageShell } from "@/components/shop/LegalPageShell";
import { ArticleBodyClient } from "@/components/shop/ArticleBodyClient";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} | WeekendGate`,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  return (
    <LegalPageShell title="مقال">
      <ArticleBodyClient slug={slug} />
    </LegalPageShell>
  );
}
