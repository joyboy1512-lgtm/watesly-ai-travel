"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Deep links redirect into the unified Watesly-style inbox. */
export default function ConversationDeepLinkPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!params.id) return;
    router.replace(`/dashboard/conversations?id=${params.id}`);
  }, [params.id, router]);

  return (
    <main className="shell">
      <p className="lead">جارٍ فتح المحادثة في الصندوق...</p>
    </main>
  );
}
