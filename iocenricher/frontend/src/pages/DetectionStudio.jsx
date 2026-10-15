import { useMemo, useState } from 'react';
import { C, fmtDate } from '../lib/theme';
import { generateHunt } from '../lib/detectionQueries';
import { buildPlaybook } from '../lib/playbook';
import { loadCases, loadNote } from '../lib/investigationStore';

function downloadPackage(content) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `ioc-investigation-${Date.now()}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DetectionStudio({ history = [] }) {
  const [selected, setSelected] = useState('');
  const [platform, setPlatform] = useState('kql');
  const [days, setDays] = useState(7);
  const [index, setIndex] = useState('');
  const [generated, setGenerated] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const observation = history[Number(selected)] || null;
  const playbook = useMemo(() => buildPlaybook(observation), [observation]);

  function generate() {
    try { setGenerated(generateHunt({ observation, platform, days, index })); setError(''); }
    catch (issue) { setGenerated(null); setError(issue.message); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(generated.query); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setError('Não foi possível copiar a consulta.'); }
  }
  async function exportQuery() {
    try {
      const [note, cases] = await Promise.all([loadNote(observation.indicator), loadCases()]);
      downloadPackage({ schema: 'ioc-enricher-operational-v1', generatedAt: new Date().toISOString(), passport: observation, observations: history.filter(item => item.indicator === observation.indicator), analystNote: note, cases: cases.filter(item => item.iocs?.includes(observation.indicator)), platform, hunt: generated, playbook });
      setError('');
    } catch { setError('Não foi possível montar o pacote local.'); }
  }

  return <div className="stack">
    <div><h1 className="page-title">Detection Studio</h1><p className="page-subtitle">Gere buscas de hunting a partir de observações locais. As consultas não são executadas nem validadas nas plataformas de destino.</p></div>
    <div className="panel panel-pad toolbar studio-form"><label>IOC analisado<select className="field" aria-label="IOC analisado" value={selected} onChange={event => { setSelected(event.target.value); setGenerated(null); }} style={{ display: 'block', marginTop: 5 }}><option value="">Selecionar observação</option>{history.map((item, index) => <option key={`${item.indicator}-${item.timestamp}-${index}`} value={index}>{item.indicator} · {fmtDate(item.timestamp)}</option>)}</select></label><label>Plataforma<select className="field" value={platform} onChange={event => { setPlatform(event.target.value); setGenerated(null); }} style={{ display: 'block', marginTop: 5 }}><option value="kql">Defender XDR / Sentinel · KQL</option><option value="spl">Splunk · SPL</option><option value="yara">Google SecOps · YARA-L Search</option></select></label><label>Janela temporal<select className="field" value={days} onChange={event => { setDays(Number(event.target.value)); setGenerated(null); }} style={{ display: 'block', marginTop: 5 }}>{[1, 7, 30].map(value => <option key={value} value={value}>{value} dia(s)</option>)}</select></label>{platform === 'spl' && <label>Índice Splunk<input className="field" value={index} onChange={event => { setIndex(event.target.value); setGenerated(null); }} placeholder="Ex.: main" style={{ display: 'block', marginTop: 5 }} /></label>}<button className="btn btn-primary" disabled={!observation} onClick={generate}>Gerar busca</button></div>
    {error && <div className="panel panel-pad" role="alert" style={{ color: C.red }}>{error}</div>}
    {generated && <section className="panel panel-pad"><div className="toolbar" style={{ justifyContent: 'space-between' }}><h2 className="panel-title">{generated.title}</h2><span className="badge muted">Hunting · {generated.model}</span></div><pre className="query-code"><code>{generated.query}</code></pre><p style={{ color: C.yellow, lineHeight: 1.5 }}>{generated.limitation}</p><div className="toolbar"><button className="btn" onClick={copy}>{copied ? 'Copiado' : 'Copiar consulta'}</button><button className="btn" onClick={exportQuery}>Exportar pacote JSON</button></div></section>}
    {observation && <section className="panel panel-pad"><h2 className="panel-title">Playbook de investigação e resposta</h2><p style={{ color: C.textMuted }}>Orientações derivadas do tipo de IOC e da cobertura observada. Contenção exige aprovação; nenhuma ação é executada aqui.</p><div className="stack">{playbook.map((step, index) => <details key={step.title} className="ai-evidence-section"><summary>{index + 1}. {step.title}</summary><div className="ai-evidence-items"><div className="ai-evidence-item"><strong>Objetivo</strong><p>{step.objective}</p></div><div className="ai-evidence-item"><strong>Pré-requisitos</strong><p>{step.prerequisite}</p></div><div className="ai-evidence-item"><strong>Evidências esperadas</strong><p>{step.expected}</p></div><div className="ai-evidence-item"><strong>Critério de conclusão</strong><p>{step.done}</p></div></div></details>)}</div></section>}
    {!history.length && <div className="panel empty">Investigue um IOC para habilitar consultas e playbooks.</div>}
  </div>;
}
