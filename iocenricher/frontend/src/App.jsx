import { useState, useEffect } from "react";
import { C, FONT } from "./lib/theme";
import { getHistory } from "./lib/api";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Icon from "./components/Icon";
import Enrichment from "./pages/Enrichment";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import Bulk from "./pages/Bulk";
import ThreatFeed from "./pages/ThreatFeed";
import Graph from "./pages/Graph";
import PhishingAnalysis from "./pages/PhishingAnalysis";

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [history, setHistory] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingIndicator, setPendingIndicator] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("iocenricher_user");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem("iocenricher_user"); }
    }
    setLoading(false);
    setHistory(getHistory());
  }, []);

  function handleLogout() {
    localStorage.removeItem("iocenricher_user");
    localStorage.removeItem("iocenricher_session");
    setUser(null);
  }

  function navigateToEnrichment(indicator) {
    setPendingIndicator(indicator);
    setActivePage("Enrichment");
  }

  function renderPage() {
    switch (activePage) {
      case "Dashboard":
        return <Dashboard history={history} onNavigate={setActivePage} onInvestigate={navigateToEnrichment} />;
      case "Enrichment":
        return (
          <Enrichment
            history={history}
            setHistory={setHistory}
            currentResult={currentResult}
            setCurrentResult={setCurrentResult}
            initialIndicator={pendingIndicator}
            onIndicatorConsumed={() => setPendingIndicator(null)}
            onNavigate={setActivePage}
          />
        );
      case "Bulk Enrichment":
      case "Bulk":
      case "/bulk":
        return <Bulk />;
      case "Threat Feed":
        return <ThreatFeed />;
      case "Phishing":
        return <PhishingAnalysis onInvestigate={navigateToEnrichment} />;
      case "Graph":
        return <Graph />;
      case "History":
        return <History history={history} setHistory={setHistory} onNavigate={setActivePage} onInvestigate={navigateToEnrichment} />;
      case "Reports":
        return <Reports history={history} />;
      case "Settings":
        return <Settings />;
      default:
        return null;
    }
  }

  if (loading) return null;
  if (!user) return <Login onLogin={setUser} />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; font-family: ${FONT}; color: ${C.text}; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.borderSubtle}; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }

        /* ── MOBILE RESPONSIVE ── */
        @media (max-width: 768px) {
          /* Sidebar */
          .app-sidebar { display: none !important; }

          /* Content padding */
          .app-content { padding: 12px !important; padding-bottom: 72px !important; }

          /* TopBar */
          .app-topbar .search-bar { display: none !important; }
          .app-topbar { padding: 0 12px !important; }

          /* Stat grids: 4-col → 2-col */
          .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }

          /* Main + sidebar layouts → single col, hide right sidebar */
          .main-with-sidebar { grid-template-columns: 1fr !important; }
          .main-with-sidebar .sidebar-right { display: none !important; }

          /* Detail grids: 2-col → 1-col */
          .detail-grid { grid-template-columns: 1fr !important; }

          /* 3-col grids → 1-col */
          .three-col { grid-template-columns: 1fr !important; }

          /* Tables: scroll horizontally */
          .table-scroll { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          .table-scroll table { min-width: 600px; }

          /* Filter bars: wrap */
          .filter-bar { flex-wrap: wrap !important; gap: 8px !important; }
          .filter-bar .search-input { min-width: 100% !important; order: -1; }

          /* Graph canvas */
          .graph-canvas { height: 400px !important; }

          /* Cards: reduce padding */
          .card-mobile-sm { padding: 14px !important; }

          /* Verdict banner: stack */
          .verdict-banner { flex-direction: column !important; gap: 12px !important; }
          .verdict-banner .verdict-arc { display: none !important; }

          /* Timeline: full width */
          .timeline-grid { grid-template-columns: 1fr !important; }

          /* Hide decorative elements on mobile */
          .hide-mobile { display: none !important; }

          /* Full width buttons on mobile */
          .btn-mobile-full { width: 100% !important; }

          /* Page header: stack title + actions */
          .page-header-actions { flex-direction: column !important; align-items: flex-start !important; }
          .page-header-actions .page-actions { flex-wrap: wrap !important; }

          /* TopBar: hide profile name/role text */
          .topbar-name { display: none !important; }

          /* Notification dropdown: full width on small screens */
          .notif-dropdown { width: calc(100vw - 24px) !important; right: -60px !important; }

          /* GeoBar label: shrink */
          .geo-bar-label { width: 80px !important; font-size: 11px !important; }
        }

        @media (max-width: 480px) {
          /* Very small screens: 1-col for stat grid too */
          .stat-grid { grid-template-columns: 1fr !important; }
          .app-content { padding: 8px !important; padding-bottom: 72px !important; }
          /* TopBar: more compact */
          .app-topbar { height: 52px !important; }
        }
      `}</style>
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div className="app-topbar">
            <TopBar user={user} onLogout={handleLogout} onSearch={navigateToEnrichment} onNavigate={setActivePage} />
          </div>
          <div className="app-content" style={{ flex: 1, padding: 28, overflow: "auto", paddingBottom: 80 }}>
            {renderPage()}
          </div>
        </div>

        {/* Mobile bottom nav */}
        <style>{`
          .mobile-nav { display: none; }
          @media (max-width: 768px) {
            .mobile-nav { display: flex !important; }
            .app-sidebar > * { display: none; }
          }
        `}</style>
        <div className="mobile-nav" style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
          background: C.bgCard, borderTop: `1px solid ${C.border}`,
          display: "none", alignItems: "center", justifyContent: "space-around",
          padding: "8px 0 12px", boxShadow: "0 -4px 20px rgba(0,0,0,0.3)"
        }}>
          {[
            { page: "Dashboard", icon: "dashboard", label: "Home" },
            { page: "Enrichment", icon: "search", label: "Analyze" },
            { page: "Bulk Enrichment", icon: "layers", label: "Bulk" },
            { page: "History", icon: "history", label: "History" },
            { page: "Settings", icon: "settings", label: "More" },
          ].map(item => {
            const active = activePage === item.page;
            return (
              <button key={item.page} onClick={() => setActivePage(item.page)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                background: "transparent", border: "none", cursor: "pointer",
                padding: "4px 12px", borderRadius: 8
              }}>
                <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={item.icon} size={20} color={active ? C.accentLight : C.textDim} />
                </div>
                <span style={{ fontSize: 10, color: active ? C.accentLight : C.textDim, fontFamily: FONT }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
