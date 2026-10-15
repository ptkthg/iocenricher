import { useEffect, useState } from 'react';
import { getHistory, loadHistory } from './lib/api';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Enrichment from './pages/Enrichment';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Mitre from './pages/Mitre';
import Sources from './pages/Sources';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Bulk from './pages/Bulk';
import ThreatFeed from './pages/ThreatFeed';
import Graph from './pages/Graph';
import PhishingAnalysis from './pages/PhishingAnalysis';
import DetectionStudio from './pages/DetectionStudio';

const pagePaths = { Enrichment: '/investigar', Bulk: '/lote', History: '/historico', Graph: '/grafo', 'Threat Feed': '/threat-feed', MITRE: '/mitre', Sources: '/fontes', Phishing: '/phishing', DetectionStudio: '/detection-studio', Reports: '/relatorios', Settings: '/preferencias', Dashboard: '/overview' };
const pageFromPath = () => Object.entries(pagePaths).find(([, path]) => path === window.location.pathname)?.[0] || 'Enrichment';

export default function App() {
  const [activePage, setActivePage] = useState(pageFromPath);
  const [history, setHistory] = useState(getHistory);
  const [currentResult, setCurrentResult] = useState(null);
  const [pendingIndicator, setPendingIndicator] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    let live = true;
    const refresh = () => loadHistory().then(items => {
      if (!live) return;
      setHistory(items);
      const params = new URLSearchParams(window.location.search);
      if (window.location.pathname === '/investigar' && params.has('ioc') && params.has('at')) {
        const found = items.find(item => item.indicator === params.get('ioc') && item.timestamp === params.get('at'));
        if (found) setCurrentResult(found);
      }
    });
    refresh();
    const restorePage = () => { setActivePage(pageFromPath()); refresh(); };
    window.addEventListener('storage', refresh);
    window.addEventListener('popstate', restorePage);
    return () => { live = false; window.removeEventListener('storage', refresh); window.removeEventListener('popstate', restorePage); };
  }, []);
  function navigate(page, indicator) {
    setActivePage(page);
    const path = pagePaths[page];
    if (path && (window.location.pathname !== path || window.location.search)) window.history.pushState(null, '', path);
    if (indicator) setPendingIndicator(indicator);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }
  const common = { history, onNavigate: navigate, onInvestigate: indicator => navigate('Enrichment', indicator), onOpenObservation: item => { setCurrentResult(item); setPendingIndicator(null); navigate('Enrichment'); window.history.replaceState(null, '', `/investigar?ioc=${encodeURIComponent(item.indicator)}&at=${encodeURIComponent(item.timestamp)}`); } };
  const pages = {
    Dashboard: <Dashboard {...common} />,
    Enrichment: <Enrichment {...common} setHistory={setHistory} currentResult={currentResult} setCurrentResult={setCurrentResult} initialIndicator={pendingIndicator} onIndicatorConsumed={() => setPendingIndicator(null)} />,
    History: <History {...common} setHistory={setHistory} />,
    MITRE: <Mitre {...common} />,
    Sources: <Sources {...common} />,
    Settings: <Settings onHistoryChange={setHistory} />,
    Reports: <Reports history={history} />,
    Bulk: <Bulk setHistory={setHistory} />,
    'Threat Feed': <ThreatFeed />,
    Graph: <Graph initialIndicator={pendingIndicator} onIndicatorConsumed={() => setPendingIndicator(null)} />,
    Phishing: <PhishingAnalysis onInvestigate={indicator => navigate('Enrichment', indicator)} />,
    DetectionStudio: <DetectionStudio history={history} />,
  };
  return <div className="app-shell"><div className="app-topbar"><TopBar onSearch={indicator => navigate('Enrichment', indicator)} onNavigate={navigate} activePage={activePage} onMenu={() => setMenuOpen(open => !open)} /></div><div className="workspace"><Sidebar activePage={activePage} onNavigate={navigate} history={history} open={menuOpen} onClose={() => setMenuOpen(false)} /><main className="app-content">{pages[activePage] || pages.Enrichment}</main></div></div>;
}
