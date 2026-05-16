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
          left: rect.right + 10,
          top: rect.top + rect.height / 2,
          transform: "translateY(-50%)",
          background: "#0c1e36",
          color: C.text,
          padding: "6px 12px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: "nowrap",
          zIndex: 9999,
          border: `1px solid ${C.borderAccent}`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(96,165,250,0.08)",
          pointerEvents: "none",
          fontFamily: FONT,
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
        padding: collapsed ? "10px 0" : "10px 12px",
        justifyContent: collapsed ? "center" : "flex-start",
        background: active
          ? `linear-gradient(90deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)`
          : "transparent",
        border: "none",
        borderRadius: 10,
        borderLeft: active ? `2px solid ${C.accentLight}` : "2px solid transparent",
        color: active ? C.accentLight : C.textMuted,
        fontSize: 13,
        fontFamily: FONT,
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s ease",
        fontWeight: active ? 600 : 400,
        overflow: "hidden",
        boxShadow: active ? `inset 0 0 20px ${C.accentGlow}` : "none",
        marginLeft: active ? 0 : 2,
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          e.currentTarget.style.color = C.text;
          e.currentTarget.style.borderLeftColor = C.borderAccent;
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = C.textMuted;
          e.currentTarget.style.borderLeftColor = "transparent";
        }
      }}
    >
      <span style={{ flexShrink: 0, display: "flex" }}>
        <Icon name={icon} size={17} color={active ? C.accentLight : "currentColor"} />
      </span>
      <span style={{
        overflow: "hidden",
        maxWidth: collapsed ? 0 : 160,
        opacity: collapsed ? 0 : 1,
        whiteSpace: "nowrap",
        transition: "max-width 0.25s ease, opacity 0.18s ease",
        letterSpacing: active ? "0.01em" : 0,
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
        width: collapsed ? 64 : 228,
        background: `linear-gradient(180deg, #040f22 0%, #030d1c 100%)`,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "18px 10px",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        transition: "width 0.3s ease",
        overflow: "hidden",
        boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
      }}
    >
      {/* Logo */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed ? "0 0 22px" : "0 4px 22px",
        justifyContent: collapsed ? "center" : "flex-start",
        transition: "padding 0.3s ease",
        overflow: "hidden",
        flexShrink: 0,
        borderBottom: `1px solid ${C.border}`,
        marginBottom: 12,
      }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          flexShrink: 0,
          background: `linear-gradient(135deg, ${C.accent} 0%, #1d4ed8 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 4px 16px ${C.accentGlow}, 0 0 0 1px rgba(59,130,246,0.3)`,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4z" />
            <circle cx="12" cy="12" r="3" fill="#fff" />
            <path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth="1" />
          </svg>
        </div>
        <div style={{
          overflow: "hidden",
          maxWidth: collapsed ? 0 : 180,
          opacity: collapsed ? 0 : 1,
          transition: "max-width 0.25s ease, opacity 0.18s ease",
          whiteSpace: "nowrap",
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>
            IOC Enricher
          </div>
          <div style={{ fontSize: 10, fontWeight: 500, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Threat Intelligence
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
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
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
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
            borderRadius: 10,
            color: C.textMuted,
            cursor: "pointer",
            transition: "all 0.15s ease",
            marginBottom: 12,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = C.borderAccent;
            e.currentTarget.style.color = C.text;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.color = C.textMuted;
          }}
        >
          <Icon name={collapsed ? "chevRight" : "chevLeft"} size={15} />
        </button>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "4px 0" : "4px",
          justifyContent: collapsed ? "center" : "flex-start",
          overflow: "hidden",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: "rgba(52,211,153,0.1)",
            border: "1px solid rgba(52,211,153,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
          </div>
          <div style={{
            overflow: "hidden",
            maxWidth: collapsed ? 0 : 160,
            opacity: collapsed ? 0 : 1,
            transition: "max-width 0.25s ease, opacity 0.18s ease",
            whiteSpace: "nowrap",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>Blue Team Lab</div>
            <div style={{ fontSize: 10, color: C.green }}>● All systems online</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
