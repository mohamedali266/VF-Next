export default function UnauthorizedPage() {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      textAlign: "center"
    }}>
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🚫</div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--nox-red-light)", marginBottom: "0.5rem" }}>
        غير مصرح
      </h1>
      <p style={{ color: "var(--nox-text-2)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        ليس لديك صلاحية الوصول إلى هذه الصفحة
      </p>
      <a href="/" className="nox-btn nox-btn-primary nox-btn-md">
        العودة للرئيسية
      </a>
    </div>
  );
}
