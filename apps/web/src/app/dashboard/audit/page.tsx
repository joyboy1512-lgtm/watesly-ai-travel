"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";

type AuditRow = {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
  actor?: { name?: string | null; email?: string | null } | null;
};

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<AuditRow[]>("/audit?limit=100")
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <AppShell title="سجل التدقيق">
      {error ? <p className="error">{error}</p> : null}
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>الوقت</th>
              <th>الفاعل</th>
              <th>الإجراء</th>
              <th>الكيان</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatDate(row.createdAt)}</td>
                <td>{row.actor?.name || row.actor?.email || "—"}</td>
                <td>{row.action}</td>
                <td>
                  {row.entityType || "—"}
                  {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
