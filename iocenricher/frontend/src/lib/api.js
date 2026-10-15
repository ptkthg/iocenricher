import { saveInvestigations, clearInvestigations, loadInvestigations } from './investigationStore';
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

// Cópia de compatibilidade para abrir a interface antes do IndexedDB responder.
const STORAGE_KEY = "iocenricher_history";

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export const loadHistory = loadInvestigations;

export function addToHistory(item) { return saveInvestigations([{ ...item, _saved_at: Date.now() }]); }

export const clearHistory = clearInvestigations;
