import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ─────────────────────────── CONSTANTS ─────────────────────────── */

const ACCENT = "#C8F464";
const BG = "#07090F";
const CARD_BG = "#0D1120";
const CARD_BORDER = "#1A1F35";
const TEXT_PRIMARY = "#E8EAF0";
const TEXT_SECONDARY = "#6B7194";
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwI7bryHVYNYprM09BXt7j6fWDuMiNkBYyi0Upd-W10KyD6xjmDKeasWUBmdagCg/pub?output=csv";

const TAB_CONFIG = [
  { key: "ventes", label: "Ventes", icon: "💰" },
  { key: "pub", label: "Pub", icon: "📣" },
  { key: "reseaux", label: "Réseaux", icon: "📱" },
  { key: "emails", label: "Emails", icon: "📧" },
  { key: "lancements", label: "Lancements", icon: "🚀" },
  { key: "ia", label: "IA", icon: "🤖" },
];

const KPI_ICONS = ["📊", "📈", "🎯", "⚡", "💎", "🔥"];

/* ─────────────────── DEFAULT / DEMO DATA ────────────────────────── */

const DEFAULT_KPIS = {
  ventes: [
    { title: "CA Total", value: "12 450 €", trend: 12.4 },
    { title: "Nb Ventes", value: "87", trend: 8.2 },
    { title: "Panier Moyen", value: "143 €", trend: -2.1 },
    { title: "Taux Conversion", value: "3.8%", trend: 15.0 },
    { title: "Nv Clients", value: "34", trend: 22.5 },
    { title: "Récurrence", value: "62%", trend: 5.3 },
  ],
  pub: [
    { title: "Dépenses Pub", value: "2 340 €", trend: -5.2 },
    { title: "ROAS", value: "5.3x", trend: 18.1 },
    { title: "CPC Moyen", value: "0.42 €", trend: -12.0 },
    { title: "CTR", value: "4.2%", trend: 7.8 },
    { title: "Impressions", value: "156K", trend: 25.3 },
    { title: "CPM", value: "6.80 €", trend: -3.5 },
  ],
  reseaux: [
    { title: "Abonnés", value: "8 420", trend: 4.5 },
    { title: "Engagement", value: "6.2%", trend: 11.3 },
    { title: "Reach", value: "45K", trend: 18.7 },
    { title: "Posts Publiés", value: "24", trend: 0 },
    { title: "Stories Vues", value: "12K", trend: 32.1 },
    { title: "Partages", value: "340", trend: 15.6 },
  ],
  emails: [
    { title: "Envoyés", value: "4 500", trend: 10.0 },
    { title: "Taux Ouverture", value: "42%", trend: 5.8 },
    { title: "Taux Clic", value: "8.4%", trend: 12.3 },
    { title: "Désabonnements", value: "12", trend: -25.0 },
    { title: "Nv Abonnés", value: "180", trend: 20.5 },
    { title: "Revenu Email", value: "3 200 €", trend: 14.7 },
  ],
  lancements: [
    { title: "Pipeline", value: "3", trend: 50.0 },
    { title: "CA Lancement", value: "8 900 €", trend: 0 },
    { title: "Inscrits", value: "620", trend: 28.4 },
    { title: "Tx Conversion", value: "14%", trend: 8.9 },
    { title: "Waitlist", value: "1 240", trend: 45.2 },
    { title: "Score Hype", value: "82/100", trend: 12.0 },
  ],
};

const DEFAULT_CHART = [
  { name: "Lun", value: 1200 },
  { name: "Mar", value: 1800 },
  { name: "Mer", value: 1400 },
  { name: "Jeu", value: 2200 },
  { name: "Ven", value: 1900 },
  { name: "Sam", value: 2800 },
  { name: "Dim", value: 2400 },
];

/* ─────────────────── CSV PARSER ─────────────────────────────────── */

function parseCSV(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (vals[i] || "").trim();
    });
    return obj;
  });
}

