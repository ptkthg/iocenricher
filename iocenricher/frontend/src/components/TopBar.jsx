import { useEffect, useState } from 'react';
import { C } from '../lib/theme';

export default function TopBar({ onSearch, activePage, onNavigate, onMenu }) {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    let live = true;
    const base = import.meta.env.VITE_API_URL || '/api';
    fetch(`${base}/health/sources`).then(response => response.ok ? response.json() : null).then(data => { if (live) setHealth(data); }).catch(() => {});
    return () => { live = false; };
  }, []);
  const sources = health?.sources?.filter(source => source.name !== 'groq') || [];
  const online = sources.filter(source => source.status === 'online').length;
  return <header style={{ height: 54, display: 'flex', alignItems: 'center', gap: 18, padding: '0 16px', borderBottom: `1px solid ${C.border}`, background: '#09151b', position: 'relative', zIndex: 80 }}>
    <button className="mobile-menu btn" aria-label="Abrir navegação" onClick={onMenu}>☰</button>
    <button onClick={() => onNavigate('Enrichment')} style={{ background: 'none', border: 0, color: C.text, fontSize: 18, fontWeight: 600, whiteSpace: 'nowrap' }}><span style={{ color: C.green }}>❯_</span> IOC Enricher</button>
    <button className="top-overview" onClick={() => onNavigate('Dashboard')} style={{ padding: '0 10px', height: '100%', color: activePage === 'Dashboard' ? C.text : C.textMuted, background: 'none', border: 0, borderBottom: activePage === 'Dashboard' ? `2px solid ${C.green}` : '2px solid transparent', whiteSpace: 'nowrap' }}>Overview</button>
    <div className="top-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}><span className="top-health" style={{ color: health ? online ? C.green : C.yellow : C.textMuted, whiteSpace: 'nowrap', fontSize: 11 }}>● {health ? `Fontes online ${online}/${sources.length}` : 'Status das fontes indisponível'}</span><button className="btn" onClick={() => onSearch('')} title="Nova consulta" aria-label="Nova consulta" style={{ padding: '5px 8px' }}>⌕</button><span className="top-session" style={{ color: C.textMuted, fontSize: 11, borderLeft: `1px solid ${C.border}`, paddingLeft: 12 }}>Sessão local</span></div>
    <style>{'@media(max-width:950px){.top-links{display:none!important}}@media(max-width:520px){.top-health,.top-session{display:none!important}.top-actions{gap:5px!important}header{gap:8px!important;padding:0 8px!important}}'}</style>
  </header>;
}
