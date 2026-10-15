import { C, RISK_CFG, timeAgo } from '../lib/theme';

const nav = [
  ['Dashboard','▦','Painel / Overview'], ['Enrichment','⌕','Analisar IOC'], ['History','▤','Investigações'],
  ['MITRE','⊞','MITRE ATT&CK'], ['Sources','◫','Fontes'], ['Graph','◇','Relacionamentos'],
  ['Bulk','☷','Análise em lote'], ['Threat Feed','◎','Threat Feed'], ['Phishing','⚑','Phishing'],
  ['Reports','▧','Relatórios'], ['Settings','⚙','Configurações'],
];
export default function Sidebar({activePage,onNavigate,history=[],open=false,onClose}) {
  return <aside className={`app-sidebar panel ${open?'open':''}`} style={{display:'flex',flexDirection:'column',height:'100%',minHeight:500}}>
    <div style={{padding:'13px 12px',borderBottom:`1px solid ${C.border}`,fontWeight:600}}>Navegação <button className="mobile-menu btn" style={{float:'right',padding:'1px 6px'}} onClick={onClose}>×</button></div>
    <nav style={{padding:'8px 5px'}} aria-label="Principal">{nav.map(([page,icon,label])=><button key={page} className={`sidebar-link ${activePage===page?'active':''}`} onClick={()=>{onNavigate(page);onClose?.()}}><span style={{fontSize:16,width:20,textAlign:'center',color:activePage===page?C.green:C.textDim}}>{icon}</span>{label}</button>)}</nav>
    <div style={{marginTop:'auto',borderTop:`1px solid ${C.border}`,padding:'12px'}}>
      <div style={{fontWeight:600,marginBottom:8}}>Atividade recente</div>
      {history.length?history.slice(0,5).map((h,i)=><button key={`${h.indicator}-${i}`} onClick={()=>{onNavigate('Enrichment',h.indicator);onClose?.()}} style={{width:'100%',background:'none',border:0,borderTop:`1px solid ${C.borderSubtle}`,textAlign:'left',padding:'10px 3px',color:C.text}}><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.indicator}</div><div style={{display:'flex',justifyContent:'space-between',marginTop:3,color:RISK_CFG[h.risk?.level]?.color||C.textMuted,fontSize:10}}><span>{RISK_CFG[h.risk?.level]?.label||'SEM CLASSIFICAÇÃO'}</span><span style={{color:C.textDim}}>{timeAgo(h.timestamp)}</span></div></button>):<div style={{color:C.textDim,lineHeight:1.5}}>Nenhuma consulta salva neste navegador.</div>}
    </div>
  </aside>;
}
