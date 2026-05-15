import { useState } from "react";
import { C, FONT } from "../lib/theme";
import Icon from "./Icon";

function Tooltip({ label, children }) {
  const [rect, setRect] = useState(null);

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={e => setRect(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setRect(null)}
    >
      {children}
      {rect && (
        <div style={{
          position: "fixed",
          left: rect.right + 8,
          top: rect.top + rect.height / 2,
          transform: "translateY(-50%)",
          background: C.bgCard,
          color: C.text,
          padding: "6px 10px",
          borderRadius: 6,
          fontSize: 12,
          whiteSpace: "nowrap",
          zIndex: 9999,
          border: `1px solid ${C.border}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          pointerEvents: "none",
          fontFamily: FONT,
          fontWeight: 500,
        }}>
          {label}
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, collapsed }) {
  const btn = (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: collapsed ? "10px 0" : "10px 14px",
        justifyContent: collapsed ? "center" : "flex-start",
        background: active ? "rgba(59, 130, 246, 0.12)" : "transparent",
        border: "none",
        borderRadius: 8,
        color: active ? C.accentLight : C.textMuted,
        fontSize: 14,
        fontFamily: FONT,
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s, color 0.15s, padding 0.3s ease",
        fontWeight: active ? 500 : 400,
        overflow: "hidden",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.bgCardHover; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ flexShrink: 0, display: "flex" }}>
        <Icon name={icon} size={18} />
      </span>
      <span style={{
        overflow: "hidden",
        maxWidth: collapsed ? 0 : 160,
        opacity: collapsed ? 0 : 1,
        whiteSpace: "nowrap",
        transition: "max-width 0.25s ease, opacity 0.18s ease",
      }}>
        {label}
      </span>
    </button>
  );

  return collapsed ? <Tooltip label={label}>{btn}</Tooltip> : btn;
}

export default function Sidebar({ activePage, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);

  const items = [
    { id: "Dashboard", icon: "dashboard" },
    { id: "Enrichment", icon: "search" },
    { id: "Bulk Enrichment", icon: "layers" },
    { id: "Threat Feed", icon: "alert" },
    { id: "Phishing", icon: "mail" },
    { id: "Graph", icon: "target" },
    { id: "History", icon: "history" },
    { id: "Reports", icon: "reports" },
    { id: "Settings", icon: "settings" },
  ];

  return (
    <aside
      className="app-sidebar"
      style={{
        width: collapsed ? 64 : 240,
        background: C.bgSidebar,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "20px 10px",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        transition: "width 0.3s ease",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed ? "0 0 24px" : "0 4px 24px",
        justifyContent: collapsed ? "center" : "flex-start",
        transition: "padding 0.3s ease",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          flexShrink: 0,
          background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4z" />
            <circle cx="12" cy="12" r="3" fill="#fff" />
            <path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth="1" />
          </svg>
        </div>
        <span style={{
          fontSize: 16,
          fontWeight: 600,
          color: C.text,
          whiteSpace: "nowrap",
          overflow: "hidden",
          maxWidth: collapsed ? 0 : 180,
          opacity: collapsed ? 0 : 1,
          transition: "max-width 0.25s ease, opacity 0.18s ease",
        }}>
          IOC Enricher
        </span>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map(item => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.id}
            active={activePage === item.id}
            onClick={() => onNavigate(item.id)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      <div style={{ marginTop: "auto" }}>
        {/* Toggle button */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "8px",
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.textMuted,
            cursor: "pointer",
            transition: "background 0.15s, color 0.15s",
            marginBottom: 12,
            marginTop: 16,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = C.bgCardHover;
            e.currentTarget.style.color = C.text;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = C.textMuted;
          }}
        >
          <Icon name={collapsed ? "chevRight" : "chevLeft"} size={15} />
        </button>

        {/* Branding */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "12px 0 0" : "12px 4px 0",
          justifyContent: collapsed ? "center" : "flex-start",
          overflow: "hidden",
          transition: "padding 0.3s ease",
        }}>
          <span style={{ flexShrink: 0, display: "flex" }}>
            <Icon name="target" size={16} color={C.accentLight} />
          </span>
          <div style={{
            overflow: "hidden",
            maxWidth: collapsed ? 0 : 160,
            opacity: collapsed ? 0 : 1,
            transition: "max-width 0.25s ease, opacity 0.18s ease",
            whiteSpace: "nowrap",
          }}>
            <div style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>Blue Team Lab</div>
            <div style={{ fontSize: 10, color: C.textDim }}>v1.0.0</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