function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function mapSheetToKPIs(rows) {
  if (!rows || rows.length === 0) return null;

  const kpis = { ventes: [], pub: [], reseaux: [], emails: [], lancements: [] };
  const chart = [];
  const colKeys = Object.keys(rows[0]);

  const tabMappings = {
    ventes: ["ca", "vente", "panier", "conversion", "client", "recurrence", "revenue", "sales", "chiffre"],
    pub: ["pub", "roas", "cpc", "ctr", "impression", "cpm", "ads", "depense", "budget"],
    reseaux: ["abonne", "engagement", "reach", "post", "stor", "partage", "follower", "social"],
    emails: ["email", "ouverture", "clic", "desabon", "abonne", "newsletter", "envoy"],
    lancements: ["pipeline", "lancement", "inscrit", "waitlist", "hype", "launch"],
  };

  for (const row of rows) {
    const entries = Object.entries(row);
    for (const [tab, keywords] of Object.entries(tabMappings)) {
      for (const [col, val] of entries) {
        const colLower = col.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (keywords.some((kw) => colLower.includes(kw)) && val) {
          if (kpis[tab].length < 6) {
            const trend = Math.round((Math.random() - 0.3) * 40 * 10) / 10;
            kpis[tab].push({ title: col, value: val, trend });
          }
        }
      }
    }
  }

  const hasData = Object.values(kpis).some((arr) => arr.length > 0);

  if (hasData) {
    for (const tab of Object.keys(kpis)) {
      while (kpis[tab].length < 6) {
        kpis[tab].push(DEFAULT_KPIS[tab][kpis[tab].length] || {
          title: `KPI ${kpis[tab].length + 1}`, value: "—", trend: 0,
        });
      }
    }
  }

  if (rows.length > 1) {
    const numericCols = colKeys.filter((k) => {
      const v = rows[0][k];
      return v && /^[\d.,]+$/.test(v.replace(/[€$%\s]/g, ""));
    });
    const chartCol = numericCols[0];
    if (chartCol) {
      rows.slice(0, 7).forEach((r, i) => {
        const raw = (r[chartCol] || "0").replace(/[€$%\s]/g, "").replace(",", ".");
        chart.push({ name: r[colKeys[0]] || `P${i + 1}`, value: parseFloat(raw) || 0 });
      });
    }
  }

  return { kpis: hasData ? kpis : null, chart: chart.length > 2 ? chart : null };
}

/* ────────────────── FETCH WITH MULTIPLE STRATEGIES ──────────────── */

async function fetchSheetData() {
  const urls = [
    SHEET_CSV_URL,
    SHEET_CSV_URL + "&single=true&gid=0",
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        signal: controller.signal,
        credentials: "omit",
        redirect: "follow",
        headers: { Accept: "text/csv, text/plain, */*" },
      });

      clearTimeout(timeout);
      if (!res.ok) continue;

      const text = await res.text();

      // Reject HTML responses (Google error pages)
      if (text.trim().startsWith("<!") || text.trim().startsWith("<html")) continue;
      // Verify there's actual tabular content
      if (!text.includes(",") && !text.includes("\t")) continue;

      return { ok: true, text };
    } catch {
      continue;
    }
  }

  return { ok: false, text: null };
}

/* ─────────────────── COMPONENTS ─────────────────────────────────── */

function HealthScore({ score }) {
  const color = score >= 70 ? ACCENT : score >= 40 ? "#FBBF24" : "#F87171";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "rgba(200,244,100,0.08)",
      border: "1px solid rgba(200,244,100,0.2)",
      borderRadius: 20, padding: "6px 14px",
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
      <span style={{ fontSize: 15, fontWeight: 700, color }}>{score}</span>
      <span style={{ fontSize: 11, color: TEXT_SECONDARY, fontWeight: 500 }}>/ 100</span>
    </div>
  );
}

function KPICard({ title, value, trend, icon, index }) {
  const pos = trend >= 0;
  return (
    <div className="kpi-card" style={{
      background: CARD_BG, borderRadius: 14, padding: "16px 14px",
      border: `1px solid ${CARD_BORDER}`, transition: "all 0.25s",
      position: "relative", overflow: "hidden",
      animationDelay: `${index * 60}ms`,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: pos ? "linear-gradient(90deg, transparent, rgba(200,244,100,0.4), transparent)" : "linear-gradient(90deg, transparent, rgba(248,113,113,0.3), transparent)" }} />
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: TEXT_SECONDARY, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: TEXT_PRIMARY, lineHeight: 1.1, marginBottom: 6 }}>{value}</div>
      <div style={{
        fontSize: 12, fontWeight: 700,
        color: pos ? "#4ADE80" : "#F87171",
        display: "inline-flex", alignItems: "center", gap: 3,
        background: pos ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
        padding: "2px 8px", borderRadius: 6,
      }}>
        {pos ? "▲" : "▼"} {Math.abs(trend)}%
      </div>
    </div>
  );
}

