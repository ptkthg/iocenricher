const available = status => status === 'ok' || status === 'no_match';
const stable = value => JSON.stringify(value ?? null);
const ids = values => [...new Set(values)].sort();

export function compareObservations(before, after) {
  if (!before || !after || before.indicator !== after.indicator) return [];
  const changes = [];
  const add = (category, previous, current, state = 'observed') => changes.push({ category, previous, current, state });
  if (before.query_status !== 'error' && after.query_status !== 'error') {
    if (before.risk?.score != null && after.risk?.score != null && before.risk.score !== after.risk.score) add('Risk Score', before.risk.score, after.risk.score);
    if (before.risk?.classification && after.risk?.classification && before.risk.classification !== after.risk.classification) add('Classificação', before.risk.classification, after.risk.classification);
  } else if (before.query_status !== after.query_status) add('Comparabilidade da reputação', before.query_status || 'desconhecida', after.query_status || 'desconhecida', 'coverage');

  const sourceNames = ids([...Object.keys(before.source_status || {}), ...Object.keys(after.source_status || {})].filter(name => name !== 'groq'));
  for (const name of sourceNames) {
    const oldStatus = before.source_status?.[name];
    const newStatus = after.source_status?.[name];
    if (oldStatus !== newStatus) add(`Fonte ${name}`, oldStatus || 'não consultada', newStatus || 'não consultada', available(oldStatus) && available(newStatus) ? 'observed' : 'coverage');
    if (!available(oldStatus) || !available(newStatus)) continue;
    if (name === 'passivedns') {
      const oldDNS = ids((before.sources?.passivedns?.records || []).map(record => `${record.host} → ${record.ip}`));
      const newDNS = ids((after.sources?.passivedns?.records || []).map(record => `${record.host} → ${record.ip}`));
      if (stable(oldDNS) !== stable(newDNS)) add('DNS observado', oldDNS.join(', ') || 'nenhum registro', newDNS.join(', ') || 'nenhum registro');
    }
    if (name === 'ipinfo') {
      const oldASN = before.sources?.ipinfo?.asn || before.sources?.ipinfo?.org;
      const newASN = after.sources?.ipinfo?.asn || after.sources?.ipinfo?.org;
      if (oldASN && newASN && stable(oldASN) !== stable(newASN)) add('ASN / organização', oldASN, newASN);
    }
    if (name === 'ssl') {
      const oldCerts = ids((before.sources?.ssl?.certs || []).map(cert => String(cert.id || cert.common_name)));
      const newCerts = ids((after.sources?.ssl?.certs || []).map(cert => String(cert.id || cert.common_name)));
      if (stable(oldCerts) !== stable(newCerts)) add('Certificados observados', oldCerts.join(', ') || 'nenhum', newCerts.join(', ') || 'nenhum');
    }
  }
  if (before.query_status === 'complete' && after.query_status === 'complete') {
    const oldTechniques = ids((before.mitre || []).map(item => item.id));
    const newTechniques = ids((after.mitre || []).map(item => item.id));
    if (stable(oldTechniques) !== stable(newTechniques)) add('Técnicas MITRE', oldTechniques.join(', ') || 'nenhuma', newTechniques.join(', ') || 'nenhuma');
  }
  return changes;
}
