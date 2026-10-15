import {useEffect,useState} from 'react';
import {getHistory} from './lib/api';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Enrichment from './pages/Enrichment';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Mitre from './pages/Mitre';
import Sources from './pages/Sources';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Bulk from './pages/Bulk';
import ThreatFeed from './pages/ThreatFeed';
import Graph from './pages/Graph';
import PhishingAnalysis from './pages/PhishingAnalysis';

export default function App(){
  const [activePage,setActivePage]=useState('Dashboard');const [history,setHistory]=useState([]);const [currentResult,setCurrentResult]=useState(null);const [user,setUser]=useState(null);const [ready,setReady]=useState(false);const [pendingIndicator,setPendingIndicator]=useState(null);const [menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>{try{const saved=localStorage.getItem('iocenricher_user');if(saved)setUser(JSON.parse(saved))}catch{localStorage.removeItem('iocenricher_user')}setHistory(getHistory());setReady(true)},[]);
  function navigate(page,indicator){setActivePage(page);if(indicator)setPendingIndicator(indicator);setMenuOpen(false);window.scrollTo(0,0)}
  function logout(){localStorage.removeItem('iocenricher_user');localStorage.removeItem('iocenricher_session');setUser(null)}
  if(!ready)return null;if(!user)return <Login onLogin={setUser}/>;
  const common={history,onNavigate:navigate,onInvestigate:indicator=>navigate('Enrichment',indicator)};
  const pages={Dashboard:<Dashboard {...common}/>,Enrichment:<Enrichment {...common} setHistory={setHistory} currentResult={currentResult} setCurrentResult={setCurrentResult} initialIndicator={pendingIndicator} onIndicatorConsumed={()=>setPendingIndicator(null)}/>,History:<History {...common} setHistory={setHistory}/>,MITRE:<Mitre {...common}/>,Sources:<Sources {...common}/>,Settings:<Settings/>,Reports:<Reports history={history}/>,Bulk:<Bulk/>, 'Bulk Enrichment':<Bulk/>, 'Threat Feed':<ThreatFeed/>,Graph:<Graph initialIndicator={pendingIndicator} onIndicatorConsumed={()=>setPendingIndicator(null)}/>,Phishing:<PhishingAnalysis onInvestigate={indicator=>navigate('Enrichment',indicator)}/>};
  return <div className="app-shell"><div className="app-topbar"><TopBar user={user} onLogout={logout} onSearch={i=>navigate('Enrichment',i)} onNavigate={navigate} activePage={activePage} onMenu={()=>setMenuOpen(x=>!x)}/></div><div className="workspace"><Sidebar activePage={activePage} onNavigate={navigate} history={history} open={menuOpen} onClose={()=>setMenuOpen(false)}/><main className="app-content">{pages[activePage]||pages.Dashboard}</main></div></div>;
}
