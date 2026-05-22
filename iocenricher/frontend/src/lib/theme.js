export const C = {
  bg:           "var(--c-bg)",
  bgSidebar:    "var(--c-bg-sidebar)",
  bgCard:       "var(--c-bg-card)",
  bgCardHover:  "var(--c-bg-card-hover)",
  bgInput:      "var(--c-bg-input)",

  border:       "var(--c-border)",
  borderSubtle: "var(--c-border-subtle)",
  borderAccent: "var(--c-border-accent)",

  text:         "var(--c-text)",
  textMuted:    "var(--c-text-muted)",
  textDim:      "var(--c-text-dim)",

  accent:       "var(--c-accent)",
  accentLight:  "var(--c-accent-light)",
  accentDark:   "var(--c-accent-dark)",
  accentGlow:   "var(--c-accent-glow)",
  accentBorder: "var(--c-accent-border)",

  red:          "var(--c-red)",
  redBg:        "var(--c-red-bg)",
  redGlow:      "var(--c-red-glow)",
  redBorder:    "var(--c-red-border)",

  orange:       "var(--c-orange)",
  orangeBg:     "var(--c-orange-bg)",
  orangeGlow:   "var(--c-orange-glow)",
  orangeBorder: "var(--c-orange-border)",

  yellow:       "var(--c-yellow)",
  yellowBg:     "var(--c-yellow-bg)",
  yellowBorder: "var(--c-yellow-border)",

  green:        "var(--c-green)",
  greenBg:      "var(--c-green-bg)",
  greenGlow:    "var(--c-green-glow)",
  greenBorder:  "var(--c-green-border)",

  purple:       "var(--c-purple)",
  purpleBg:     "var(--c-purple-bg)",
  purpleGlow:   "var(--c-purple-glow)",
  purpleBorder: "var(--c-purple-border)",

  cyan:         "var(--c-cyan)",
  cyanBg:       "var(--c-cyan-bg)",
  cyanBorder:   "var(--c-cyan-border)",
};

export const FONT = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;

export const RISK_CFG = {
  CRÍTICO: { color: C.red,    bg: C.redBg,    glow: C.redGlow,    label: "MALICIOUS",  text: "High Risk",      confidence: "High confidence of malicious activity" },
  ALTO:    { color: C.orange, bg: C.orangeBg, glow: C.orangeGlow, label: "SUSPICIOUS", text: "Elevated Risk",  confidence: "Multiple suspicious indicators detected" },
  MÉDIO:   { color: C.yellow, bg: C.yellowBg, glow: "var(--c-yellow-glow)", label: "MONITOR",    text: "Medium Risk",    confidence: "Some suspicious activity observed" },
  BAIXO:   { color: C.green,  bg: C.greenBg,  glow: C.greenGlow,  label: "CLEAN",      text: "Low Risk",       confidence: "No malicious activity detected" },
};

// Lookup helpers — use when you need the matching bg/border for a semantic color
export function colorBg(c) {
  const map = {
    [C.red]: C.redBg, [C.orange]: C.orangeBg, [C.yellow]: C.yellowBg,
    [C.green]: C.greenBg, [C.purple]: C.purpleBg, [C.cyan]: C.cyanBg,
    [C.accent]: C.accentGlow, [C.accentLight]: C.accentGlow,
  };
  return map[c] || C.accentGlow;
}

export function colorBorder(c) {
  const map = {
    [C.red]: C.redBorder, [C.orange]: C.orangeBorder, [C.yellow]: C.yellowBorder,
    [C.green]: C.greenBorder, [C.purple]: C.purpleBorder, [C.cyan]: C.cyanBorder,
    [C.accent]: C.accentBorder, [C.accentLight]: C.accentBorder,
  };
  return map[c] || C.accentBorder;
}

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
