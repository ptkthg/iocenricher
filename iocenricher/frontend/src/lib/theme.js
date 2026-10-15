export const C = {
  bg: '#071015', bgSidebar: '#081218', bgCard: '#0b171e', bgCardHover: '#10212a', bgInput: '#0a1921',
  border: '#203540', borderSubtle: '#172a34', borderAccent: '#356455',
  text: '#e3edf0', textMuted: '#9ab1bd', textDim: '#688491',
  accent: '#32d99a', accentLight: '#55edaf', accentDark: '#14976b', accentGlow: 'rgba(50,217,154,.12)',
  red: '#f0525e', redBg: 'rgba(240,82,94,.1)', redGlow: 'rgba(240,82,94,.18)',
  orange: '#f59e42', orangeBg: 'rgba(245,158,66,.1)', orangeGlow: 'rgba(245,158,66,.18)',
  yellow: '#f6bf3b', yellowBg: 'rgba(246,191,59,.1)',
  green: '#36d996', greenBg: 'rgba(54,217,150,.1)', greenGlow: 'rgba(54,217,150,.18)',
  purple: '#8d83ea', purpleBg: 'rgba(141,131,234,.1)', purpleGlow: 'rgba(141,131,234,.18)',
  cyan: '#56b9e8', cyanBg: 'rgba(86,185,232,.1)',
};
export const FONT = `'IBM Plex Mono', 'Consolas', monospace`;
export const RISK_CFG = {
  'CRÍTICO': { color: C.red, bg: C.redBg, glow: C.redGlow, label: 'MALICIOSO', text: 'Risco crítico', confidence: 'Evidência de atividade maliciosa' },
  ALTO: { color: C.red, bg: C.redBg, glow: C.redGlow, label: 'MALICIOSO', text: 'Risco alto', confidence: 'Múltiplos sinais de risco' },
  'MÉDIO': { color: C.yellow, bg: C.yellowBg, glow: C.orangeGlow, label: 'SUSPEITO', text: 'Risco médio', confidence: 'Atividade suspeita observada' },
  BAIXO: { color: C.green, bg: C.greenBg, glow: C.greenGlow, label: 'BAIXO RISCO', text: 'Risco baixo', confidence: 'Nenhum sinal malicioso observado' },
  INCONCLUSIVO: { color: C.textMuted, bg: C.bgInput, glow: 'transparent', label: 'INCONCLUSIVO', text: 'Dados insuficientes', confidence: 'Fontes de reputação sem resposta' },
};
export function timeAgo(ts) {
  if (!ts) return '—';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  if (minutes < 1440) return `há ${Math.floor(minutes / 60)} h`;
  return `há ${Math.floor(minutes / 1440)} d`;
}
export function fmtDate(ts) { return ts ? new Date(ts).toLocaleString('pt-BR') : '—'; }
export function detectType(v) {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) return 'IP';
  if (/^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/.test(v)) return 'Hash';
  if (/^https?:\/\/.+/i.test(v)) return 'URL';
  return 'Domain';
}
