"use client";

import { FileText, Loader2, Package, Search, Layers } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const SR_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAzLqgdGOXKaiEatzK1KOw5Ne_6TKDeYiktjh-EaQsIURhnQ_GVcmxxdBiWq0C_4RW7Js8nog3v4X6/pub?output=csv&gid=23806691";
const SKU_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAzLqgdGOXKaiEatzK1KOw5Ne_6TKDeYiktjh-EaQsIURhnQ_GVcmxxdBiWq0C_4RW7Js8nog3v4X6/pub?output=csv&gid=643264885";

type SRItem = Record<string, string>;
type SKUItem = Record<string, string>;

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Simple CSV parser supporting quotes
  const parseLine = (line: string) => {
    const res: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        res.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    res.push(cur.trim());
    return res;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim());
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    if (row.length === 0) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || "";
    });
    records.push(obj);
  }

  return records;
}

export default function SrSkuClient() {
  const [tab, setTab] = useState<"sr" | "sku">("sr");
  const [srData, setSrData] = useState<SRItem[]>([]);
  const [skuData, setSkuData] = useState<SKUItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [srSearch, setSrSearch] = useState("");
  const [srCategory, setSrCategory] = useState("");

  const [skuSearch, setSkuSearch] = useState("");
  const [skuCategory, setSkuCategory] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [srRes, skuRes] = await Promise.all([
        fetch(SR_URL).then((r) => r.text()),
        fetch(SKU_URL).then((r) => r.text()),
      ]);
      setSrData(parseCsv(srRes));
      setSkuData(parseCsv(skuRes));
    } catch (e) {
      console.error(e);
      setError("فشل تحميل البيانات التلقائية. يرجى التحقق من الاتصال.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  // SR Categories
  const srCategories = useMemo(() => {
    const cats = new Set<string>();
    srData.forEach((item) => {
      const cat = item["main category"] || item["maincategory"] || item["category"] || "";
      if (cat) cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [srData]);

  // SKU Categories
  const skuCategories = useMemo(() => {
    const cats = new Set<string>();
    skuData.forEach((item) => {
      const cat = item["main category"] || item["category"] || (item["bundle description"] ? item["bundle description"].split(" ")[0] : "");
      if (cat) cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [skuData]);

  // Filtered SR
  const filteredSR = useMemo(() => {
    return srData.filter((item) => {
      const mainCat = item["main category"] || item["maincategory"] || item["category"] || "";
      const matchesCategory = !srCategory || mainCat === srCategory;
      const search = srSearch.toLowerCase();
      const matchesSearch = !search || Object.values(item).some((v) => v.toLowerCase().includes(search));
      return matchesCategory && matchesSearch;
    });
  }, [srData, srSearch, srCategory]);

  // Grouped SR by Reason
  const groupedSR = useMemo(() => {
    const groups: Record<string, SRItem[]> = {};
    filteredSR.forEach((item) => {
      const reason = item["sr reason"] || item["srreason"] || item["reason"] || "General SR";
      if (!groups[reason]) groups[reason] = [];
      groups[reason].push(item);
    });
    return groups;
  }, [filteredSR]);

  // Filtered SKU
  const filteredSKU = useMemo(() => {
    return skuData.filter((item) => {
      const mainCat = item["main category"] || item["category"] || (item["bundle description"] ? item["bundle description"].split(" ")[0] : "");
      const matchesCategory = !skuCategory || mainCat === skuCategory;
      const search = skuSearch.toLowerCase();
      const matchesSearch = !search || Object.values(item).some((v) => v.toLowerCase().includes(search));
      return matchesCategory && matchesSearch;
    });
  }, [skuData, skuSearch, skuCategory]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Hero */}
      <div className="daily-hero animate-fade-up">
        <div>
          <p>Service Requests & SKU Directory</p>
          <h1>📋 SR & SKU</h1>
          <span>دليل طلبات الخدمة ورموز الـ SKU والباكات المتاحة.</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", background: "var(--vf-surface-2)", borderRadius: "16px", padding: "0.375rem" }}>
        <button
          onClick={() => setTab("sr")}
          style={{
            flex: 1, padding: "0.625rem", borderRadius: "12px", border: "none", cursor: "pointer",
            fontSize: "0.875rem", fontWeight: "700", fontFamily: "inherit", transition: "all 0.2s",
            background: tab === "sr" ? "linear-gradient(135deg, var(--vf-red), var(--vf-red-dark))" : "transparent",
            color: tab === "sr" ? "#fff" : "var(--vf-text-muted)",
            boxShadow: tab === "sr" ? "0 2px 8px rgba(196,30,58,0.3)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
          }}
        >
          <FileText size={18} />
          📝 SR (Service Requests)
        </button>

        <button
          onClick={() => setTab("sku")}
          style={{
            flex: 1, padding: "0.625rem", borderRadius: "12px", border: "none", cursor: "pointer",
            fontSize: "0.875rem", fontWeight: "700", fontFamily: "inherit", transition: "all 0.2s",
            background: tab === "sku" ? "linear-gradient(135deg, var(--vf-red), var(--vf-red-dark))" : "transparent",
            color: tab === "sku" ? "#fff" : "var(--vf-text-muted)",
            boxShadow: tab === "sku" ? "0 2px 8px rgba(196,30,58,0.3)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
          }}
        >
          <Package size={18} />
          🏷️ SKU Directory
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="vf-card" style={{ textAlign: "center", padding: "2.5rem" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "3px solid var(--vf-border)", borderTopColor: "var(--vf-red)",
            animation: "spin 0.8s linear infinite", margin: "0 auto",
          }} />
          <p style={{ color: "var(--vf-text-muted)", marginTop: "0.875rem", fontSize: "0.875rem" }}>جاري جلب البيانات...</p>
        </div>
      )}

      {error && (
        <div className="vf-card" style={{ textAlign: "center", padding: "1.5rem", color: "var(--vf-red-light)" }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── TAB: SR ── */}
      {!loading && tab === "sr" && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Controls */}
          <div className="vf-card" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
              <Search size={16} style={{ position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--vf-text-muted)" }} />
              <input
                className="vf-input"
                style={{ paddingRight: "2.5rem" }}
                placeholder="بحث في طلبات الخدمة SR..."
                value={srSearch}
                onChange={(e) => setSrSearch(e.target.value)}
              />
            </div>
            <select
              className="vf-input"
              style={{ width: "auto", minWidth: "160px" }}
              value={srCategory}
              onChange={(e) => setSrCategory(e.target.value)}
            >
              <option value="">كل التصنيفات ({srCategories.length})</option>
              {srCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {Object.keys(groupedSR).length === 0 ? (
            <div className="vf-card" style={{ textAlign: "center", padding: "2.5rem", color: "var(--vf-text-muted)", borderStyle: "dashed" }}>
              لا توجد طلبات خدمة تطابق البحث
            </div>
          ) : (
            Object.entries(groupedSR).map(([reason, items]) => (
              <div key={reason} className="vf-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--vf-border)", paddingBottom: "0.625rem" }}>
                  <div style={{ fontSize: "1rem", fontWeight: "800", color: "var(--vf-red-light)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Layers size={18} />
                    {reason}
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "800", background: "rgba(196,30,58,0.15)", color: "var(--vf-red-light)", padding: "0.2rem 0.6rem", borderRadius: "999px" }}>
                    {items.length} عنصر
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
                  {items.map((item, idx) => (
                    <div key={idx} style={{
                      background: "var(--vf-surface-2)", border: "1px solid var(--vf-border)",
                      borderRadius: "12px", padding: "0.875rem", display: "flex", flexDirection: "column", gap: "0.375rem"
                    }}>
                      {Object.entries(item).map(([k, v]) => {
                        if (!v || ["sr reason", "srreason", "reason", "main category", "maincategory"].includes(k)) return null;
                        return (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", fontSize: "0.75rem" }}>
                            <span style={{ color: "var(--vf-text-muted)", textTransform: "capitalize" }}>{k}:</span>
                            <span style={{ color: "#fff", fontWeight: "600", textAlign: "left", wordBreak: "break-word" }}>{v}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB: SKU ── */}
      {!loading && tab === "sku" && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Controls */}
          <div className="vf-card" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
              <Search size={16} style={{ position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--vf-text-muted)" }} />
              <input
                className="vf-input"
                style={{ paddingRight: "2.5rem" }}
                placeholder="بحث في الـ SKU والعروض..."
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
              />
            </div>
            <select
              className="vf-input"
              style={{ width: "auto", minWidth: "160px" }}
              value={skuCategory}
              onChange={(e) => setSkuCategory(e.target.value)}
            >
              <option value="">كل التصنيفات ({skuCategories.length})</option>
              {skuCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {filteredSKU.length === 0 ? (
            <div className="vf-card" style={{ textAlign: "center", padding: "2.5rem", color: "var(--vf-text-muted)", borderStyle: "dashed" }}>
              لا توجد عناصر SKU تطابق البحث
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.875rem" }}>
              {filteredSKU.map((item, idx) => (
                <div key={idx} className="vf-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {Object.entries(item).map(([k, v]) => {
                    if (!v) return null;
                    const isTitle = k.includes("description") || k.includes("name") || k.includes("sku");
                    return (
                      <div key={k} style={{
                        display: "flex", justifyContent: "space-between", gap: "0.5rem",
                        borderBottom: isTitle ? "1px solid var(--vf-border)" : "none",
                        paddingBottom: isTitle ? "0.375rem" : 0, marginBottom: isTitle ? "0.25rem" : 0
                      }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", textTransform: "capitalize" }}>{k}:</span>
                        <span style={{ fontSize: isTitle ? "0.875rem" : "0.75rem", fontWeight: isTitle ? "800" : "600", color: isTitle ? "var(--vf-red-light)" : "#fff", textAlign: "left", wordBreak: "break-word" }}>{v}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
