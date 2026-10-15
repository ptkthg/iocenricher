import { useMemo, useState } from 'react';
import { C, fmtDate } from '../lib/theme';
import { compareObservations } from '../lib/iocDiff';

export default function IocDiff({ current, history }) {
  const previous = useMemo(() => history.filter(item => item.indicator === current.indicator && item.timestamp && item.timestamp !== current.timestamp).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), [current.indicator, current.timestamp, history]);
  const [selected, setSelected] = useState('');
  if (!previous.length) return <section className="panel panel-pad" id="diff"><h2 className="panel-title">Comparar observações</h2><p style={{ color: C.textMuted }}>Ainda não há outra coleta deste IOC para comparar.</p></section>;
  const older = previous.find(item => item.timestamp === selected) || previous[0];
  const changes = compareObservations(older, current);
  return <section className="panel panel-pad" id="diff"><div className="toolbar" style={{ justifyContent: 'space-between' }}><div><h2 className="panel-title">Comparar observações</h2><p style={{ color: C.textMuted, margin: 0 }}>Coleta atual: {fmtDate(current.timestamp)}</p></div><select className="field" aria-label="Observação anterior" value={older.timestamp} onChange={event => setSelected(event.target.value)}>{previous.map((item, index) => <option key={`${item.timestamp}-${index}`} value={item.timestamp}>{fmtDate(item.timestamp)}</option>)}</select></div>
    {changes.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Campo</th><th>Antes</th><th>Agora</th><th>Leitura</th></tr></thead><tbody>{changes.map((change, index) => <tr key={`${change.category}-${index}`}><td>{change.category}</td><td style={{ overflowWrap: 'anywhere', whiteSpace: 'normal' }}>{change.previous}</td><td style={{ overflowWrap: 'anywhere', whiteSpace: 'normal' }}>{change.current}</td><td style={{ color: change.state === 'coverage' ? C.yellow : C.green }}>{change.state === 'coverage' ? 'Cobertura / indisponibilidade' : 'Mudança observada'}</td></tr>)}</tbody></table></div> : <p style={{ color: C.textMuted }}>Nenhuma diferença comparável foi observada nos campos disponíveis.</p>}
    <p style={{ color: C.textMuted, fontSize: 11 }}>A falta de resposta de uma fonte não comprova que um sinal anterior desapareceu.</p>
  </section>;
}
