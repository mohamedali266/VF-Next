"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

type Shift = "AM" | "PM" | "BW";

const SHIFT_CONFIG = {
  AM: { label: "صباحي", icon: "🌅", color: "var(--shift-am)", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  PM: { label: "ليلي",  icon: "🌙", color: "var(--shift-pm)", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)" },
  BW: { label: "وسط",  icon: "☀️", color: "var(--shift-bw)", bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.3)" },
};

const LINE_LABELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type LineValues = { [key: number]: number };

const EMPTY_VALUES: LineValues = Object.fromEntries(LINE_LABELS.map((n) => [n, 0]));

export default function HealthCheckPage() {
  const { data: session } = useSession();
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [values, setValues] = useState<LineValues>(EMPTY_VALUES);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingData, setExistingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Calculate totals
  const totalNids = Object.values(values).reduce((a, b) => a + b, 0);
  const totalLines = LINE_LABELS.reduce((acc, n) => acc + n * (values[n] || 0), 0);

  // Load existing submission when shift selected
  const loadExisting = useCallback(async (shift: Shift) => {
    setLoading(true);
    setError("");
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/health-check?shift=${shift}&date=${today}`);
      if (res.ok) {
        const data = await res.json();
        if (data.record) {
          setExistingData(data.record);
          setSubmitted(true);
          // Fill values from existing record
          const filled: LineValues = {};
          LINE_LABELS.forEach((n) => {
            filled[n] = data.record[`line${n}Nid`] || 0;
          });
          setValues(filled);
        } else {
          setExistingData(null);
          setSubmitted(false);
          setValues(EMPTY_VALUES);
        }
      }
    } catch {
      setError("تعذر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedShift) {
      loadExisting(selectedShift);
    }
  }, [selectedShift, loadExisting]);

  function handleValueChange(line: number, raw: string) {
    const val = parseInt(raw) || 0;
    setValues((prev) => ({ ...prev, [line]: Math.max(0, val) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedShift) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift: selectedShift,
          ...Object.fromEntries(LINE_LABELS.map((n) => [`line${n}Nid`, values[n] || 0])),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      setSubmitted(true);
      setExistingData(data.record);
      setSuccess("تم إرسال البيانات بنجاح ✅");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Page Title */}
      <div className="animate-fade-up">
        <h1 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>
          📊 Health Check
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--nox-text-muted)" }}>{today}</p>
      </div>

      {/* Shift Selector */}
      <div className="nox-card animate-fade-up animate-fade-up-delay-1">
        <p style={{ fontSize: "0.8125rem", fontWeight: "600", color: "var(--nox-text-2)", marginBottom: "0.875rem" }}>
          اختر الشيفت الخاص بك
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.625rem" }}>
          {(Object.keys(SHIFT_CONFIG) as Shift[]).map((shift) => {
            const cfg = SHIFT_CONFIG[shift];
            const isActive = selectedShift === shift;
            return (
              <button
                key={shift}
                onClick={() => { setSelectedShift(shift); setError(""); }}
                disabled={submitted && selectedShift !== shift}
                style={{
                  border: `2px solid ${isActive ? cfg.color : "var(--nox-border)"}`,
                  background: isActive ? cfg.bg : "var(--nox-surface-2)",
                  borderRadius: "12px",
                  padding: "0.875rem 0.5rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.375rem",
                  opacity: submitted && selectedShift !== shift ? 0.4 : 1,
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>{cfg.icon}</span>
                <span style={{ fontSize: "0.875rem", fontWeight: "800", color: isActive ? cfg.color : "var(--nox-text-2)" }}>
                  {shift}
                </span>
                <span style={{ fontSize: "0.6875rem", color: isActive ? cfg.color : "var(--nox-text-muted)" }}>
                  {cfg.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="nox-card" style={{ textAlign: "center", padding: "2rem" }}>
          <div className="login-spinner" style={{ margin: "0 auto" }} />
          <p style={{ color: "var(--nox-text-muted)", marginTop: "0.75rem", fontSize: "0.875rem" }}>
            جاري التحقق...
          </p>
        </div>
      )}

      {/* Alerts */}
      {error && <div className="nox-alert nox-alert-error animate-fade-up">⚠️ {error}</div>}
      {success && <div className="nox-alert nox-alert-success animate-fade-up">✅ {success}</div>}

      {/* Already Submitted Banner */}
      {submitted && selectedShift && !loading && (
        <div className="nox-card animate-fade-up" style={{
          background: "rgba(34,197,94,0.08)",
          borderColor: "rgba(34,197,94,0.25)",
          display: "flex", alignItems: "center", gap: "0.75rem"
        }}>
          <span style={{ fontSize: "1.5rem" }}>✅</span>
          <div>
            <div style={{ fontWeight: "700", color: "#4ade80", fontSize: "0.9rem" }}>تم الإرسال بنجاح</div>
            <div style={{ fontSize: "0.75rem", color: "var(--nox-text-muted)", marginTop: "0.125rem" }}>
              أُرسلت في {existingData?.submittedAt
                ? new Date(existingData.submittedAt).toLocaleTimeString("ar-EG")
                : "—"}
              {" "}· للتعديل تواصل مع المدير
            </div>
          </div>
        </div>
      )}

      {/* Data Entry Form */}
      {selectedShift && !loading && (
        <form onSubmit={handleSubmit} className="animate-fade-up animate-fade-up-delay-2">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {LINE_LABELS.map((n, idx) => (
              <div
                key={n}
                className="nox-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  padding: "0.875rem 1rem",
                  animationDelay: `${idx * 0.04}s`,
                  opacity: submitted ? 0.7 : 1,
                }}
              >
                <div className="nox-number-badge">{n}</div>
                <div style={{ flex: 1, fontSize: "0.875rem", color: "var(--nox-text-2)", fontWeight: "600" }}>
                  {n} Line / NID
                </div>
                <input
                  type="number"
                  min="0"
                  className="nox-input"
                  style={{ width: "90px", textAlign: "center", padding: "0.5rem", fontSize: "1rem", fontWeight: "700" }}
                  value={values[n] || ""}
                  onChange={(e) => handleValueChange(n, e.target.value)}
                  disabled={submitted}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="nox-card" style={{
            marginTop: "0.875rem",
            background: "linear-gradient(135deg, rgba(196,30,58,0.12), rgba(26,26,26,1))",
            borderColor: "rgba(196,30,58,0.3)",
          }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: "700", color: "var(--nox-text-2)", marginBottom: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              الإجماليات التلقائية
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: "800", color: "var(--nox-red-light)", lineHeight: 1 }}>
                  {totalNids.toLocaleString("ar-EG")}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--nox-text-muted)", marginTop: "0.375rem", fontWeight: "600" }}>
                  إجمالي NIDs
                </div>
              </div>
              <div style={{ textAlign: "center", borderRight: "1px solid var(--nox-border)" }}>
                <div style={{ fontSize: "2rem", fontWeight: "800", color: "#fff", lineHeight: 1 }}>
                  {totalLines.toLocaleString("ar-EG")}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--nox-text-muted)", marginTop: "0.375rem", fontWeight: "600" }}>
                  إجمالي Lines
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          {!submitted && (
            <button
              type="submit"
              className="nox-btn nox-btn-primary nox-btn-lg"
              style={{ marginTop: "1rem" }}
              disabled={submitting || totalNids === 0}
            >
              {submitting ? (
                <span className="login-spinner" />
              ) : (
                <>إرسال البيانات 📤</>
              )}
            </button>
          )}
        </form>
      )}

      {/* Empty State */}
      {!selectedShift && !loading && (
        <div className="nox-card animate-fade-up animate-fade-up-delay-2" style={{
          textAlign: "center", padding: "2.5rem 1rem",
          borderStyle: "dashed", borderColor: "var(--nox-border-light)"
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>👆</div>
          <p style={{ color: "var(--nox-text-2)", fontWeight: "600" }}>اختر الشيفت أولاً للبدء</p>
          <p style={{ color: "var(--nox-text-muted)", fontSize: "0.8125rem", marginTop: "0.375rem" }}>
            AM · PM · BW
          </p>
        </div>
      )}

      <style jsx>{`
        .login-spinner {
          width: 22px; height: 22px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
