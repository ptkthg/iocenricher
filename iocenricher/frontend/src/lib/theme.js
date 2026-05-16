export const C = {
  bg: "#030d1c",
  bgSidebar: "#040e1e",
  bgCard: "#081628",
  bgCardHover: "#0c1e36",
  bgInput: "#050f1e",
  border: "#132030",
  borderSubtle: "#0c1828",
  borderAccent: "rgba(96,165,250,0.18)",
  text: "#e4ecff",
  textMuted: "#6b85a8",
  textDim: "#374f68",
  accent: "#3b82f6",
  accentLight: "#60a5fa",
  accentDark: "#1d4ed8",
  accentGlow: "rgba(59,130,246,0.14)",
  red: "#f87171",
  redBg: "rgba(248,113,113,0.08)",
  redGlow: "rgba(248,113,113,0.18)",
  orange: "#fb923c",
  orangeBg: "rgba(251,146,60,0.08)",
  orangeGlow: "rgba(251,146,60,0.18)",
  yellow: "#fbbf24",
  yellowBg: "rgba(251,191,36,0.08)",
  green: "#34d399",
  greenBg: "rgba(52,211,153,0.08)",
  greenGlow: "rgba(52,211,153,0.18)",
  purple: "#a78bfa",
  purpleBg: "rgba(167,139,250,0.08)",
  purpleGlow: "rgba(167,139,250,0.18)",
  cyan: "#22d3ee",
  cyanBg: "rgba(34,211,238,0.08)",
};

export const FONT = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;

export const RISK_CFG = {
  CRÍTICO: { color: C.red, bg: C.redBg, glow: C.redGlow, label: "MALICIOUS", text: "High Risk", confidence: "High confidence of malicious activity" },
  ALTO:    { color: C.orange, bg: C.orangeBg, glow: C.orangeGlow, label: "SUSPICIOUS", text: "Elevated Risk", confidence: "Multiple suspicious indicators detected" },
  MÉDIO:   { color: C.yellow, bg: C.yellowBg, glow: "rgba(251,191,36,0.18)", label: "MONITOR", text: "Medium Risk", confidence: "Some suspicious activity observed" },
  BAIXO:   { color: C.green, bg: C.greenBg, glow: C.greenGlow, label: "CLEAN", text: "Low Risk", confidence: "No malicious activity detected" },
};

export function timeAgo(ts) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function fmtDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + " UTC";
}

export function detectType(v) {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) return "IP";
  if (/^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/.test(v)) return "Hash";
  if (/^https?:\/\/.+/i.test(v)) return "URL";
  if (v.includes(".")) return "Domain";
  return "Domain";
}
