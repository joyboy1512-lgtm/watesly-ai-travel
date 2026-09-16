import { Suspense } from "react";
import InboxClient from "./InboxClient";

export default function ConversationsPage() {
  return (
    <Suspense
      fallback={
        <main className="shell">
          <p className="lead">جارٍ فتح صندوق المحادثات...</p>
        </main>
      }
    >
      <InboxClient />
    </Suspense>
  );
}
