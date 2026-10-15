export const BULK_STORAGE_KEY = 'bulk_results';
export const BULK_LIMIT = 10;

export function parseIndicators(text) {
  const seen = new Set();
  return text.split(/\r?\n/).map(value => value.trim()).filter(value => {
    if (!value) return false;
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function loadBulkResults(storage) {
  try {
    const value = JSON.parse(storage.getItem(BULK_STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter(item => item && typeof item.indicator === 'string') : [];
  } catch { return []; }
}

function indicatorType(value) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return 'ip';
  if (/^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$/i.test(value)) return 'hash';
  if (/^https?:\/\//i.test(value)) return 'url';
  return 'domain';
}

export async function analyzeBulkIndicator(indicator, enrich) {
  try {
    const data = await enrich(indicator);
    return { ...data, indicator, type: data.type || indicatorType(indicator), timestamp: data.timestamp || new Date().toISOString() };
  } catch (error) {
    return {
      indicator, type: indicatorType(indicator),
      risk: { score: null, level: 'INCONCLUSIVO', classification: 'ERRO_DE_CONSULTA', factors: [] },
      query_status: 'error', recommendation: null, timestamp: new Date().toISOString(),
      error: error?.message || 'Falha na consulta',
    };
  }
}
