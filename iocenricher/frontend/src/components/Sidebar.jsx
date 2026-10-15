import { C, RISK_CFG, timeAgo } from '../lib/theme';
import Icon from './Icon';

const sections = [
  { title: 'ÁREA DE TRABALHO', items: [
    ['Enrichment', 'search', 'Investigar IOC'],
    ['Bulk', 'layers', 'Análise em lote'],
    ['History', 'history', 'Casos e histórico'],
    ['Graph', 'link', 'Grafo de relações'],
  ] },
  { title: 'INTELIGÊNCIA', items: [
    ['Threat Feed', 'activity', 'Threat Feed'],
    ['MITRE', 'dashboard', 'MITRE ATT&CK'],
    ['Sources', 'database', 'Fontes OSINT'],
  ] },
  { title: 'FERRAMENTAS', items: [
    ['Phishing', 'shield', 'Análise de phishing'],
    ['DetectionStudio', 'target', 'Detection Studio'],
    ['Reports', 'reports', 'Relatórios'],
  ] },
  { title: 'SISTEMA', items: [
    ['Settings', 'settings', 'Preferências'],
  ] },
];

export default function Sidebar({ activePage, onNavigate, history = [], open = false, onClose }) {
  return <aside className={`app-sidebar panel ${open ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 500 }}>
    <div className="sidebar-heading">Navegação <button className="mobile-menu btn" aria-label="Fechar navegação" onClick={onClose}>×</button></div>
    <nav className="sidebar-nav" aria-label="Principal">
      {sections.map(section => <div key={section.title} className="sidebar-section">
        <div className="sidebar-section-title">{section.title}</div>
        {section.items.map(([page, icon, label]) => <button key={page} className={`sidebar-link ${activePage === page ? 'active' : ''}`} aria-current={activePage === page ? 'page' : undefined} onClick={() => { onNavigate(page); onClose?.(); }}>
          <Icon name={icon} size={15} color={activePage === page ? C.green : C.textDim} />{label}
        </button>)}
      </div>)}
    </nav>
    <div className="sidebar-recent">
      <div className="sidebar-section-title">ATIVIDADE RECENTE</div>
      {history.length ? history.slice(0, 5).map((item, index) => <button key={`${item.indicator}-${index}`} onClick={() => { onNavigate('Enrichment', item.indicator); onClose?.(); }} className="sidebar-recent-item">
        <div className="sidebar-recent-value">{item.indicator}</div>
        <div className="sidebar-recent-meta"><span style={{ color: RISK_CFG[item.risk?.level]?.color || C.textMuted }}>{item.query_status === 'error' ? 'ERRO DE CONSULTA' : RISK_CFG[item.risk?.level]?.label || 'SEM CLASSIFICAÇÃO'}</span><span>{timeAgo(item.timestamp)}</span></div>
      </button>) : <div className="sidebar-recent-empty">Nenhuma consulta salva neste navegador.</div>}
    </div>
  </aside>;
}
