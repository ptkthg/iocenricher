import { useMemo, useState } from 'react';
import { C, RISK_CFG, fmtDate } from '../lib/theme';
import Icon from '../components/Icon';
import { exportInvestigations, printInvestigationReport } from '../lib/report';

export default function Reports({ history = [] }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');
  const filtered = useMemo(() => history.map((item, index) => ({ item, index })).filter(({ item }) => item.indicator?.toLowerCase().includes(query.toLowerCase())), [history, query]);
  const chosen = selected.length ? selected.map(index => history[index]).filter(Boolean) : filtered.map(({ item }) => item);
  const allFilteredSelected = filtered.length > 0 && filtered.every(({ index }) => selected.includes(index));
  const label = selected.length ? `${chosen.length} selecionado(s)` : `${chosen.length} visível(is)`;

  function toggleAll() {
    setSelected(allFilteredSelected ? [] : filtered.map(({ index }) => index));
  }
  function toggleOne(index) {
    setSelected(previous => previous.includes(index) ? previous.filter(value => value !== index) : [...previous, index]);
  }
  function exportAs(format) {
    if (exportInvestigations(chosen, format)) setMessage(`${chosen.length} observação(ões) exportadas em ${format.toUpperCase()}.`);
  }
  function printReport() {
    setMessage(printInvestigationReport(chosen) ? 'Relatório técnico aberto para impressão ou salvar como PDF.' : 'Permita janelas deste site para imprimir o relatório.');
  }

  return <div className="stack">
    <div><h1 className="page-title">Relatórios</h1><p className="page-subtitle">Exporte observações reais salvas neste navegador. Selecione linhas ou use o conjunto filtrado.</p></div>
    <div className="panel panel-pad toolbar" style={{ justifyContent: 'space-between' }}>
      <div><strong>{history.length}</strong> observação(ões) locais <span style={{ color: C.textMuted }}>· {label} para exportação</span></div>
      <div className="toolbar">
        <button className="btn" disabled={!chosen.length} onClick={() => exportAs('json')}><Icon name="download" size={14} /> JSON</button>
        <button className="btn" disabled={!chosen.length} onClick={() => exportAs('csv')}><Icon name="download" size={14} /> CSV</button>
        <button className="btn btn-primary" disabled={!chosen.length} onClick={printReport}><Icon name="fileText" size={14} /> Imprimir / PDF</button>
      </div>
    </div>
    {message && <div className="panel panel-pad" role="status" style={{ color: C.green }}>{message}</div>}
    <div className="panel panel-pad toolbar"><input className="field" aria-label="Buscar IOC para relatório" value={query} onChange={event => { setQuery(event.target.value); setSelected([]); }} placeholder="Filtrar por indicador..." style={{ flex: '1 1 260px' }} /><span style={{ color: C.textMuted }}>Dados locais; apagar o armazenamento do navegador pode removê-los.</span></div>
    <div className="panel"><div className="table-wrap"><table className="data-table"><thead><tr><th><input type="checkbox" aria-label="Selecionar IOCs visíveis" checked={allFilteredSelected} onChange={toggleAll} disabled={!filtered.length} /></th><th>IOC</th><th>Tipo</th><th>Classificação</th><th>Score</th><th>Fontes</th><th>Coletado em</th><th></th></tr></thead><tbody>{filtered.map(({ item, index }) => <tr key={`${item.indicator}-${item.timestamp}-${index}`}><td><input type="checkbox" aria-label={`Selecionar ${item.indicator}`} checked={selected.includes(index)} onChange={() => toggleOne(index)} /></td><td className="truncate" title={item.indicator}>{item.indicator}</td><td>{item.type || '—'}</td><td><span className="badge" style={{ color: RISK_CFG[item.risk?.level]?.color || C.textMuted }}>{item.query_status === 'error' ? 'ERRO DE CONSULTA' : item.risk?.classification || item.risk?.level || 'INCONCLUSIVO'}</span></td><td>{item.risk?.score == null ? '—' : `${item.risk.score}/100`}</td><td>{Object.keys(item.sources || {}).join(', ') || '—'}</td><td>{fmtDate(item.timestamp)}</td><td><button className="btn" onClick={() => printInvestigationReport([item])} aria-label={`Imprimir relatório de ${item.indicator}`}>PDF</button></td></tr>)}</tbody></table></div>{!filtered.length && <div className="empty">{history.length ? 'Nenhum IOC corresponde à busca.' : 'Nenhuma investigação salva neste navegador.'}</div>}</div>
  </div>;
}
