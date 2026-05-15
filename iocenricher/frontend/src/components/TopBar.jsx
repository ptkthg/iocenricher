import { useState, useEffect, useRef } from "react";
import { C, FONT, timeAgo } from "../lib/theme";
import Icon from "./Icon";

function useClickOutside(ref, handler) {
  useEffect(() => {
    function listener(e) {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    }
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

export default function TopBar({ onSearch, user, onLogout, onNavigate }) {
  const [query, setQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const displayName = user?.name || "Patrick Thiago";
  const email = user?.email || "ptkamp1@gmail.com";
  const isGuest = user?.isGuest;
  const initials = isGuest ? "G" : displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  useClickOutside(notifRef, () => setNotifOpen(false));
  useClickOutside(profileRef, () => setProfileOpen(false));

  // Load recent high-risk IOCs as notifications
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem("iocenricher_history") || "[]");
      const highRisk = history
        .filter(h => ["CRÍTICO", "ALTO"].includes(h.risk?.level))
        .slice(0, 6)
        .map(h => ({
          id: h.indicator,
          title: `${h.risk?.level} risk detected`,
          body: h.indicator,
          type: h.type,
          score: h.risk?.score,
          time: h.timestamp,
          color: h.risk?.level === "CRÍTICO" ? "#f87171" : "#f59e0b",
        }));
      setNotifications(highRisk);
    } catch {}
  }, [notifOpen]);

  const hasUnread = notifications.length > 0;

  const RISK_COLORS = { CRÍTICO: "#f87171", ALTO: "#f59e0b", MÉDIO: "#facc15", BAIXO: "#10b981" };

  return (
    <header style={{
      height: 64, borderBottom: `1px solid ${C.border}`, padding: "0 28px",
      display: "flex", alignItems: "center", gap: 20,
      background: C.bgSidebar, position: "sticky", top: 0, zIndex: 100
    }}>
      {/* Logo icon */}
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4z" />
          <circle cx="12" cy="12" r="3" fill="#fff" />
          <path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth="1" />
        </svg>
      </div>

      {/* Search bar */}
      <div className="search-bar" style={{ flex: 1, maxWidth: 540, position: "relative" }}>
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <Icon name="search" size={16} color={C.textDim} />
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && query.trim()) { onSearch?.(query.trim()); setQuery(""); } }}
          placeholder="Search indicators, hashes, IPs, domains..."
          style={{ width: "100%", padding: "10px 60px 10px 40px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: FONT, outline: "none" }}
          onFocus={e => e.target.style.borderColor = C.accent}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.textDim, padding: "2px 6px", border: `1px solid ${C.border}`, borderRadius: 4 }}>⌘ K</span>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>

        {/* Notification bell */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
            style={{ background: notifOpen ? "rgba(59,130,246,0.12)" : "transparent", border: `1px solid ${notifOpen ? C.accent : "transparent"}`, borderRadius: 8, cursor: "pointer", color: C.textMuted, padding: 8, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="bell" size={20} color={notifOpen ? C.accentLight : C.textMuted} />
            {hasUnread && (
              <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: C.red, border: `1.5px solid ${C.bgSidebar}` }} />
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 200, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Notifications</span>
                {hasUnread && <span style={{ fontSize: 11, background: "rgba(248,113,113,0.15)", color: C.red, padding: "2px 8px", borderRadius: 10 }}>{notifications.length} high risk</span>}
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>
                  No high-risk indicators detected yet.
                </div>
              ) : (
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {notifications.map((n, i) => (
                    <div key={i}
                      onClick={() => { onSearch?.(n.body); setNotifOpen(false); }}
                      style={{ padding: "12px 16px", borderBottom: `1px solid ${C.borderSubtle}`, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12, transition: "background 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bgCardHover}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${n.color}18`, border: `1px solid ${n.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name="alert" size={14} color={n.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: n.color, marginBottom: 2 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: C.text, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>Score: {n.score} · {timeAgo(n.time)}</div>
                      </div>
                      <Icon name="arrowRight" size={12} color={C.textDim} />
                    </div>
                  ))}
                </div>
              )}
              <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
                <button onClick={() => { onNavigate?.("History"); setNotifOpen(false); }} style={{ background: "transparent", border: "none", color: C.accentLight, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
                  View all in History →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div ref={profileRef} style={{ position: "relative" }}>
          <div
            onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 10px 4px 4px", borderRadius: 10, cursor: "pointer", border: `1px solid ${profileOpen ? C.border : "transparent"}`, background: profileOpen ? C.bgInput : "transparent", transition: "all 0.15s" }}
            onMouseEnter={e => { if (!profileOpen) e.currentTarget.style.background = C.bgInput; }}
            onMouseLeave={e => { if (!profileOpen) e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: isGuest ? C.bgInput : `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`, border: isGuest ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: isGuest ? C.textMuted : "#fff" }}>
              {initials}
            </div>
            <div className="topbar-name">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500, lineHeight: 1.2 }}>{isGuest ? "Guest" : displayName.split(" ")[0]}</div>
                {isGuest && <span style={{ fontSize: 10, background: "rgba(148,163,184,0.15)", color: C.textMuted, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>GUEST</span>}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{isGuest ? "Visitor" : "Analista SOC"}</div>
            </div>
            <Icon name={profileOpen ? "arrowUp" : "arrowDown"} size={12} color={C.textDim} style={{ marginLeft: 2 }} />
          </div>

          {profileOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 220, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 200, overflow: "hidden" }}>
              {/* User info header */}
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: isGuest ? C.bgInput : `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`, border: isGuest ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: isGuest ? C.textMuted : "#fff" }}>{initials}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{isGuest ? "Guest User" : displayName}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{isGuest ? "No account — data not saved" : email}</div>
                  </div>
                </div>
                {isGuest && (
                  <button onClick={() => { onLogout(); setProfileOpen(false); }} style={{ marginTop: 10, width: "100%", padding: "8px", background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
                    Create Account / Sign In
                  </button>
                )}
              </div>

              {/* Menu items */}
              {[
                { icon: "user", label: "View Profile", action: () => { onNavigate?.("Settings"); setProfileOpen(false); } },
                { icon: "settings", label: "Settings", action: () => { onNavigate?.("Settings"); setProfileOpen(false); } },
              ].map(item => (
                <button key={item.label} onClick={item.action} style={{ width: "100%", padding: "10px 16px", background: "transparent", border: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: C.text, fontSize: 13, fontFamily: FONT, textAlign: "left", transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgCardHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <Icon name={item.icon} size={14} color={C.textMuted} />
                  {item.label}
                </button>
              ))}

              <div style={{ borderTop: `1px solid ${C.border}`, margin: "4px 0" }} />

              <button onClick={() => { onLogout(); setProfileOpen(false); }} style={{ width: "100%", padding: "10px 16px", background: "transparent", border: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: C.red, fontSize: 13, fontFamily: FONT, textAlign: "left", transition: "background 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <Icon name="logOut" size={14} color={C.red} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
