import { useEffect, useState } from 'react';
import { C } from '../lib/theme';

export default function TopBar({user,onLogout,onSearch,activePage,onNavigate,onMenu}) {
  const [health,setHealth]=useState(null);
  useEffect(()=>{let live=true;const base=import.meta.env.VITE_API_URL||'/api';fetch(`${base}/health/sources`).then(r=>r.ok?r.json():null).then(d=>{if(live)setHealth(d)}).catch(()=>{});return()=>{live=false}},[]);
  const intelSources=health?.sources?.filter(s=>s.name!=='groq')||[];
  const count=intelSources.filter(s=>s.status==='online').length;
  const name=user?.isGuest?'Convidado':(user?.name||'Analista');
  const nav=[['History','Investigações'],['Sources','Fontes'],['MITRE','MITRE ATT&CK'],['Dashboard','Overview']];
  return <header style={{height:54,display:'flex',alignItems:'center',gap:18,padding:'0 16px',borderBottom:`1px solid ${C.border}`,background:'#09151b',position:'relative',zIndex:80}}>
    <button className="mobile-menu btn" aria-label="Abrir navegação" onClick={onMenu}>☰</button>
    <button onClick={()=>onNavigate('Dashboard')} style={{background:'none',border:0,color:C.text,fontSize:18,fontWeight:600,whiteSpace:'nowrap'}}><span style={{color:C.green}}>❯_</span> IOC Enricher</button>
    <nav className="top-links" style={{display:'flex',height:'100%',gap:8}}>{nav.map(([page,label])=><button key={page} onClick={()=>onNavigate(page)} style={{padding:'0 10px',color:activePage===page?C.text:C.textMuted,background:'none',border:0,borderBottom:activePage===page?`2px solid ${C.green}`:'2px solid transparent',whiteSpace:'nowrap'}}>{label}</button>)}</nav>
    <div className="top-actions" style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:12,minWidth:0}}><span className="top-health" style={{color:health?(count?C.green:C.yellow):C.textMuted,whiteSpace:'nowrap',fontSize:11}}>● {health?`Fontes online ${count}/${intelSources.length}`:'Status das fontes indisponível'}</span><button className="btn" onClick={()=>onSearch('')} title="Nova consulta" style={{padding:'5px 8px'}}>⌕</button><div className="top-profile" style={{borderLeft:`1px solid ${C.border}`,paddingLeft:12,display:'flex',alignItems:'center',gap:8}}><span style={{background:'#345062',width:30,height:30,borderRadius:'50%',display:'grid',placeItems:'center'}}>{name[0]?.toUpperCase()}</span><span className="top-user" style={{maxWidth:110,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</span><button onClick={onLogout} className="btn" title="Sair" style={{padding:'4px 6px'}}>⏻</button></div></div>
    <style>{'@media(max-width:950px){.top-links{display:none!important}}@media(max-width:520px){.top-health,.top-user{display:none!important}.top-actions{gap:5px!important}.top-profile{padding-left:6px!important;gap:4px!important}header{gap:8px!important;padding:0 8px!important}header span{font-size:10px}}'}</style>
  </header>;
}
