"use client";

import "../../wa-suite.css";
import "../../customers-crm.css";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

type Role = { id: string; code: string; name: string };
type Permission = { code: string; name: string };
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
  override?: { grant?: string[]; revoke?: string[] };
  permissions?: string[];
};

export default function UsersPage() {
  const [items, setItems] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "Demo1234!",
    roleCode: "agent",
  });
  const [grant, setGrant] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGrant, setEditGrant] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [users, orgRoles] = await Promise.all([
      apiFetch<{ items: Member[]; catalog?: Permission[] }>("/users"),
      apiFetch<Role[]>("/organizations/roles"),
    ]);
    setItems(users.items);
    setCatalog(users.catalog || []);
    setRoles(orgRoles.filter((r) => r.code !== "owner"));
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  const pagePerms = useMemo(
    () =>
      catalog.filter((p) =>
        [
          "whatsapp.manage",
          "campaigns.manage",
          "conversations.read",
          "conversations.reply",
          "quotes.create",
          "bookings.create",
          "pricing.manage",
          "users.manage",
          "reports.read",
          "settings.manage",
        ].includes(p.code),
      ),
    [catalog],
  );

  function toggle(list: string[], code: string) {
    return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
  }

  async function invite() {
    setError("");
    setOk("");
    setBusy(true);
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          grant,
          revoke: [],
        }),
      });
      setOk("تمت إضافة الموظف مع صلاحياته");
      setForm((f) => ({ ...f, name: "", email: "" }));
      setGrant([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الإضافة");
    } finally {
      setBusy(false);
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

  async function saveOverrides(member: Member) {
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/users/${member.membershipId}`, {
        method: "PATCH",
        body: JSON.stringify({ grant: editGrant, revoke: [] }),
      });
      setOk("تم حفظ صلاحيات الموظف");
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل حفظ الصلاحيات");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="الموظفون والصلاحيات">
      <div className="wa-suite">
        <section className="wa-hero">
          <div>
            <p className="wa-kicker">Team &amp; permissions</p>
            <h3>الموظفون والصلاحيات</h3>
            <p>
              أضف موظفين وحدّد صلاحيات الصفحات كما في واتسلي: واتساب، القنوات،
              القوالب، الحملات، الكتالوج، والمحادثات.
            </p>
          </div>
        </section>

        {error ? <p className="cust-error">{error}</p> : null}
        {ok ? <p className="wa-ok">{ok}</p> : null}

        <section className="wa-card">
          <div className="wa-card-head">
            <h4>دعوة / إضافة موظف</h4>
            <p>الدور يحدد الأساس، ثم تُمنح صفحات إضافية إن لزم</p>
          </div>
          <div className="wa-form-grid">
            <label className="cust-field">
              <span>الاسم</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="cust-field">
              <span>البريد</span>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="cust-field">
              <span>كلمة المرور</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label className="cust-field">
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
          <div className="wa-perm-grid">
            {pagePerms.map((p) => (
              <label key={p.code} className="wa-check">
                <input
                  type="checkbox"
                  checked={grant.includes(p.code)}
                  onChange={() => setGrant(toggle(grant, p.code))}
                />
                {p.name}
              </label>
            ))}
          </div>
          <div className="cust-actions">
            <button type="button" className="btn" disabled={busy} onClick={() => void invite()}>
              {busy ? "جارٍ الإضافة..." : "إضافة الموظف"}
            </button>
          </div>
        </section>

        <section className="wa-card">
          <div className="wa-card-head">
            <h4>جدول الموظفين</h4>
            <p>عدّل الدور أو صلاحيات الصفحات دون تغيير دور المالك</p>
          </div>
          <div className="cust-table-scroll">
            <table className="cust-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>البريد</th>
                  <th>الدور</th>
                  <th>الصلاحيات</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
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
                            void changeRole(item.membershipId, e.target.value)
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
                    <td>
                      <div className="wa-tag-list" style={{ color: "#0f3340" }}>
                        {(item.permissions || []).slice(0, 4).map((code) => (
                          <span key={code}>{code.split(".")[0]}</span>
                        ))}
                        {(item.permissions || []).length > 4 ? (
                          <span>+{(item.permissions || []).length - 4}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className={`wa-badge ${item.status === "active" ? "ok" : "warn"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.role.code !== "owner" ? (
                        <button
                          type="button"
                          className="wa-mini-btn"
                          onClick={() => {
                            setEditingId(item.membershipId);
                            setEditGrant(item.permissions || item.override?.grant || []);
                          }}
                        >
                          صلاحيات
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editingId ? (
            <div className="wa-perm-editor">
              <h4>تعديل صلاحيات الصفحات</h4>
              <div className="wa-perm-grid">
                {pagePerms.map((p) => (
                  <label key={p.code} className="wa-check">
                    <input
                      type="checkbox"
                      checked={editGrant.includes(p.code)}
                      onChange={() => setEditGrant(toggle(editGrant, p.code))}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
              <div className="cust-actions">
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => {
                    const member = items.find((m) => m.membershipId === editingId);
                    if (member) void saveOverrides(member);
                  }}
                >
                  حفظ الصلاحيات
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setEditingId(null)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