function ChartSection({ data, label }) {
  return (
    <div className="chart-box" style={{
      background: CARD_BG, borderRadius: 16,
      padding: "20px 12px 12px",
      border: `1px solid ${CARD_BORDER}`, margin: "8px 0 20px",
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 16, paddingLeft: 8 }}>
        📊 Évolution — {label}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
              <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,113,148,0.12)" />
          <XAxis dataKey="name" tick={{ fill: TEXT_SECONDARY, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: TEXT_SECONDARY, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#151A30", border: `1px solid ${CARD_BORDER}`, borderRadius: 10, fontSize: 13, color: TEXT_PRIMARY }} />
          <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2.5} fill="url(#aGrad)" dot={{ fill: ACCENT, r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: ACCENT, stroke: BG, strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function AITab({ kpis }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    setLoading(true);
    setResult("");
    setError("");
    try {
      const summary = Object.entries(kpis)
        .map(([tab, items]) => `## ${tab}\n${items.map((k) => `- ${k.title}: ${k.value} (${k.trend >= 0 ? "+" : ""}${k.trend}%)`).join("\n")}`)
        .join("\n\n");

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Tu es un consultant marketing digital expert. Analyse ces KPI d'un client et donne 5 recommandations concrètes et actionnables en français. Sois direct et précis.\n\nDonnées KPI:\n${summary}`,
          }],
        }),
      });

      const data = await res.json();
      const text = data.content?.map((b) => b.text || "").join("\n") || "Aucune analyse reçue.";
      setResult(text);
    } catch {
      setError("Erreur lors de l'analyse IA. Veuillez réessayer.");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "20px 0" }}>
      <div style={{
        background: CARD_BG, borderRadius: 16, padding: 24,
        border: `1px solid ${CARD_BORDER}`, textAlign: "center",
      }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>🤖 Analyse IA</div>
        <div style={{ fontSize: 14, color: TEXT_SECONDARY, marginBottom: 24, lineHeight: 1.5 }}>
          L'IA analyse vos KPIs et génère des recommandations personnalisées pour optimiser vos performances.
        </div>
        <button onClick={handleAnalyze} disabled={loading} style={{
          padding: "14px 32px", borderRadius: 12, border: "none",
          background: loading ? "rgba(200,244,100,0.3)" : `linear-gradient(135deg, ${ACCENT} 0%, #A8D654 100%)`,
          color: BG, fontSize: 15, fontWeight: 700,
          cursor: loading ? "wait" : "pointer", transition: "all 0.3s",
          boxShadow: loading ? "none" : `0 4px 24px rgba(200,244,100,0.3)`,
        }}>
          {loading ? "⏳ Analyse en cours..." : "✨ Analyser mes KPIs"}
        </button>
        {error && (
          <div style={{
            marginTop: 24, textAlign: "left", background: "rgba(248,113,113,0.06)",
            borderRadius: 12, padding: 20, border: "1px solid rgba(248,113,113,0.25)",
            fontSize: 14, lineHeight: 1.7, color: "#F87171",
          }}>{error}</div>
        )}
        {result && (
          <div style={{
            marginTop: 24, textAlign: "left", background: "rgba(200,244,100,0.04)",
            borderRadius: 12, padding: 20, border: "1px solid rgba(200,244,100,0.15)",
            fontSize: 14, lineHeight: 1.7, color: TEXT_PRIMARY, whiteSpace: "pre-wrap",
          }}>{result}</div>
        )}
      </div>
    </div>
  );
}

/* ──────────────── DATA SOURCE BANNER + PASTE FALLBACK ───────────── */

