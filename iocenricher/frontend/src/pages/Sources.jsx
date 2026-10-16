import {useEffect,useMemo,useState} from 'react';
import {C,fmtDate} from '../lib/theme';
import { sourceStatusView } from '../lib/sourceStatus';

const catalog=[
 ['virustotal','VirusTotal','Reputação','IP, domínio, URL, hash','Chave de API'],
 ['ipinfo','IPinfo','Geolocalização','IP','Token opcional'],
 ['urlhaus','URLhaus','Malware','URL, domínio, hash','Chave de API'],
 ['malwarebazaar','MalwareBazaar','Malware','Hash','Chave de API'],
 ['abuseipdb','AbuseIPDB','Reputação','IP','Chave de API'],
 ['shodan','Shodan','DNS / IP','IP','Chave de API'],
 ['passivedns','Passive DNS','DNS / IP','IP, domínio','Serviço do backend'],
 ['whois','WHOIS','Registro','IP, domínio, URL','Serviço do backend'],
 ['ssl','SSL / crt.sh','Certificados','Domínio, URL','Pública'],
 ['subnet','Subnet Intel','Rede','IP','Serviço do backend'],
 ['typosquatting','Typosquatting','Phishing','Domínio, URL','Análise local'],
];
function summarizeResult(name,value){
 if(name==='virustotal')return `${value.malicious??0} maliciosos · ${value.suspicious??0} suspeitos`;
 if(name==='abuseipdb')return `${value.abuse_score??'—'}% abuso · ${value.total_reports??'—'} relatos`;
 if(name==='ipinfo')return [value.country,value.org].filter(Boolean).join(' · ')||'Dados de IP';
 if(value.found===true)return value.threat||value.signature||'Correspondência encontrada';
 if(value.found===false)return 'Sem correspondência';
 return 'Dados disponíveis';
}
export default function Sources({history}){
 const [health,setHealth]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[query,setQuery]=useState(''),[category,setCategory]=useState('Todas');
 async function refresh(){setLoading(true);setError('');try{const r=await fetch(`${import.meta.env.VITE_API_URL||'/api'}/health/sources`);if(!r.ok)throw Error(`HTTP ${r.status}`);setHealth(await r.json())}catch(e){setError(`Verificação indisponível: ${e.message}`)}finally{setLoading(false)}}
 useEffect(()=>{refresh()},[]);
 const count=useMemo(()=>history.reduce((a,h)=>{Object.entries(h.sources||{}).forEach(([k,v])=>{if(v)a[k]=(a[k]||0)+1});return a},{}),[history]);
 const rows=catalog.filter(([key,name,cat])=>(category==='Todas'||category===cat)&&(`${key} ${name} ${cat}`.toLowerCase().includes(query.toLowerCase())));
 const checked=health?.sources?.filter(s=>s.name!=='groq')||[];
 const status=key=>checked.find(s=>s.name===key);
 return <div className="stack"><div className="toolbar" style={{justifyContent:'space-between'}}><div><h1 className="page-title">Fontes de inteligência</h1><p className="page-subtitle">Integrações implementadas para enriquecimento de IOCs.</p></div><button className="btn" onClick={refresh} disabled={loading}>↻ {loading?'Verificando...':'Atualizar status'}</button></div>
 <div className="grid-3"><div className="panel kpi"><div className="kpi-label">Integrações implementadas</div><div className="kpi-value">{catalog.length}</div><div className="kpi-note">Inclui análise local e serviços auxiliares</div></div><div className="panel kpi"><div className="kpi-label">Fontes verificadas online</div><div className="kpi-value" style={{color:C.green}}>{health?checked.filter(s=>s.status==='online').length:'—'}</div><div className="kpi-note">{health?`de ${checked.length} verificadas`:'Aguardando backend'}</div></div><div className="panel kpi"><div className="kpi-label">Consultas registradas</div><div className="kpi-value">{Object.values(count).reduce((a,b)=>a+b,0)}</div><div className="kpi-note">Resultados no histórico local</div></div></div>
 {error&&<div className="panel panel-pad" style={{color:C.yellow}}>{error}</div>}
 <div className="panel panel-pad toolbar"><strong style={{marginRight:'auto'}}>Fontes configuradas no código</strong><input className="field" aria-label="Buscar fonte ou categoria" placeholder="Buscar fonte ou categoria..." value={query} onChange={e=>setQuery(e.target.value)}/><select className="field" aria-label="Filtrar fontes por categoria" value={category} onChange={e=>setCategory(e.target.value)}>{['Todas',...new Set(catalog.map(x=>x[2]))].map(x=><option key={x}>{x}</option>)}</select></div>
 <div className="panel"><div className="table-wrap"><table className="data-table" aria-label="Integrações de inteligência"><thead><tr><th>Fonte</th><th>Categoria</th><th>Status</th><th>Tipos suportados</th><th>Acesso</th><th>Resultados salvos</th><th>Latência</th><th>Detalhe</th></tr></thead><tbody>{rows.map(([key,name,cat,types,access])=>{const s=status(key);const view=sourceStatusView(s?.status);return <tr key={key}><td style={{fontWeight:600}}>{name}</td><td>{cat}</td><td style={{color:view.color}}>● {s ? view.label : 'Não verificado'}</td><td>{types}</td><td>{access}</td><td>{count[key]||0}</td><td>{s?.latency!=null?`${s.latency} ms`:'—'}</td><td className="truncate" title={s?.error||''}>{s?.error||'—'}</td></tr>})}</tbody></table></div></div>
 <div className="grid-2"><section className="panel panel-pad"><h2 className="panel-title">Últimos enriquecimentos por fonte</h2>{history.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>Horário</th><th>Fonte</th><th>IOC</th><th>Resultado</th></tr></thead><tbody>{history.flatMap(h=>Object.entries(h.sources||{}).filter(([,v])=>v).map(([s,value])=>({h,s,value}))).slice(0,8).map(({h,s,value},i)=><tr key={i}><td>{fmtDate(h.timestamp)}</td><td>{s}</td><td className="truncate">{h.indicator}</td><td className="truncate">{summarizeResult(s,value)}</td></tr>)}</tbody></table></div>:<div className="empty">Sem consultas salvas.</div>}</section><section className="panel panel-pad"><h2 className="panel-title">Uso das fontes no histórico</h2>{Object.keys(count).length?Object.entries(count).sort((a,b)=>b[1]-a[1]).map(([s,n])=><div key={s} className="toolbar" style={{margin:'9px 0'}}><span style={{width:120}}>{s}</span><div className="bar-track" style={{flex:1}}><div className="bar-fill" style={{width:`${100*n/Math.max(...Object.values(count))}%`,background:C.green}}/></div><span>{n}</span></div>):<div className="empty">O uso aparecerá após as primeiras análises.</div>}</section></div>
 <p style={{color:C.textDim,margin:0,fontSize:10}}>Status somente para fontes cobertas por /api/health/sources; as demais aparecem como não verificadas. Verificação em {fmtDate(health?.checked_at)}.</p>
 </div>
}
