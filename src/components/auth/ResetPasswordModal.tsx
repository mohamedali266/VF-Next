"use client";

import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, X } from "lucide-react";
import { useState } from "react";

export default function ResetPasswordModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  function resetForm() {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccessMsg("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (newPassword !== confirmPassword) {
      setError("كلمة السر الجديدة وتأكيدها غير متطابقين");
      return;
    }

    if (newPassword.length < 6) {
      setError("كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تغيير كلمة السر");

      setSuccessMsg("✅ تم تغيير كلمة السر بنجاح");
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تغيير كلمة السر");
    }

    setLoading(false);
  }

  return (
    <div className="daily-modal" onClick={handleClose}>
      <form
        className="daily-modal-card animate-fade-up"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "420px" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <KeyRound size={20} style={{ color: "var(--vf-red-light)" }} />
            <h3 style={{ fontSize: "1.0625rem", fontWeight: "800", color: "#fff" }}>
              تغيير كلمة السر
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: "var(--vf-surface-2)",
              border: "1px solid var(--vf-border)",
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: "pointer",
              color: "var(--vf-text-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", marginTop: "0.75rem" }}>
          {/* Old Password */}
          <label className="daily-field">
            <span>كلمة السر القديمة</span>
            <div style={{ position: "relative" }}>
              <input
                className="vf-input"
                type={showOld ? "text" : "password"}
                required
                placeholder="أدخل كلمة السر القديمة"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                style={{ paddingLeft: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowOld((v) => !v)}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--vf-text-muted)",
                  cursor: "pointer",
                }}
              >
                {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {/* New Password */}
          <label className="daily-field">
            <span>كلمة السر الجديدة</span>
            <div style={{ position: "relative" }}>
              <input
                className="vf-input"
                type={showNew ? "text" : "password"}
                required
                minLength={6}
                placeholder="أدخل كلمة السر الجديدة (6 أحرف فأكثر)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ paddingLeft: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--vf-text-muted)",
                  cursor: "pointer",
                }}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {/* Confirm New Password */}
          <label className="daily-field">
            <span>تأكيد كلمة السر الجديدة</span>
            <div style={{ position: "relative" }}>
              <input
                className="vf-input"
                type={showConfirm ? "text" : "password"}
                required
                minLength={6}
                placeholder="أعد كتابة كلمة السر الجديدة"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--vf-text-muted)",
                  cursor: "pointer",
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
        </div>

        {error && <div className="vf-alert vf-alert-error" style={{ marginTop: "0.75rem" }}>{error}</div>}
        {successMsg && <div className="vf-alert vf-alert-success" style={{ marginTop: "0.75rem" }}>{successMsg}</div>}

        <div className="daily-actions" style={{ marginTop: "1rem" }}>
          <button className="vf-btn vf-btn-ghost vf-btn-lg" type="button" onClick={handleClose}>
            إلغاء
          </button>
          <button className="vf-btn vf-btn-primary vf-btn-lg" type="submit" disabled={loading}>
            {loading ? <Loader2 className="daily-spin" size={18} /> : <CheckCircle2 size={18} />}
            تأكيد التغيير
          </button>
        </div>
      </form>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
