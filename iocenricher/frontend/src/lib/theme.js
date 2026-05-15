// Design tokens centralizados — usados por todas as páginas

export const C = {
  bg: "#0a1628",
  bgSidebar: "#0f1c33",
  bgCard: "#131f36",
  bgCardHover: "#172541",
  bgInput: "#0a1628",
  border: "#1f2d4a",
  borderSubtle: "#172541",
  text: "#e8edf5",
  textMuted: "#8896ad",
  textDim: "#5a6b85",
  accent: "#3b82f6",
  accentLight: "#60a5fa",
  red: "#f87171",
  redBg: "rgba(248, 113, 113, 0.1)",
  orange: "#f59e0b",
  orangeBg: "rgba(245, 158, 11, 0.1)",
  yellow: "#facc15",
  yellowBg: "rgba(250, 204, 21, 0.1)",
  green: "#10b981",
  greenBg: "rgba(16, 185, 129, 0.1)",
  purple: "#a78bfa",
  purpleBg: "rgba(167, 139, 250, 0.1)",
};

export const FONT = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;

export const RISK_CFG = {
  CRÍTICO: { color: C.red, bg: C.redBg, label: "MALICIOUS", text: "High Risk", confidence: "High confidence of malicious activity" },
  ALTO: { color: C.orange, bg: C.orangeBg, label: "SUSPICIOUS", text: "Elevated Risk", confidence: "Multiple suspicious indicators detected" },
  MÉDIO: { color: C.yellow, bg: C.yellowBg, label: "MONITOR", text: "Medium Risk", confidence: "Some suspicious activity observed" },
  BAIXO: { color: C.green, bg: C.greenBg, label: "CLEAN", text: "Low Risk", confidence: "No malicious activity detected" },
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
