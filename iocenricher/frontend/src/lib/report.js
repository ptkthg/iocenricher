function download(content, mime, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const timestamp = () => new Date().toISOString();
const filenameTime = () => timestamp().replace(/[:.]/g, '-');
const csvCell = value => {
  const text = String(value ?? '');
  const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function exportInvestigations(items, format) {
  const selected = items.filter(item => item && typeof item.indicator === 'string');
  if (!selected.length) return false;
  const name = `ioc-enricher-${filenameTime()}`;
  const generatedAt = timestamp();
  if (format === 'json') {
    download(JSON.stringify({ schema: 'ioc-enricher-report-v1', generatedAt, count: selected.length, investigations: selected }, null, 2), 'application/json', `${name}.json`);
    return true;
  }
  if (format === 'csv') {
    const rows = [
      ['IOC', 'Tipo', 'Classificação', 'Score', 'Confiança', 'Cobertura', 'Status da consulta', 'Fontes com resultado', 'Fatores', 'Coletado em'],
      ...selected.map(item => [item.indicator, item.type, item.risk?.classification || item.risk?.level || 'INCONCLUSIVO', item.risk?.score ?? '', item.risk?.confidence?.level || '', item.risk?.coverage ? `${item.risk.coverage.successful}/${item.risk.coverage.total}` : '', item.query_status || '', Object.keys(item.sources || {}).join('; '), (item.risk?.factors || []).join('; '), item.timestamp || '']),
    ];
    download('\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8', `${name}.csv`);
    return true;
  }
  return false;
}

export function printInvestigationReport(items) {
  const selected = items.filter(item => item && typeof item.indicator === 'string');
  if (!selected.length) return false;
  const popup = window.open('', '_blank');
  if (!popup) return false;
  const collected = timestamp();
  const sections = selected.map(item => {
    const risk = item.risk || {};
    const factors = risk.factors?.length ? risk.factors.map(factor => `<li>${escapeHtml(factor)}</li>`).join('') : '<li>Não há fatores documentados nesta observação.</li>';
    const sources = Object.entries(item.source_status || {}).filter(([name]) => name !== 'groq').map(([name, status]) => `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(status)}</td></tr>`).join('');
    const mitre = (item.mitre || []).map(technique => `<li>${escapeHtml(technique.id)} · ${escapeHtml(technique.name)} (${escapeHtml(technique.tactic)})</li>`).join('');
    const ai = item.ai_analysis;
    const aiBlock = ai ? `<h3>Análise assistida</h3><p>${escapeHtml(ai.summary || '')}</p><p><strong>Limitações:</strong> ${escapeHtml(ai.conclusion || 'Verificar hipóteses e sugestões da IA com as fontes originais.')}</p>` : '<p>Análise por IA indisponível nesta coleta.</p>';
    return `<section><h2>${escapeHtml(item.indicator)}</h2><p>Tipo: ${escapeHtml(item.type)} · Coleta: ${escapeHtml(item.timestamp || 'não informado')} · Consulta: ${escapeHtml(item.query_status || 'não informado')}</p><div class="summary"><strong>${escapeHtml(risk.classification || risk.level || 'INCONCLUSIVO')}</strong><span>Score: ${risk.score == null ? 'indisponível' : escapeHtml(risk.score) + '/100'}</span><span>Confiança: ${escapeHtml(risk.confidence?.level || 'não avaliada')}</span><span>Cobertura: ${risk.coverage ? escapeHtml(`${risk.coverage.successful}/${risk.coverage.total}`) : 'não informada'}</span></div><h3>Evidências e limitações</h3><ul>${factors}</ul><h3>Fontes consultadas</h3><table><thead><tr><th>Fonte</th><th>Status</th></tr></thead><tbody>${sources || '<tr><td colspan="2">Sem status de fontes registrado</td></tr>'}</tbody></table><h3>MITRE ATT&CK associado</h3><ul>${mitre || '<li>Nenhuma técnica mapeada com evidência suficiente.</li>'}</ul>${aiBlock}<p><strong>Recomendação:</strong> ${escapeHtml(item.recommendation || 'Revisão manual')}</p></section>`;
  }).join('');
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório IOC Enricher</title><style>body{font:12px/1.55 Arial,sans-serif;color:#17252e;max-width:900px;margin:28px auto;padding:0 18px}h1{font-size:22px;border-bottom:2px solid #327d65;padding-bottom:10px}h2{font-size:16px;overflow-wrap:anywhere}h3{font-size:12px;text-transform:uppercase;letter-spacing:.5px}section{break-inside:avoid;border-top:1px solid #c8d3d7;margin-top:24px;padding-top:12px}.summary{display:flex;gap:14px;flex-wrap:wrap;padding:10px;background:#eef4f1}table{border-collapse:collapse;width:100%}td,th{padding:5px 7px;border-bottom:1px solid #d8e0e2;text-align:left}ul{padding-left:20px}small{color:#53666d}@media print{body{margin:0;max-width:none}section{break-inside:avoid}}</style></head><body><h1>IOC Enricher · Relatório técnico</h1><small>Gerado em ${escapeHtml(collected)} · ${selected.length} observação(ões) do armazenamento local. A classificação reflete apenas as evidências obtidas no momento da coleta.</small>${sections}</body></html>`);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 250);
  return true;
}
