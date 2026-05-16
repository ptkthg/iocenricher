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
          color: h.risk?.level === "CRÍTICO" ? C.red : C.orange,
        }));
      setNotifications(highRisk);
    } catch {}
  }, [notifOpen]);

  const hasUnread = notifications.length > 0;

  return (
    <header style={{
      height: 64,
      borderBottom: `1px solid ${C.border}`,
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      background: "rgba(3,13,28,0.92)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 1px 0 rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.3)",
    }}>
      {/* Logo icon */}
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: `linear-gradient(135deg, ${C.accent} 0%, #1d4ed8 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        boxShadow: `0 4px 12px ${C.accentGlow}`,
      }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4z" />
          <circle cx="12" cy="12" r="3" fill="#fff" />
          <path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth="1" />
        </svg>
      </div>

      {/* Search bar */}
      <div className="search-bar" style={{ flex: 1, maxWidth: 520, position: "relative" }}>
        <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <Icon name="search" size={15} color={C.textDim} />
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && query.trim()) { onSearch?.(query.trim()); setQuery(""); } }}
          placeholder="Search IPs, domains, hashes, URLs..."
          style={{
            width: "100%",
            padding: "9px 56px 9px 38px",
            background: "rgba(5,15,30,0.8)",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            color: C.text,
            fontSize: 13,
            fontFamily: FONT,
            outline: "none",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          }}
          onFocus={e => {
            e.target.style.borderColor = C.accent;
            e.target.style.boxShadow = `0 0 0 3px ${C.accentGlow}`;
          }}
          onBlur={e => {
            e.target.style.borderColor = C.border;
            e.target.style.boxShadow = "none";
          }}
        />
        <span style={{
          position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)",
          fontSize: 10, fontWeight: 600, color: C.textDim,
          padding: "2px 6px", border: `1px solid ${C.border}`, borderRadius: 5,
          fontFamily: FONT, background: "rgba(255,255,255,0.02)",
        }}>⌘ K</span>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>

        {/* Notification bell */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
            style={{
              background: notifOpen ? C.accentGlow : "transparent",
              border: `1px solid ${notifOpen ? C.borderAccent : "transparent"}`,
              borderRadius: 9,
              cursor: "pointer",
              color: notifOpen ? C.accentLight : C.textMuted,
              padding: "8px",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => { if (!notifOpen) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = C.text; } }}
            onMouseLeave={e => { if (!notifOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textMuted; } }}
          >
            <Icon name="bell" size={19} color="currentColor" />
            {hasUnread && (
              <span style={{
                position: "absolute", top: 5, right: 5,
                width: 8, height: 8, borderRadius: "50%",
                background: C.red,
                border: `2px solid #030d1c`,
                boxShadow: `0 0 6px ${C.red}`,
              }} />
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown" style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0, width: 340,
              background: "#081628",
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(96,165,250,0.06)",
              zIndex: 200, overflow: "hidden",
            }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Notifications</span>
                {hasUnread && <Badge color={C.red}>{notifications.length} high risk</Badge>}
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>
                  No high-risk indicators yet.
                </div>
              ) : (
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {notifications.map((n, i) => (
                    <div key={i}
                      onClick={() => { onSearch?.(n.body); setNotifOpen(false); }}
                      style={{ padding: "12px 16px", borderBottom: `1px solid ${C.borderSubtle}`, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12, transition: "background 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: `${n.color}15`, border: `1px solid ${n.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
                <button onClick={() => { onNavigate?.("History"); setNotifOpen(false); }} style={{ background: "transparent", border: "none", color: C.accentLight, fontSize: 12, cursor: "pointer", fontFamily: FONT, fontWeight: 500 }}>
                  View all in History →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: C.border }} />

        {/* Profile */}
        <div ref={profileRef} style={{ position: "relative" }}>
          <div
            onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "5px 10px 5px 5px",
              borderRadius: 10, cursor: "pointer",
              border: `1px solid ${profileOpen ? C.borderAccent : "transparent"}`,
              background: profileOpen ? C.accentGlow : "transparent",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => { if (!profileOpen) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = C.border; } }}
            onMouseLeave={e => { if (!profileOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: isGuest ? C.bgInput : `linear-gradient(135deg, ${C.accent}, #1d4ed8)`,
              border: isGuest ? `1px solid ${C.border}` : `2px solid rgba(96,165,250,0.3)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: isGuest ? C.textMuted : "#fff",
              boxShadow: isGuest ? "none" : `0 0 12px ${C.accentGlow}`,
            }}>
              {initials}
            </div>
            <div className="topbar-name">
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 600, lineHeight: 1.2 }}>{isGuest ? "Guest" : displayName.split(" ")[0]}</div>
                {isGuest && <span style={{ fontSize: 9, background: "rgba(148,163,184,0.12)", color: C.textMuted, padding: "1px 6px", borderRadius: 4, fontWeight: 700, letterSpacing: "0.06em" }}>GUEST</span>}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{isGuest ? "Visitor" : "Analista SOC"}</div>
            </div>
            <Icon name={profileOpen ? "arrowUp" : "arrowDown"} size={11} color={C.textDim} />
          </div>

          {profileOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0, width: 220,
              background: "#081628",
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(96,165,250,0.06)",
              zIndex: 200, overflow: "hidden",
            }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: isGuest ? C.bgInput : `linear-gradient(135deg, ${C.accent}, #1d4ed8)`, border: isGuest ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: isGuest ? C.textMuted : "#fff" }}>{initials}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{isGuest ? "Guest User" : displayName}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{isGuest ? "No account" : email}</div>
                  </div>
                </div>
                {isGuest && (
                  <button onClick={() => { onLogout(); setProfileOpen(false); }} style={{ marginTop: 10, width: "100%", padding: "8px", background: `linear-gradient(135deg, ${C.accent}, #1d4ed8)`, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
                    Create Account / Sign In
                  </button>
                )}
              </div>

              {[
                { icon: "user", label: "View Profile", action: () => { onNavigate?.("Settings"); setProfileOpen(false); } },
                { icon: "settings", label: "Settings", action: () => { onNavigate?.("Settings"); setProfileOpen(false); } },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ width: "100%", padding: "10px 16px", background: "transparent", border: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: C.text, fontSize: 13, fontFamily: FONT, textAlign: "left", transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <Icon name={item.icon} size={14} color={C.textMuted} />
                  {item.label}
                </button>
              ))}

              <div style={{ borderTop: `1px solid ${C.border}`, margin: "4px 0" }} />

              <button onClick={() => { onLogout(); setProfileOpen(false); }}
                style={{ width: "100%", padding: "10px 16px", background: "transparent", border: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: C.red, fontSize: 13, fontFamily: FONT, textAlign: "left", transition: "background 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.background = C.redBg}
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

function Badge({ children, color }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, background: `${color}15`, color,
      padding: "2px 8px", borderRadius: 10, border: `1px solid ${color}25`,
      letterSpacing: "0.03em",
    }}>{children}</span>
  );
}
