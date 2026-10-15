import { useEffect, useMemo, useState } from 'react';
import { loadCases, saveCase } from '../lib/investigationStore';
import { C, fmtDate } from '../lib/theme';
import { correlateCase } from '../lib/caseCorrelation';

const statuses = ['Aberto', 'Em investigação', 'Aguardando evidências', 'Concluído', 'Arquivado'];
const priorities = ['Baixa', 'Média', 'Alta', 'Crítica'];
const empty = () => ({ title: '', description: '', status: 'Aberto', priority: 'Média', iocs: [], notes: '', hypotheses: '', evidence: '', conclusions: '', decisions: '' });
const fields = [['notes', 'Notas'], ['hypotheses', 'Hipóteses'], ['evidence', 'Evidências'], ['conclusions', 'Conclusões'], ['decisions', 'Decisões registradas']];

export default function CaseNotebook({ history, onShowHistory, onInvestigate }) {
  const [cases, setCases] = useState([]);
  const [draft, setDraft] = useState(empty);
  const [selected, setSelected] = useState('');
  const [indicator, setIndicator] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { loadCases().then(setCases).catch(() => setMessage('Casos locais indisponíveis neste navegador.')); }, []);
  const indicators = useMemo(() => [...new Set(history.map(item => item.indicator))].sort(), [history]);
  const relationships = useMemo(() => correlateCase(draft, history), [draft, history]);
  function choose(record) { setSelected(record.id); setDraft({ ...record }); setMessage(''); }
  function create() { setSelected(''); setDraft(empty()); setMessage(''); }
  function update(key, value) { setDraft(previous => ({ ...previous, [key]: value })); }
  async function persist(record = draft) {
    try { const updated = await saveCase(record); setCases(await loadCases()); choose(updated); setMessage('Caso salvo neste navegador.'); }
    catch { setMessage('Não foi possível salvar o caso. Informe um título de até 200 caracteres.'); }
  }
  function exportCase() {
    if (!draft.id) return;
    const content = JSON.stringify({ schema: 'ioc-enricher-case-v1', exportedAt: new Date().toISOString(), case: draft, relationships }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `caso-${draft.id}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="stack">
    <div className="toolbar" style={{ justifyContent: 'space-between' }}><div><h1 className="page-title">Casos investigativos</h1><p className="page-subtitle">Organize IOCs, hipóteses, evidências e decisões localmente.</p></div><div className="toolbar"><button className="btn" onClick={onShowHistory}>Ver histórico</button><button className="btn btn-primary" onClick={create}>＋ Novo caso</button></div></div>
    {message && <div className="panel panel-pad" role="status">{message}</div>}
    <div className="case-layout"><aside className="panel panel-pad"><h2 className="panel-title">Casos salvos · {cases.length}</h2>{cases.length ? cases.map(record => <button key={record.id} className={`sidebar-link ${selected === record.id ? 'active' : ''}`} onClick={() => choose(record)} style={{ display: 'block', overflowWrap: 'anywhere' }}><strong>{record.title}</strong><div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{record.status} · {fmtDate(record.updatedAt)}</div></button>) : <div className="empty">Nenhum caso criado.</div>}</aside>
      <div className="panel panel-pad stack"><div className="toolbar" style={{ justifyContent: 'space-between' }}><h2 className="panel-title">{draft.id ? `Caso ${draft.id.slice(0, 8)}` : 'Novo caso'}</h2>{draft.id && <span style={{ color: C.textMuted }}>Criado em {fmtDate(draft.createdAt)}</span>}</div>
        <label>Título<input className="field" value={draft.title} maxLength={200} onChange={event => update('title', event.target.value)} style={{ display: 'block', width: '100%', marginTop: 5 }} /></label>
        <label>Descrição<textarea className="field" value={draft.description} maxLength={5000} onChange={event => update('description', event.target.value)} rows={3} style={{ display: 'block', width: '100%', marginTop: 5 }} /></label>
        <div className="toolbar"><label>Status<select className="field" value={draft.status} onChange={event => update('status', event.target.value)} style={{ display: 'block', marginTop: 5 }}>{statuses.map(value => <option key={value}>{value}</option>)}</select></label><label>Prioridade<select className="field" value={draft.priority} onChange={event => update('priority', event.target.value)} style={{ display: 'block', marginTop: 5 }}>{priorities.map(value => <option key={value}>{value}</option>)}</select></label></div>
        <div><h3 className="panel-title">IOCs associados · {draft.iocs.length}</h3><div className="toolbar"><select className="field" aria-label="IOC salvo" value={indicator} onChange={event => setIndicator(event.target.value)}><option value="">Selecionar IOC investigado</option>{indicators.filter(value => !draft.iocs.includes(value)).map(value => <option key={value}>{value}</option>)}</select><button className="btn" disabled={!indicator} onClick={() => { update('iocs', [...draft.iocs, indicator]); setIndicator(''); }}>Associar</button></div><div className="toolbar" style={{ marginTop: 8 }}>{draft.iocs.map(value => <span key={value} className="badge muted"><button style={{ color: C.text, background: 'none', border: 0 }} onClick={() => onInvestigate(value)}>{value}</button><button aria-label={`Remover ${value} do caso`} style={{ color: C.red, background: 'none', border: 0 }} onClick={() => update('iocs', draft.iocs.filter(item => item !== value))}>×</button></span>)}</div></div>
        <div><h3 className="panel-title">Relações verificáveis · {relationships.length}</h3>{relationships.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>De</th><th>Relação</th><th>Para</th><th>Origem</th><th>Confiança</th></tr></thead><tbody>{relationships.map((edge, index) => <tr key={`${edge.from}-${edge.to}-${index}`} title={`${edge.evidence.detail} · ${edge.evidence.timestamp}`}><td>{edge.from}</td><td>{edge.relation}</td><td>{edge.to}</td><td>{edge.evidence.source}</td><td>{edge.evidence.confidence}</td></tr>)}</tbody></table></div> : <p style={{ color: C.textMuted }}>Nenhuma relação direta foi comprovada entre os IOCs associados.</p>}<p style={{ color: C.textMuted, fontSize: 11 }}>Compartilhar ASN ou provedor não estabelece uma campanha comum.</p></div>
        {fields.map(([key, label]) => <label key={key}>{label}<textarea className="field" value={draft[key] || ''} maxLength={10_000} onChange={event => update(key, event.target.value)} rows={3} style={{ display: 'block', width: '100%', marginTop: 5 }} /></label>)}
        <div className="toolbar"><button className="btn btn-primary" onClick={() => persist()}>Salvar caso</button>{draft.id && <><button className="btn" onClick={() => persist({ ...draft, status: draft.status === 'Arquivado' ? 'Aberto' : 'Arquivado' })}>{draft.status === 'Arquivado' ? 'Reabrir' : 'Arquivar'}</button><button className="btn" onClick={exportCase}>Exportar JSON</button></>}</div>
      </div>
    </div>
  </div>;
}
