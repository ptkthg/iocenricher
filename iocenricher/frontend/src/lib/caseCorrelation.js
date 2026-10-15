export function correlateCase(record, history) {
  if (!record?.iocs?.length) return [];
  const allowed = new Set(record.iocs);
  const edges = new Map();
  const add = (from, to, relation, source, timestamp, confidence, detail) => {
    if (from === to || !allowed.has(from) || !allowed.has(to)) return;
    const key = `${from}|${to}|${relation}|${source}`;
    if (!edges.has(key)) edges.set(key, { from, to, relation, evidence: { source, timestamp, confidence, detail } });
  };
  for (const item of history) {
    if (!allowed.has(item.indicator)) continue;
    const timestamp = item.timestamp || null;
    if (item.type === 'url') {
      try { add(item.indicator, new URL(item.indicator).hostname, 'URL pertence ao domínio', 'URL fornecida', timestamp, 'ALTA', 'Hostname extraído diretamente da URL.'); } catch {}
    }
    if (item.type === 'domain' && item.source_status?.passivedns === 'ok') {
      for (const entry of item.sources?.passivedns?.records || []) {
        if (entry.host?.toLowerCase() === item.indicator.toLowerCase()) add(item.indicator, entry.ip, 'Domínio observado no IP', 'HackerTarget Passive DNS', timestamp, 'MÉDIA', `${entry.host} → ${entry.ip}`);
      }
    }
    if (item.type === 'ip' && item.source_status?.passivedns === 'ok') {
      for (const domain of item.sources?.passivedns?.domains || []) add(item.indicator, domain, 'IP observado com domínio', 'HackerTarget Reverse IP', timestamp, 'MÉDIA', domain);
    }
  }
  return [...edges.values()];
}
