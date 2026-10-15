import { useMemo, useState } from 'react';
import { clearHistory } from '../lib/api';
import { deleteInvestigation } from '../lib/investigationStore';
import { exportInvestigations } from '../lib/report';
import { C, RISK_CFG, fmtDate } from '../lib/theme';
import CaseNotebook from '../components/CaseNotebook';

const classification = item => item.query_status === 'error' ? 'ERRO DE CONSULTA' : item.risk?.classification || item.risk?.level || 'INCONCLUSIVO';
const periodMs = { '24 horas': 86_400_000, '7 dias': 604_800_000, '30 dias': 2_592_000_000 };

export default function History({ history, setHistory, onNavigate, onInvestigate, onOpenObservation }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('Todos');
  const [risk, setRisk] = useState('Todos');
  const [period, setPeriod] = useState('Todos');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [view, setView] = useState('history');
  const perPage = 14;
  const list = useMemo(() => history.filter(item => {
    if (query && !`${item.indicator} ${item.type} ${Object.keys(item.sources || {}).join(' ')}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (type !== 'Todos' && item.type?.toLowerCase() !== type.toLowerCase()) return false;
    if (risk !== 'Todos' && classification(item) !== risk) return false;
    if (period !== 'Todos' && Date.now() - new Date(item.timestamp).getTime() > periodMs[period]) return false;
    return true;
  }).sort((a, b) => sort === 'score' ? (b.risk?.score ?? -1) - (a.risk?.score ?? -1) : sort === 'name' ? a.indicator.localeCompare(b.indicator) : new Date(b.timestamp || 0) - new Date(a.timestamp || 0)), [history, query, type, risk, period, sort]);
  const pageCount = Math.max(1, Math.ceil(list.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const rows = list.slice((currentPage - 1) * perPage, currentPage * perPage);

  async function remove(item) {
    if (!window.confirm(`Excluir a observação de ${item.indicator} coletada em ${fmtDate(item.timestamp)}?`)) return;
    try { setHistory(await deleteInvestigation(item.indicator, item.timestamp)); setMessage('Observação excluída do armazenamento local.'); }
    catch { setMessage('Não foi possível excluir a observação.'); }
  }
  async function clear() {
    if (!window.confirm('Apagar todo o histórico local de investigações?')) return;
    try { await clearHistory(); setHistory([]); setPage(1); setMessage('Histórico local apagado.'); }
    catch { setMessage('Não foi possível apagar o histórico. Nenhum dado foi removido do navegador.'); }
  }
  const resetPage = setter => event => { setter(event.target.value); setPage(1); };

  if (view === 'cases') return <CaseNotebook history={history} onShowHistory={() => setView('history')} onInvestigate={onInvestigate} />;
  return <div className="stack">
    <div className="toolbar" style={{ justifyContent: 'space-between' }}><div><h1 className="page-title">Casos e histórico</h1><p className="page-subtitle">Observações de IOC salvas neste navegador. Cada coleta é preservada separadamente.</p></div><div className="toolbar"><button className="btn" onClick={() => setView('cases')}>Casos locais</button><button className="btn" disabled={!list.length} onClick={() => exportInvestigations(list, 'csv')}>↓ Exportar CSV</button><button className="btn btn-primary" onClick={() => onNavigate('Enrichment')}>＋ Nova investigação</button></div></div>
    <div className="grid-4">{[
      ['Observações', history.length, C.text],
      ['Maliciosas', history.filter(item => classification(item) === 'MALICIOSO').length, C.red],
      ['Suspeitas', history.filter(item => classification(item) === 'SUSPEITO').length, C.yellow],
      ['Inconclusivas / erro', history.filter(item => ['INCONCLUSIVO', 'ERRO DE CONSULTA'].includes(classification(item))).length, C.textMuted],
    ].map(([label, value, color]) => <div key={label} className="panel kpi"><div className="kpi-label">{label}</div><div className="kpi-value" style={{ color }}>{value}</div><div className="kpi-note">Armazenamento local</div></div>)}</div>
    {message && <div className="panel panel-pad" role="status">{message}</div>}
    <div className="panel panel-pad toolbar"><input className="field" style={{ flex: '1 1 260px' }} aria-label="Buscar IOC" placeholder="Buscar IOC ou fonte..." value={query} onChange={resetPage(setQuery)} /><select className="field" aria-label="Tipo" value={type} onChange={resetPage(setType)}>{['Todos', 'IP', 'Domain', 'URL', 'Hash'].map(value => <option key={value}>{value}</option>)}</select><select className="field" aria-label="Classificação" value={risk} onChange={resetPage(setRisk)}>{['Todos', 'MALICIOSO', 'SUSPEITO', 'BAIXO_RISCO_OBSERVADO', 'INCONCLUSIVO', 'ERRO DE CONSULTA'].map(value => <option key={value}>{value}</option>)}</select><select className="field" aria-label="Período" value={period} onChange={resetPage(setPeriod)}>{['Todos', '24 horas', '7 dias', '30 dias'].map(value => <option key={value}>{value}</option>)}</select><select className="field" aria-label="Ordenação" value={sort} onChange={resetPage(setSort)}><option value="recent">Mais recentes</option><option value="score">Maior score</option><option value="name">IOC A–Z</option></select></div>
    <div className="panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>IOC</th><th>Tipo</th><th>Score</th><th>Classificação</th><th>Fontes com resultado</th><th>Coletado em</th><th>Ações</th></tr></thead><tbody>{rows.map((item, index) => <tr key={`${item.indicator}-${item.timestamp}-${index}`}><td className="truncate" title={item.indicator}>{item.indicator}</td><td>{item.type?.toUpperCase() || '—'}</td><td>{item.risk?.score == null ? '—' : `${item.risk.score}/100`}</td><td><span className="badge" style={{ color: RISK_CFG[item.risk?.level]?.color || C.textMuted }}>{classification(item)}</span></td><td>{Object.keys(item.sources || {}).join(', ') || '—'}</td><td>{fmtDate(item.timestamp)}</td><td><div className="toolbar"><button className="btn" style={{ padding: '4px 8px' }} onClick={() => onOpenObservation(item)}>Ver snapshot</button><button className="btn" style={{ padding: '4px 8px', color: C.red }} onClick={() => remove(item)}>Excluir</button></div></td></tr>)}</tbody></table></div>{!rows.length && <div className="empty">Nenhuma observação corresponde aos filtros.</div>}<div className="toolbar" style={{ justifyContent: 'space-between', padding: 12 }}><span style={{ color: C.textMuted }}>Mostrando {rows.length ? (currentPage - 1) * perPage + 1 : 0}–{Math.min(currentPage * perPage, list.length)} de {list.length}</span><div className="toolbar"><button className="btn" disabled={currentPage <= 1} onClick={() => setPage(value => value - 1)}>‹</button><span>{currentPage} / {pageCount}</span><button className="btn" disabled={currentPage >= pageCount} onClick={() => setPage(value => value + 1)}>›</button></div></div></div>
    <div className="toolbar" style={{ justifyContent: 'flex-end' }}><button className="btn" style={{ color: C.red }} disabled={!history.length} onClick={clear}>Limpar histórico local</button></div>
  </div>;
}
