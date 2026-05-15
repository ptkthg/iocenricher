const API_BASE = import.meta.env.VITE_API_URL || "/api";

export async function enrichIndicator(indicator) {
  const res = await fetch(`${API_BASE}/enrich`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ indicator }),
  });
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error(`Backend indisponível (HTTP ${res.status}). Verifique se o servidor está rodando.`);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro desconhecido");
  return data;
}

// Storage local — simula um histórico persistente entre sessões
const STORAGE_KEY = "iocenricher_history";

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToHistory(item) {
  const list = getHistory();
  const existing = list.findIndex(x => x.indicator === item.indicator);
  if (existing >= 0) list.splice(existing, 1);
  list.unshift({ ...item, _saved_at: Date.now() });
  const trimmed = list.slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
