"use client";

import {
  CheckCircle2,
  Edit3,
  Loader2,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  X,
  MessageCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type CstCustomer = {
  id: string;
  name: string;
  phone: string;
  serviceType: string;
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const SERVICE_TYPES = [
  "Postpaid",
  "Prepaid",
  "@Home",
  "ADSL",
  "Enterprise",
  "Device",
  "Sim Swap",
  "MNP",
  "Other",
];

const STATUS_COLORS: Record<CstCustomer["status"], { bg: string; color: string; border: string }> = {
  Pending:     { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  "In Progress":{ bg: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "rgba(59,130,246,0.3)" },
  Completed:   { bg: "rgba(34,197,94,0.12)",  color: "#22c55e", border: "rgba(34,197,94,0.3)" },
  Cancelled:   { bg: "rgba(239,68,68,0.12)",  color: "#ef4444", border: "rgba(239,68,68,0.3)" },
};

export default function CstClient() {
  const [customers, setCustomers] = useState<CstCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [message, setMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CstCustomer | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    serviceType: "Postpaid",
    status: "Pending" as CstCustomer["status"],
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cst");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setCustomers(json.customers || []);
    } catch {
      setCustomers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditingItem(null);
    setForm({ name: "", phone: "", serviceType: "Postpaid", status: "Pending", notes: "" });
    setMessage("");
    setModalOpen(true);
  }

  function openEdit(item: CstCustomer) {
    setEditingItem(item);
    setForm({
      name: item.name,
      phone: item.phone,
      serviceType: item.serviceType,
      status: item.status,
      notes: item.notes || "",
    });
    setMessage("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const url = editingItem ? `/api/cst/${editingItem.id}` : "/api/cst";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ");

      setModalOpen(false);
      void load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ");
    }
    setSaving(false);
  }

  async function handleDelete(item: CstCustomer) {
    if (!confirm(`هل أنت تأكد من حذف العميل ${item.name}؟`)) return;

    try {
      const res = await fetch(`/api/cst/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل الحذف");
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل الحذف");
    }
  }

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.notes && c.notes.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = !statusFilter || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  function cleanPhone(raw: string) {
    let p = raw.replace(/\D/g, "");
    if (p.startsWith("0")) p = `2${p}`;
    if (!p.startsWith("2")) p = `20${p}`;
    return p;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Hero */}
      <div className="daily-hero animate-fade-up">
        <div>
          <p>Private Customer Management</p>
          <h1>👥 CST Data</h1>
          <span>خاص بك فقط — متابعة وتتبع العملاء والخدمات بسرعة.</span>
        </div>
        <button className="vf-btn vf-btn-primary vf-btn-lg" type="button" onClick={openCreate}>
          <Plus size={18} />
          إضافة عميل
        </button>
      </div>

      {/* Toolbar Filters */}
      <div className="vf-card animate-fade-up animate-fade-up-delay-1" style={{
        display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center"
      }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search size={16} style={{ position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--vf-text-muted)" }} />
          <input
            className="vf-input"
            style={{ paddingRight: "2.5rem" }}
            placeholder="بحث بالاسم أو الهاتف أو الملاحظات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="vf-input"
          style={{ width: "auto", minWidth: "140px" }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">كل الحالات</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="vf-card" style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "3px solid var(--vf-border)", borderTopColor: "var(--vf-red)",
            animation: "spin 0.8s linear infinite", margin: "0 auto",
          }} />
          <p style={{ color: "var(--vf-text-muted)", marginTop: "0.75rem", fontSize: "0.875rem" }}>جاري تحميل البيانات...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredCustomers.length === 0 && (
        <div className="vf-card animate-fade-up" style={{
          textAlign: "center", padding: "2.5rem", borderStyle: "dashed", borderColor: "var(--vf-border-light)"
        }}>
          <p style={{ color: "var(--vf-text-2)", fontWeight: "600" }}>
            {customers.length === 0 ? "لا يوجد عملاء مضافين حتى الآن" : "لا توجد نتائج تطابق البحث"}
          </p>
        </div>
      )}

      {/* Customers List Grid */}
      {!loading && filteredCustomers.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.875rem" }} className="animate-fade-up">
          {filteredCustomers.map((c) => {
            const st = STATUS_COLORS[c.status];
            return (
              <div key={c.id} className="vf-card" style={{
                display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "0.75rem", padding: "1rem"
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: "800", color: "#fff" }}>{c.name}</h3>
                      <p style={{ fontSize: "0.8125rem", color: "var(--vf-text-muted)", marginTop: "0.125rem" }}>
                        📞 {c.phone}
                      </p>
                    </div>
                    <span style={{
                      fontSize: "0.625rem", fontWeight: "800", padding: "0.2rem 0.5rem",
                      borderRadius: "999px", background: st.bg, color: st.color, border: `1px solid ${st.border}`
                    }}>
                      {c.status}
                    </span>
                  </div>

                  <div style={{ marginTop: "0.625rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{
                      fontSize: "0.6875rem", fontWeight: "700", padding: "0.15rem 0.5rem",
                      borderRadius: "8px", background: "var(--vf-surface-2)", border: "1px solid var(--vf-border)", color: "var(--vf-text-2)"
                    }}>
                      {c.serviceType}
                    </span>
                    <span style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)" }}>
                      {new Date(c.createdAt).toLocaleDateString("ar-EG")}
                    </span>
                  </div>

                  {c.notes && (
                    <p style={{
                      fontSize: "0.75rem", color: "var(--vf-text-2)", marginTop: "0.625rem",
                      background: "var(--vf-surface-2)", padding: "0.5rem 0.75rem", borderRadius: "8px",
                      border: "1px solid var(--vf-border)", whiteSpace: "pre-wrap", wordBreak: "break-word"
                    }}>
                      📝 {c.notes}
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderTop: "1px solid var(--vf-border)", paddingTop: "0.625rem", marginTop: "0.25rem"
                }}>
                  <div style={{ display: "flex", gap: "0.375rem" }}>
                    <a
                      href={`https://wa.me/${cleanPhone(c.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vf-btn vf-btn-ghost vf-btn-sm"
                      style={{ color: "#22c55e", padding: "0.25rem 0.5rem" }}
                      title="WhatsApp"
                    >
                      <MessageCircle size={16} />
                    </a>
                    <a
                      href={`tel:${c.phone}`}
                      className="vf-btn vf-btn-ghost vf-btn-sm"
                      style={{ color: "#3b82f6", padding: "0.25rem 0.5rem" }}
                      title="Call"
                    >
                      <Phone size={16} />
                    </a>
                  </div>
                  <div style={{ display: "flex", gap: "0.375rem" }}>
                    <button
                      className="vf-btn vf-btn-ghost vf-btn-sm"
                      onClick={() => openEdit(c)}
                      style={{ padding: "0.25rem 0.5rem" }}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      className="vf-btn vf-btn-ghost vf-btn-sm"
                      onClick={() => handleDelete(c)}
                      style={{ color: "#ef4444", padding: "0.25rem 0.5rem" }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Add / Edit */}
      {modalOpen && (
        <div className="daily-modal" onClick={() => setModalOpen(false)}>
          <form className="daily-modal-card" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "800", color: "#fff" }}>
                {editingItem ? "تعديل عميل" : "إضافة عميل جديد"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "var(--vf-surface-2)", border: "1px solid var(--vf-border)", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "var(--vf-text-2)" }}
              ><X size={16} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
              <label className="daily-field">
                <span>اسم العميل <span style={{ color: "var(--vf-red-light)" }}>*</span></span>
                <input
                  className="vf-input"
                  required
                  placeholder="محمد أحمد"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </label>

              <label className="daily-field">
                <span>رقم الهاتف <span style={{ color: "var(--vf-red-light)" }}>*</span></span>
                <input
                  className="vf-input"
                  required
                  type="tel"
                  placeholder="01012345678"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <label className="daily-field">
                  <span>نوع الخدمة</span>
                  <select
                    className="vf-input"
                    value={form.serviceType}
                    onChange={(e) => setForm((p) => ({ ...p, serviceType: e.target.value }))}
                  >
                    {SERVICE_TYPES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </label>

                <label className="daily-field">
                  <span>الحالة</span>
                  <select
                    className="vf-input"
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as CstCustomer["status"] }))}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </label>
              </div>

              <label className="daily-field">
                <span>ملاحظات</span>
                <textarea
                  className="vf-input"
                  rows={3}
                  placeholder="أضف أي تفاصيل أو ملاحظات..."
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  style={{ resize: "none" }}
                />
              </label>
            </div>

            {message && <div className="vf-alert vf-alert-error">{message}</div>}

            <div className="daily-actions" style={{ marginTop: "0.5rem" }}>
              <button className="vf-btn vf-btn-ghost vf-btn-lg" type="button" onClick={() => setModalOpen(false)}>
                إلغاء
              </button>
              <button className="vf-btn vf-btn-primary vf-btn-lg" type="submit" disabled={saving}>
                {saving ? <Loader2 className="daily-spin" size={18} /> : <CheckCircle2 size={18} />}
                {editingItem ? "حفظ التعديل" : "إضافة العميل"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
