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
      <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--vf-red-light)", marginBottom: "0.5rem" }}>
        غير مصرح
      </h1>
      <p style={{ color: "var(--vf-text-2)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        ليس لديك صلاحية الوصول إلى هذه الصفحة
      </p>
      <a href="/" className="vf-btn vf-btn-primary vf-btn-md">
        العودة للرئيسية
      </a>
    </div>
  );
}
