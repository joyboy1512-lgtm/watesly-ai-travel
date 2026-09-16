"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

type Member = {
  membershipId: string;
  status: string;
  user: {
    id: string;
    email: string;
    name: string;
    status: string;
    lastLoginAt: string | null;
  };
  role: { id?: string; code: string; name: string };
};

type Role = { id: string; code: string; name: string };

export default function UsersPage() {
  const [items, setItems] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "Demo1234!",
    roleCode: "agent",
  });

  async function load() {
    const [users, orgRoles] = await Promise.all([
      apiFetch<{ items: Member[] }>("/users"),
      apiFetch<Role[]>("/organizations/roles"),
    ]);
    setItems(users.items);
    setRoles(orgRoles.filter((r) => r.code !== "owner"));
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  async function invite() {
    setError("");
    setOk("");
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setOk("تمت إضافة الموظف");
      setForm((f) => ({ ...f, name: "", email: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الإضافة");
    }
  }

  async function changeRole(membershipId: string, roleCode: string) {
    try {
      await apiFetch(`/users/${membershipId}`, {
        method: "PATCH",
        body: JSON.stringify({ roleCode }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل التحديث");
    }
  }

  return (
    <AppShell title="الموظفون والصلاحيات">
      <div className="panel">
        <h3>إضافة موظف</h3>
        <div className="form-grid">
          <label className="field">
            <span>الاسم</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="field">
            <span>البريد</span>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="field">
            <span>كلمة المرور</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <label className="field">
            <span>الدور</span>
            <select
              value={form.roleCode}
              onChange={(e) => setForm({ ...form, roleCode: e.target.value })}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={invite}>
            إضافة
          </button>
        </div>
        {ok ? <p className="hint">{ok}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد</th>
              <th>الدور</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.membershipId}>
                <td>{item.user.name}</td>
                <td>{item.user.email}</td>
                <td>
                  {item.role.code === "owner" ? (
                    item.role.name
                  ) : (
                    <select
                      value={item.role.code}
                      onChange={(e) =>
                        changeRole(item.membershipId, e.target.value)
                      }
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.code}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
