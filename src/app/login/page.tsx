"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("VPN num / Username أو كلمة المرور غير صحيحة");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="login-page">
      {/* Background */}
      <div className="login-bg">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-grid" />
      </div>

      {/* Card */}
      <div className="login-container">
        <div className="login-card animate-fade-up">
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon">
              <img src="/vf-icon.svg" alt="VF-Next" width={38} height={38} style={{ display: "block" }} />
            </div>
            <div>
              <h1 className="login-logo-title">VF-Next</h1>
              <p className="login-logo-sub">Vodafone daily operations</p>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="login-welcome animate-fade-up animate-fade-up-delay-1">
            <h2 className="login-title">تسجيل الدخول</h2>
            <p className="login-subtitle">أدخل بيانات حسابك للمتابعة</p>
          </div>

          {/* Error */}
          {error && (
            <div className="vf-alert vf-alert-error animate-fade-up">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form animate-fade-up animate-fade-up-delay-2">
            <div className="login-field">
              <label className="vf-label" htmlFor="identifier">
                VPN num or Username
              </label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">#</span>
                <input
                  id="identifier"
                  type="text"
                  className="vf-input login-input"
                  placeholder="vpn number or username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login-field">
              <label className="vf-label" htmlFor="password">
                كلمة المرور
              </label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">🔒</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="vf-input login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="إظهار/إخفاء كلمة المرور"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="vf-btn vf-btn-primary vf-btn-lg login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="login-spinner" />
              ) : (
                "دخول"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="login-footer animate-fade-up animate-fade-up-delay-3">
            VF-Next v1.0
          </p>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 1.5rem;
        }

        .login-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
        }

        .login-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
        }

        .login-bg-orb-1 {
          width: 400px; height: 400px;
          background: var(--vf-red);
          top: -100px; right: -100px;
        }

        .login-bg-orb-2 {
          width: 300px; height: 300px;
          background: var(--vf-red-dark);
          bottom: -80px; left: -80px;
        }

        .login-bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(196,30,58,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(196,30,58,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
        }

        .login-card {
          background: rgba(20, 20, 20, 0.9);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(196, 30, 58, 0.2);
          border-radius: 24px;
          padding: 2rem 1.75rem;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.03),
            0 25px 60px rgba(0,0,0,0.5),
            0 0 80px rgba(196,30,58,0.08);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .login-logo {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .login-logo-icon {
          width: 52px; height: 52px;
          background: rgba(196,30,58,0.12);
          border: 1.5px solid rgba(196,30,58,0.4);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(196,30,58,0.2);
        }

        .login-logo-icon img {
          width: 36px;
          height: 36px;
          display: block;
          object-fit: contain;
        }

        .login-logo-title {
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #fff;
          line-height: 1.2;
        }

        .login-logo-sub {
          font-size: 0.75rem;
          color: var(--vf-text-2);
          font-weight: 500;
        }

        .login-welcome { text-align: center; }

        .login-title {
          font-size: 1.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-subtitle {
          font-size: 0.875rem;
          color: var(--vf-text-2);
          margin-top: 0.25rem;
        }

        .login-form { display: flex; flex-direction: column; gap: 1rem; }

        .login-field { display: flex; flex-direction: column; gap: 0.375rem; }

        .login-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .login-input-icon {
          position: absolute;
          right: 1rem;
          font-size: 1rem;
          z-index: 1;
          pointer-events: none;
        }

        .login-input {
          padding-right: 2.75rem;
          padding-left: 2.75rem;
          text-align: right;
        }

        .login-eye-btn {
          position: absolute;
          left: 1rem;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          padding: 0;
          line-height: 1;
          z-index: 1;
        }

        .login-submit-btn {
          margin-top: 0.5rem;
          height: 52px;
          font-size: 1.0625rem;
          letter-spacing: 0.025em;
        }

        .login-spinner {
          width: 22px; height: 22px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .login-footer {
          text-align: center;
          font-size: 0.75rem;
          color: var(--vf-text-muted);
        }
      `}</style>
    </div>
  );
}
