import { C } from '../lib/theme';

function Items({ title, items, render }) {
  if (!items?.length) return null;
  return <details className="ai-evidence-section"><summary>{title} <span>{items.length}</span></summary><div className="ai-evidence-items">{items.map((item, index) => <div key={index} className="ai-evidence-item">{render(item)}</div>)}</div></details>;
}

export default function AiEvidenceCard({ analysis, status }) {
  if (!analysis) return <section className="panel panel-pad" id="ai"><h2 className="panel-title">Análise assistida por IA</h2><p style={{ color: C.textMuted }}>{status === 'not_configured' ? 'Groq não está configurado neste ambiente.' : status === 'skipped' ? 'A análise por IA foi omitida porque não há evidências de reputação disponíveis.' : 'Análise por IA indisponível nesta consulta.'}</p></section>;
  return <section className="panel panel-pad" id="ai">
    <h2 className="panel-title">Análise assistida por IA</h2>
    <p style={{ color: C.textMuted, marginTop: 0 }}>Fatos confirmados vêm do motor de risco; hipóteses e próximos passos são sugestões do modelo e exigem revisão.</p>
    <div className="ai-evidence-summary"><strong>Resumo da coleta</strong><p>{analysis.summary}</p></div>
    <Items title="Evidências registradas" items={analysis.confirmed_evidence} render={item => <><strong>{item.id} · {item.origin}</strong><p>{item.text}</p></>} />
    <Items title="Hipóteses para investigar" items={analysis.hypotheses} render={item => <><p>{item.text}</p><small>Evidências relacionadas: {item.evidence_ids?.join(', ') || 'nenhuma'}</small></>} />
    <Items title="Contradições sugeridas" items={analysis.contradictions} render={item => <p>{item}</p>} />
    <Items title="Lacunas de informação" items={analysis.gaps} render={item => <p>{item}</p>} />
    <Items title="Próximos passos sugeridos" items={analysis.next_steps} render={item => <><p>{item.text}</p><small>Evidências relacionadas: {item.evidence_ids?.join(', ') || 'nenhuma'}</small></>} />
    <div className="ai-evidence-summary" style={{ marginTop: 12 }}><strong>Conclusão e limites</strong><p>{analysis.conclusion}</p></div>
  </section>;
}