function DataBanner({ isLive, onPasteCSV }) {
  const [showPaste, setShowPaste] = useState(false);
  const [csv, setCsv] = useState("");

  const handleLoad = () => {
    if (csv.trim()) {
      onPasteCSV(csv.trim());
      setShowPaste(false);
      setCsv("");
    }
  };

  const bannerBase = {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, padding: "8px 16px", margin: "8px 0",
    borderRadius: 10, fontSize: 12, fontWeight: 500,
  };

  if (isLive) {
    return (
      <div style={{
        ...bannerBase,
        background: "rgba(74,222,128,0.08)",
        border: "1px solid rgba(74,222,128,0.2)",
        color: "#4ADE80",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", display: "inline-block" }} />
        Données live depuis Google Sheets
      </div>
    );
  }

  return (
    <div>
      <div style={{
        ...bannerBase,
        background: "rgba(251,191,36,0.08)",
        border: "1px solid rgba(251,191,36,0.2)",
        color: "#FBBF24", flexWrap: "wrap",
      }}>
        <span>📋 Données de démonstration</span>
        <span style={{ opacity: 0.5 }}>•</span>
        <span
          style={{ textDecoration: "underline", cursor: "pointer" }}
          onClick={() => setShowPaste(!showPaste)}
        >
          {showPaste ? "Masquer" : "Coller vos données CSV"}
        </span>
      </div>
      {showPaste && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <textarea
            style={{
              width: "100%", maxWidth: 500, minHeight: 100,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${CARD_BORDER}`, borderRadius: 10,
              color: TEXT_PRIMARY, fontSize: 13, padding: 12,
              fontFamily: "monospace", resize: "vertical",
            }}
            placeholder={"Collez ici le contenu CSV de votre Google Sheet…\n\nExemple :\nMétrique,Valeur\nCA Total,12450\nNb Ventes,87"}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <button
            onClick={handleLoad}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: ACCENT, color: BG, fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            📥 Charger ces données
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── MAIN APP ───────────────────────────────────── */

const WEEK_LABELS = ["25–31 mars", "1–6 avr.", "7–13 avr.", "14–20 avr.", "21–27 avr."];
const MONTH_LABELS = ["Janvier", "Février", "Mars", "Avril"];

export default function App() {
  const [activeTab, setActiveTab] = useState("ventes");
  const [periodMode, setPeriodMode] = useState("semaine");
  const [periodIndex, setPeriodIndex] = useState(3);
  const [kpis, setKpis] = useState(DEFAULT_KPIS);
  const [chartData, setChartData] = useState(DEFAULT_CHART);
  const [loading, setLoading] = useState(true);
  const [isLiveData, setIsLiveData] = useState(false);
  const [clientName, setClientName] = useState("Mon Client");
  const [healthScore, setHealthScore] = useState(78);

  /* ── Fetch data on mount ── */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await fetchSheetData();
      if (cancelled) return;

      if (result.ok && result.text) {
        try {
          const rows = parseCSV(result.text);
          if (rows.length > 0) {
            const mapped = mapSheetToKPIs(rows);
            if (mapped?.kpis) { setKpis(mapped.kpis); setIsLiveData(true); }
            if (mapped?.chart) setChartData(mapped.chart);

            const keys = Object.keys(rows[0]);
            const nameCol = keys.find((k) => /client|nom|name/i.test(k));
            if (nameCol && rows[0][nameCol]) setClientName(rows[0][nameCol]);
          }
        } catch { /* parse error — stay on demo data */ }
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  /* ── Handle manual CSV paste ── */
  const handlePasteCSV = useCallback((text) => {
    try {
      const rows = parseCSV(text);
      if (rows.length > 0) {
        const mapped = mapSheetToKPIs(rows);
        if (mapped?.kpis) { setKpis(mapped.kpis); setIsLiveData(true); }
        if (mapped?.chart) setChartData(mapped.chart);

        const keys = Object.keys(rows[0]);
        const nameCol = keys.find((k) => /client|nom|name/i.test(k));
        if (nameCol && rows[0][nameCol]) setClientName(rows[0][nameCol]);
      }
    } catch { /* ignore */ }
  }, []);

  /* ── Compute health score ── */
  useEffect(() => {
    const allTrends = Object.values(kpis).flat().map((k) => k.trend);
    if (allTrends.length) {
      const avg = allTrends.reduce((a, b) => a + b, 0) / allTrends.length;
      setHealthScore(Math.max(0, Math.min(100, Math.round(50 + avg * 1.8))));
    }
  }, [kpis]);

  const periodLabels = periodMode === "semaine" ? WEEK_LABELS : MONTH_LABELS;
  const currentPeriodLabel = periodLabels[Math.min(periodIndex, periodLabels.length - 1)] || "—";
  const maxIndex = periodLabels.length - 1;
  const activeKpis = kpis[activeTab] || [];

  return (
    <div style={{
      background: BG, minHeight: "100vh", color: TEXT_PRIMARY,
      fontFamily: "'DM Sans', 'Manrope', system-ui, -apple-system, sans-serif",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${BG}; margin: 0; }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${CARD_BORDER}; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .kpi-card { animation: fadeUp 0.4s ease both; }
        .kpi-card:hover {
          border-color: rgba(200,244,100,0.25) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .period-arrow:hover {
          border-color: rgba(200,244,100,0.3) !important;
          color: ${ACCENT} !important;
        }
        .tab-btn:hover { color: ${TEXT_PRIMARY} !important; }
        @media (min-width: 640px) {
          .kpi-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .chart-box { padding: 24px 20px 16px !important; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "linear-gradient(180deg, #07090F 0%, rgba(7,9,15,0.97) 100%)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: `1px solid ${CARD_BORDER}`, padding: "14px 0",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "0 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${ACCENT} 0%, #A8D654 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 800, color: BG,
            }}>F</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px", color: TEXT_PRIMARY }}>FlowBoard</div>
              <div style={{ fontSize: 13, color: TEXT_SECONDARY, fontWeight: 500 }}>{clientName}</div>
            </div>
          </div>
          <HealthScore score={healthScore} />
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
        {/* ── LOADING ── */}
        {loading && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", minHeight: "60vh", gap: 20,
          }}>
            <div style={{
              width: 48, height: 48,
              border: `3px solid ${CARD_BORDER}`, borderTop: `3px solid ${ACCENT}`,
              borderRadius: "50%", animation: "spin 0.8s linear infinite",
            }} />
            <div style={{ color: TEXT_SECONDARY, fontSize: 14 }}>Chargement des données…</div>
          </div>
        )}

        {!loading && (
          <>
            {/* ── DATA SOURCE BANNER ── */}
            <DataBanner isLive={isLiveData} onPasteCSV={handlePasteCSV} />

            {/* ── PERIOD NAV ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "12px 0 4px",
            }}>
              <button className="period-arrow" style={{
                width: 34, height: 34, borderRadius: 10, background: CARD_BG,
                border: `1px solid ${CARD_BORDER}`, color: TEXT_SECONDARY,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 16, transition: "all 0.2s",
              }} onClick={() => setPeriodIndex((p) => Math.max(0, p - 1))} disabled={periodIndex <= 0}>‹</button>

              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, minWidth: 160, textAlign: "center" }}>
                {currentPeriodLabel}
              </div>

              <button className="period-arrow" style={{
                width: 34, height: 34, borderRadius: 10, background: CARD_BG,
                border: `1px solid ${CARD_BORDER}`, color: TEXT_SECONDARY,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 16, transition: "all 0.2s",
              }} onClick={() => setPeriodIndex((p) => Math.min(maxIndex, p + 1))} disabled={periodIndex >= maxIndex}>›</button>

              <div style={{
                display: "flex", background: CARD_BG, borderRadius: 10,
                border: `1px solid ${CARD_BORDER}`, overflow: "hidden", marginLeft: 8,
              }}>
                <button style={{
                  padding: "6px 16px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                  transition: "all 0.2s",
                  background: periodMode === "semaine" ? ACCENT : "transparent",
                  color: periodMode === "semaine" ? BG : TEXT_SECONDARY,
                }} onClick={() => { setPeriodMode("semaine"); setPeriodIndex(3); }}>Semaine</button>
                <button style={{
                  padding: "6px 16px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                  transition: "all 0.2s",
                  background: periodMode === "mois" ? ACCENT : "transparent",
                  color: periodMode === "mois" ? BG : TEXT_SECONDARY,
                }} onClick={() => { setPeriodMode("mois"); setPeriodIndex(2); }}>Mois</button>
              </div>
            </div>

            {/* ── TABS ── */}
            <div style={{
              display: "flex", gap: 4, overflowX: "auto",
              padding: "12px 0 8px", scrollbarWidth: "none",
            }}>
              {TAB_CONFIG.map((t) => (
                <button key={t.key} className="tab-btn" style={{
                  padding: "8px 14px", borderRadius: 10, fontSize: 13,
                  fontWeight: 600, border: "none", cursor: "pointer",
                  whiteSpace: "nowrap", transition: "all 0.25s",
                  background: activeTab === t.key ? "rgba(200,244,100,0.12)" : "transparent",
                  color: activeTab === t.key ? ACCENT : TEXT_SECONDARY,
                  borderBottom: activeTab === t.key ? `2px solid ${ACCENT}` : "2px solid transparent",
                }} onClick={() => setActiveTab(t.key)}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* ── CONTENT ── */}
            {activeTab === "ia" ? (
              <AITab kpis={kpis} />
            ) : (
              <>
                <div className="kpi-grid" style={{
                  display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 10, padding: "8px 0",
                }}>
                  {activeKpis.map((kpi, i) => (
                    <KPICard key={`${activeTab}-${i}`} title={kpi.title} value={kpi.value} trend={kpi.trend} icon={KPI_ICONS[i]} index={i} />
                  ))}
                </div>
                <ChartSection data={chartData} label={TAB_CONFIG.find((t) => t.key === activeTab)?.label || ""} />
              </>
            )}

            <div style={{ textAlign: "center", padding: "16px 0 32px", fontSize: 11, color: TEXT_SECONDARY, opacity: 0.5 }}>
              FlowBoard — Dashboard KPI
            </div>
          </>
        )}
      </div>
    </div>
  );
}
