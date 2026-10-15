import { useEffect, useMemo, useRef, useState } from 'react';
import { C } from '../lib/theme';

const WIDTH = 760;
const HEIGHT = 360;
const colorFor = value => value.startsWith('http') ? C.cyan : /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) ? C.orange : /^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$/i.test(value) ? C.purple : C.green;
function save(content, extension, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = `caso-relacoes-${Date.now()}.${extension}`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CaseGraph({ record, relationships, onInvestigate }) {
  const [relationFilter, setRelationFilter] = useState('Todas');
  const [selected, setSelected] = useState(null);
  const svgRef = useRef(null);
  const scrollRef = useRef(null);
  const nodes = record.iocs.slice(0, 30);
  const visible = relationships.filter(edge => relationFilter === 'Todas' || edge.relation === relationFilter).filter(edge => nodes.includes(edge.from) && nodes.includes(edge.to));
  const positions = useMemo(() => Object.fromEntries(nodes.map((value, index) => {
    const angle = 2 * Math.PI * index / Math.max(nodes.length, 1) - Math.PI / 2;
    return [value, { x: WIDTH / 2 + Math.cos(angle) * 270, y: HEIGHT / 2 + Math.sin(angle) * 120 }];
  })), [record.iocs.join('|')]);
  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollLeft = Math.max(0, (container.scrollWidth - container.clientWidth) / 2);
  }, [record.iocs.join('|')]);
  if (!record.iocs.length) return null;
  const filters = ['Todas', ...new Set(relationships.map(edge => edge.relation))];
  return <section className="panel panel-pad"><div className="toolbar" style={{ justifyContent: 'space-between' }}><h3 className="panel-title">Grafo do caso · {nodes.length} IOC(s)</h3><div className="toolbar"><select className="field" aria-label="Filtrar relação" value={relationFilter} onChange={event => { setRelationFilter(event.target.value); setSelected(null); }}>{filters.map(value => <option key={value}>{value}</option>)}</select><button className="btn" onClick={() => save(JSON.stringify({ caseId: record.id || null, nodes, edges: visible }, null, 2), 'json', 'application/json')}>JSON</button><button className="btn" onClick={() => svgRef.current && save(svgRef.current.outerHTML, 'svg', 'image/svg+xml')}>SVG</button></div></div>
    {record.iocs.length > 30 && <p style={{ color: C.yellow }}>Exibindo os primeiros 30 IOCs para manter o grafo legível.</p>}
    <div className="case-graph-scroll" ref={scrollRef}><svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Grafo das relações verificadas entre IOCs do caso">
      {visible.map((edge, index) => { const a = positions[edge.from], b = positions[edge.to]; return <g key={`${edge.from}-${edge.to}-${index}`} tabIndex={0} role="button" aria-label={`Ver evidência: ${edge.relation}, ${edge.evidence.source}`} onClick={() => setSelected(edge)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(edge); } }} style={{ cursor: 'pointer' }}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={selected === edge ? C.green : C.borderAccent} strokeWidth={selected === edge ? 4 : 2} /><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={18} /><title>{`${edge.relation} · ${edge.evidence.source}`}</title></g>; })}
      {nodes.map(value => { const position = positions[value]; return <g key={value} tabIndex={0} role="button" aria-label={`Investigar ${value}`} onClick={() => onInvestigate(value)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onInvestigate(value); } }} style={{ cursor: 'pointer' }}><circle cx={position.x} cy={position.y} r={18} fill="#0b171e" stroke={colorFor(value)} strokeWidth={2} /><text x={position.x} y={position.y + 32} textAnchor="middle" fill={C.text} fontSize={10}>{value.length > 22 ? `${value.slice(0, 19)}…` : value}</text><title>{value}</title></g>; })}
    </svg></div>
    {selected ? <div className="panel panel-pad" style={{ marginTop: 10 }}><strong>{selected.from} → {selected.to}</strong><p>{selected.relation}</p><p style={{ color: C.textMuted }}>Fonte: {selected.evidence.source} · Confiança: {selected.evidence.confidence} · Coleta: {selected.evidence.timestamp || 'não informada'}</p><p style={{ color: C.textMuted }}>{selected.evidence.detail}</p></div> : <p style={{ color: C.textMuted }}>Selecione uma aresta para ver a evidência. Selecione um nó para abrir o IOC.</p>}
  </section>;
}
