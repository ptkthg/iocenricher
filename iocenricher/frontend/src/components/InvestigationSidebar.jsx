import { useEffect, useState } from 'react';
import { loadNote, saveNote } from '../lib/investigationStore';
import { C, FONT, RISK_CFG, timeAgo } from '../lib/theme';
import Icon from './Icon';
import { Badge, Button, Card } from './UI';

export default function InvestigationSidebar({ indicator, history, onSelect, onNavigate }) {
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState([]);
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setNotes('');
    setTags([]);
    setError('');
    setSaved(false);
    setAddingTag(false);
    setNewTag('');
    setLoading(Boolean(indicator));
    if (indicator) {
      loadNote(indicator).then(value => {
        if (active) {
          setNotes(value.notes || '');
          setTags(value.tags || []);
          setLoading(false);
        }
      }).catch(() => {
        if (active) {
          setError('Não foi possível carregar as notas deste navegador.');
          setLoading(false);
        }
      });
    }
    return () => { active = false; };
  }, [indicator]);

  async function persist() {
    if (!indicator) return;
    try {
      await saveNote(indicator, notes, tags);
      setError('');
      setSaved(true);
    } catch {
      setError('Não foi possível salvar a nota no navegador.');
    }
  }

  function addTag() {
    const value = newTag.trim();
    if (value && !tags.includes(value)) setTags(current => [...current, value]);
    setNewTag('');
    setAddingTag(false);
    setSaved(false);
  }

  return (
    <aside className="sidebar-right" style={{ display: 'flex', flexDirection: 'column', gap: 20 }} aria-label="Contexto da investigação">
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Notas do analista</h2>
          {indicator && <span title={indicator} style={{ fontSize: 10, color: C.textDim, fontFamily: 'monospace', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{indicator}</span>}
        </div>
        <label htmlFor="investigation-note" className="sr-only">Notas do analista para o indicador atual</label>
        <textarea id="investigation-note" value={notes} onChange={event => { setNotes(event.target.value); setSaved(false); }} disabled={!indicator || loading}
          placeholder={indicator ? 'Adicione notas, contexto e observações da investigação...' : 'Analise um indicador para registrar notas.'} rows={5}
          style={{ width: '100%', padding: 12, background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, resize: 'vertical', lineHeight: 1.5, fontFamily: FONT, boxSizing: 'border-box' }} />
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {tags.map(tag => <button key={tag} type="button" onClick={() => { setTags(current => current.filter(item => item !== tag)); setSaved(false); }} aria-label={`Remover tag ${tag}`}
              style={{ padding: '4px 10px', background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 6, color: C.accentLight, fontSize: 11, cursor: 'pointer', fontFamily: FONT }}>{tag} <span aria-hidden="true">×</span></button>)}
            {addingTag ? <input autoFocus aria-label="Nova tag" value={newTag} onChange={event => setNewTag(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') addTag(); if (event.key === 'Escape') { setAddingTag(false); setNewTag(''); } }} onBlur={addTag}
              placeholder="nome da tag..." style={{ padding: '4px 8px', background: C.bgInput, border: `1px solid ${C.accent}`, borderRadius: 6, color: C.text, fontSize: 11, fontFamily: FONT, width: 90 }} />
              : <button type="button" disabled={!indicator || loading} onClick={() => setAddingTag(true)} style={{ padding: '4px 10px', background: 'transparent', border: `1px dashed ${C.border}`, borderRadius: 6, color: C.textMuted, fontSize: 11, cursor: 'pointer' }}>+ Adicionar tag</button>}
          </div>
        </div>
        <p style={{ fontSize: 11, color: C.textDim }}>Notas e tags ficam somente neste navegador.</p>
        {error && <p role="alert" style={{ color: C.red }}>{error}</p>}
        <Button onClick={persist} disabled={!indicator || loading} style={{ width: '100%', marginTop: 16, justifyContent: 'center', background: saved ? C.greenBg : undefined, borderColor: saved ? C.green : undefined, color: saved ? C.green : undefined }}
          icon={saved ? <Icon name="check" size={14} color={C.green} /> : null}>{saved ? 'Nota salva' : 'Salvar nota'}</Button>
      </Card>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Consultas recentes</h2>
          <button type="button" onClick={() => onNavigate?.('History')} style={{ background: 'transparent', border: 'none', color: C.accentLight, fontSize: 12, cursor: 'pointer', fontFamily: FONT }}>Ver todas</button>
        </div>
        {history.length === 0 ? <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: C.textMuted }}>Nenhuma consulta salva</div> :
          <div style={{ display: 'flex', flexDirection: 'column' }}>{history.slice(0, 6).map((item, index) => {
            const risk = RISK_CFG[item.risk?.level] || RISK_CFG.INCONCLUSIVO;
            const active = indicator === item.indicator;
            return <button key={`${item.indicator}-${item.timestamp || index}`} type="button" onClick={() => onSelect(item)}
              aria-current={active ? 'true' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', border: 0, borderTop: index ? `1px solid ${C.borderSubtle}` : 'none', cursor: 'pointer', borderRadius: 8, margin: '0 -8px', background: active ? C.bgCardHover : 'transparent', fontFamily: FONT, textAlign: 'left' }}>
              <span style={{ width: 28, height: 28, borderRadius: 6, background: C.bgInput, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="globe" size={14} color={active ? C.accentLight : C.textMuted} /></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 12, color: active ? C.accentLight : C.text, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.indicator}</span><span style={{ fontSize: 10, color: C.textMuted, textTransform: 'capitalize' }}>{item.type}</span></span>
              <Badge color={risk.color} bg={risk.bg}>{item.risk?.score ?? '—'}</Badge>
              <span style={{ fontSize: 10, color: C.textDim, flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{timeAgo(item.timestamp)}</span>
            </button>;
          })}</div>}
      </Card>
    </aside>
  );
}
