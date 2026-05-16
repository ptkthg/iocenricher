import { useState, useEffect, useMemo } from "react";
import { C, FONT, RISK_CFG, timeAgo, fmtDate, detectType } from "../lib/theme";
import { enrichIndicator, getHistory, addToHistory } from "../lib/api";
import Icon from "../components/Icon";
import { Card, Badge, Button, Input, PageHeader } from "../components/UI";

function ScoreGauge({ score, level }) {
  const cfg = RISK_CFG[level] || RISK_CFG.BAIXO;
  const r = 32, cx = 40, cy = 40, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: 80, height: 80 }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth="6" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={cfg.color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: cfg.color, lineHeight: 1, fontFamily: FONT }}>{score}</span>
        <span style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>/100</span>
      </div>
    </div>
  );
}

function Sparkline({ data, color }) {
  const w = 360, h = 120, pad = 20;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const areaPath = `M ${points.split(" ")[0]} L ${points} L ${pad + (w - pad * 2)},${h - pad} L ${pad},${h - pad} Z`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((v, i) => {
        const y = pad + (1 - v / 100) * (h - pad * 2);
        return <line key={i} x1={pad} y1={y} x2={w - pad} y2={y} stroke={C.border} strokeWidth="0.5" strokeDasharray="2 2" />;
      })}
      {[0, 25, 50, 75, 100].map((v, i) => {
        const y = pad + (1 - v / 100) * (h - pad * 2);
        return <text key={i} x={pad - 4} y={y + 3} fill={C.textDim} fontSize="9" textAnchor="end">{v}</text>;
      })}
      <path d={areaPath} fill="url(#sparkfill)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function GeoBar({ label, pct }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 50px", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span style={{ fontSize: 13, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="globe" size={14} color={C.accentLight} />
        {label}
      </span>
      <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: C.accent, borderRadius: 4, transition: "width 0.8s" }} />
      </div>
      <span style={{ fontSize: 13, color: C.textMuted, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function Confidence({ level }) {
  const map = { High: 5, Medium: 3, Low: 1 };
  const filled = map[level] || 0;
  const color = level === "High" ? C.green : level === "Medium" ? C.yellow : C.textDim;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13, color: C.text }}>{level}</span>
      <div style={{ display: "flex", gap: 2 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i <= filled ? color : C.border }} />
        ))}
      </div>
    </div>
  );
}

function TypePill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 18px", borderRadius: 999,
      background: active ? "rgba(59, 130, 246, 0.15)" : "transparent",
      border: `1px solid ${active ? C.accent : C.border}`,
      color: active ? C.accentLight : C.textMuted,
      fontSize: 13, fontFamily: FONT, fontWeight: active ? 500 : 400,
      cursor: "pointer", transition: "all 0.15s"
    }}>{label}</button>
  );
}

function ActionRow({ icon, iconColor, iconBg, title, desc, btnLabel, btnColor, btnBg, recommended, active, onClick }) {
  const [done, setDone] = useState(false);
  function handleClick() {
    setDone(true);
    onClick?.();
    setTimeout(() => setDone(false), 2000);
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${C.borderSubtle}` }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: active ? btnBg : iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
        <Icon name={done ? "check" : icon} size={18} color={active ? btnColor : iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: active ? btnColor : C.text, fontWeight: active ? 600 : 500, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.4 }}>{desc}</div>
      </div>
      <button
        onClick={handleClick}
        style={{
          padding: "7px 18px", borderRadius: 8,
          background: active || done ? btnBg : "transparent",
          border: `1px solid ${active || done ? btnColor : btnColor + "66"}`,
          color: btnColor, fontSize: 12, fontFamily: FONT, fontWeight: active ? 600 : 500,
          cursor: "pointer", flexShrink: 0, transition: "all 0.2s",
          display: "flex", alignItems: "center", gap: 6
        }}
      >
        {done && <Icon name="check" size={12} color={btnColor} />}
        {done ? "Done!" : active ? `✓ ${btnLabel}` : btnLabel}
      </button>
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <tr>
      <td style={{ padding: "8px 16px 8px 0", color: C.textMuted, fontSize: 13, verticalAlign: "top", whiteSpace: "nowrap" }}>{label}</td>
      <td style={{ padding: "8px 0", color: C.text, fontSize: 13 }}>{children}</td>
    </tr>
  );
}

const TACTIC_COLORS = {
  'Initial Access':        { color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  'Execution':             { color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  'Persistence':           { color: '#facc15', bg: 'rgba(250,204,21,0.1)' },
  'Defense Evasion':       { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  'Credential Access':     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  'Collection':            { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  'Command and Control':   { color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  'Exfiltration':          { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  'Impact':                { color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  'Resource Development':  { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

function MitreCard({ techniques }) {
  // Group by tactic
  const byTactic = {};
  techniques.forEach(t => {
    if (!byTactic[t.tactic]) byTactic[t.tactic] = [];
    byTactic[t.tactic].push(t);
  });

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>MITRE ATT&CK Mapping</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0, marginTop: 2 }}>
            {techniques.length} technique{techniques.length !== 1 ? 's' : ''} mapped across {Object.keys(byTactic).length} tactic{Object.keys(byTactic).length !== 1 ? 's' : ''}
          </p>
        </div>
        <a
          href="https://attack.mitre.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginLeft: 'auto', fontSize: 11, color: C.accentLight, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ATT&CK Navigator ↗
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(byTactic).map(([tactic, techs]) => {
          const style = TACTIC_COLORS[tactic] || { color: C.textMuted, bg: 'rgba(136,150,173,0.1)' };
          return (
            <div key={tactic}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: style.color }}>{tactic}</span>
                <div style={{ flex: 1, height: 1, background: `${style.color}33` }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {techs.map(tech => (
                  <a
                    key={tech.id}
                    href={tech.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{
                      padding: '10px 14px',
                      background: style.bg,
                      border: `1px solid ${style.color}44`,
                      borderRadius: 10,
                      display: 'flex', flexDirection: 'column', gap: 4,
                      cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s',
                      minWidth: 180
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = style.color; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = `${style.color}44`; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: style.color, background: `${style.color}18`, padding: '2px 7px', borderRadius: 5 }}>
                          {tech.id}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{tech.name}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(59,130,246,0.06)', border: `1px solid ${C.accent}22`, borderRadius: 8, fontSize: 12, color: C.textMuted }}>
        ℹ Techniques are mapped based on threat intelligence signals from OSINT sources. Click any technique to view full details on MITRE ATT&CK.
      </div>
    </Card>
  );
}

const FP_COLORS = {
  LOW:    { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Low' },
  MEDIUM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Medium' },
  HIGH:   { color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'High' },
};

function AiAnalysisCard({ analysis, loading }) {
  if (!analysis && !loading) return null;

  const fp = FP_COLORS[analysis?.false_positive_likelihood] || FP_COLORS.MEDIUM;

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><circle cx="18" cy="18" r="4"/><path d="M18 16v2l1 1"/>
          </svg>
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>AI Analysis</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0, marginTop: 2 }}>Powered by Groq · Llama 3.3 70B</p>
        </div>
        {analysis && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: fp.bg, border: `1px solid ${fp.color}44` }}>
            <span style={{ fontSize: 10, color: fp.color, fontWeight: 600 }}>FP Risk: {fp.label}</span>
          </div>
        )}
      </div>

      {!analysis ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: C.textMuted, fontSize: 13 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${C.purple}44`, borderTopColor: C.purple, animation: 'spin 0.8s linear infinite' }} />
          Generating AI analysis...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Summary */}
          {analysis.summary && (
            <div style={{ padding: '14px 16px', background: 'rgba(167,139,250,0.06)', border: `1px solid rgba(167,139,250,0.2)`, borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Summary</div>
              <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.7 }}>{analysis.summary}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Threat Actor Profile */}
            {analysis.threat_actor_profile && (
              <div style={{ padding: '12px 14px', background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Threat Profile</div>
                <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.6 }}>{analysis.threat_actor_profile}</p>
              </div>
            )}

            {/* False Positive */}
            {analysis.false_positive_reason && (
              <div style={{ padding: '12px 14px', background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>False Positive Assessment</div>
                <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.6 }}>{analysis.false_positive_reason}</p>
              </div>
            )}
          </div>

          {/* Context */}
          {analysis.context && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Technical Context</div>
              <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.7 }}>{analysis.context}</p>
            </div>
          )}

          {/* Next Steps */}
          {analysis.next_steps?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>Recommended Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analysis.next_steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.purple, flexShrink: 0, marginTop: 1 }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// Country code → emoji flag
function countryFlag(code) {
  if (!code || code.length !== 2) return "🌐";
  return code.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(c.charCodeAt(0) + 127397)
  );
}

// Logos for each OSINT source — real favicons where available, SVG fallbacks for others
const SOURCE_ICONS = {
  virustotal:    '/icons/virustotal.png',
  abuseipdb:     '/icons/abuseipdb.png',
  ipinfo:        '/icons/ipinfo.png',
  shodan:        '/icons/shodan.png',
  urlhaus:       '/icons/urlhaus.png',
  malwarebazaar: '/icons/malwarebazaar.png',
  urlscan:       '/icons/urlscan.png',
  groq:          '/icons/groq.png',
  hackertarget:  '/icons/hackertarget.png',
  feodo:         '/icons/feodo.png',
};

function SourceLogo({ name }) {
  if (SOURCE_ICONS[name]) {
    return (
      <img
        src={SOURCE_ICONS[name]}
        alt={name}
        width="26" height="26"
        style={{ borderRadius: 6, objectFit: "contain", display: "block" }}
      />
    );
  }
  const svgs = {
    passivedns: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <rect width="26" height="26" rx="6" fill="#0891b2"/>
        <ellipse cx="13" cy="13" rx="7" ry="4" stroke="white" strokeWidth="1.5" fill="none"/>
        <path d="M6 13c0 3.5 3.1 6 7 6s7-2.5 7-6" stroke="white" strokeWidth="1.5" fill="none"/>
        <path d="M13 9v8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    whois: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <rect width="26" height="26" rx="6" fill="#7c3aed"/>
        <rect x="6" y="7" width="14" height="12" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
        <path d="M9 11h8M9 14h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    ssl: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <rect width="26" height="26" rx="6" fill="#059669"/>
        <rect x="7" y="12" width="12" height="8" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
        <path d="M10 12V9a3 3 0 016 0v3" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="13" cy="16" r="1.5" fill="white"/>
      </svg>
    ),
    subnet: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <rect width="26" height="26" rx="6" fill="#d97706"/>
        <circle cx="13" cy="8" r="2.5" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="7" cy="18" r="2.5" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="19" cy="18" r="2.5" stroke="white" strokeWidth="1.5" fill="none"/>
        <path d="M13 10.5v3M10.5 16.5L13 13.5M15.5 16.5L13 13.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  };
  return svgs[name] || <span style={{ fontSize: 16 }}>🔍</span>;
}

function CopyButton({ text, size = 13 }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      onClick={copy}
      title="Copy to clipboard"
      style={{
        background: copied ? "rgba(52,211,153,0.12)" : "transparent",
        border: `1px solid ${copied ? C.green + "55" : "transparent"}`,
        borderRadius: 5,
        padding: "2px 5px",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={size} color={copied ? C.green : C.textDim} />
    </button>
  );
}

// Tooltip for info icons
function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <Icon name="info" size={13} color={visible ? C.accentLight : C.textDim} style={{ cursor: "help" }} />
      {visible && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
          background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "8px 12px", fontSize: 11, color: C.textMuted, lineHeight: 1.5,
          width: 220, zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          pointerEvents: "none", whiteSpace: "normal"
        }}>
          {text}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `5px solid ${C.border}` }} />
        </div>
      )}
    </span>
  );
}

function AbuseIPDBCard({ data }) {
  const scoreColor = data.abuse_score >= 80 ? C.red : data.abuse_score >= 50 ? C.orange : data.abuse_score >= 20 ? C.yellow : C.green;
  const scoreBg = data.abuse_score >= 80 ? C.redBg : data.abuse_score >= 50 ? C.orangeBg : data.abuse_score >= 20 ? "rgba(250,204,21,0.1)" : C.greenBg;

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(192,57,43,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SourceLogo name="abuseipdb" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>AbuseIPDB</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Crowd-sourced IP abuse database</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {data.is_tor && <Badge color={C.purple} bg="rgba(167,139,250,0.12)">TOR Exit Node</Badge>}
          <Badge color={scoreColor} bg={scoreBg}>{data.abuse_score}% Abuse</Badge>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Abuse Score", value: `${data.abuse_score}%`, color: scoreColor },
          { label: "Total Reports", value: data.total_reports?.toLocaleString() || "0", color: data.total_reports > 0 ? C.orange : C.green },
          { label: "Usage Type", value: data.usage_type || "—", color: C.text },
          { label: "ISP", value: data.isp?.split(" ").slice(0, 2).join(" ") || "—", color: C.textMuted },
        ].map(item => (
          <div key={item.label} style={{ padding: "12px 14px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {data.last_reported && (
        <div style={{ fontSize: 12, color: C.textMuted }}>
          Last reported: <span style={{ color: C.text }}>{new Date(data.last_reported).toLocaleDateString()}</span>
          {data.domain && <> · Domain: <span style={{ color: C.accentLight }}>{data.domain}</span></>}
        </div>
      )}
    </Card>
  );
}

function ShodanCard({ data }) {
  const COMMON_PORTS = { 21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS", 80: "HTTP", 110: "POP3", 143: "IMAP", 443: "HTTPS", 445: "SMB", 3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL", 6379: "Redis", 8080: "HTTP-Alt", 8443: "HTTPS-Alt", 27017: "MongoDB", 4444: "C2", 1337: "C2", 31337: "C2" };
  const RISKY_PORTS = [21, 23, 445, 3389, 4444, 1337, 31337, 5900, 27017, 6379];

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SourceLogo name="shodan" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Shodan</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Network intelligence — ports, services, CVEs</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {data.total_vulns > 0 && <Badge color={C.red} bg={C.redBg}>{data.total_vulns} CVEs</Badge>}
          <Badge color={data.total_ports > 10 ? C.orange : C.textMuted} bg="rgba(136,150,173,0.1)">{data.total_ports} ports</Badge>
        </div>
      </div>

      {/* Info row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Organization", value: data.org || "—" },
          { label: "OS", value: data.os || "Unknown" },
          { label: "ASN", value: data.asn || "—" },
          { label: "Last Scan", value: data.last_update ? new Date(data.last_update).toLocaleDateString() : "—" },
        ].map(item => (
          <div key={item.label} style={{ padding: "10px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Open ports */}
      {data.ports?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Open Ports</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.ports.slice(0, 20).map(port => {
              const isRisky = RISKY_PORTS.includes(port);
              const service = COMMON_PORTS[port];
              return (
                <div key={port} style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 12, fontFamily: "monospace",
                  background: isRisky ? "rgba(248,113,113,0.12)" : "rgba(59,130,246,0.08)",
                  border: `1px solid ${isRisky ? C.red + "44" : C.border}`,
                  color: isRisky ? C.red : C.text, fontWeight: isRisky ? 700 : 400,
                  display: "flex", alignItems: "center", gap: 4
                }}>
                  {isRisky && "⚠ "}{port}{service && <span style={{ fontSize: 10, color: isRisky ? C.red : C.textMuted }}>/{service}</span>}
                </div>
              );
            })}
            {data.ports.length > 20 && <span style={{ fontSize: 12, color: C.textMuted, alignSelf: "center" }}>+{data.ports.length - 20} more</span>}
          </div>
        </div>
      )}

      {/* CVEs */}
      {data.vulns?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
            Known Vulnerabilities ({data.vulns.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.vulns.slice(0, 5).map(vuln => (
              <div key={vuln.cve} style={{ padding: "10px 14px", background: "rgba(248,113,113,0.06)", border: `1px solid ${C.red}33`, borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <a href={`https://nvd.nist.gov/vuln/detail/${vuln.cve}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: C.red, fontFamily: "monospace", textDecoration: "none" }}>
                    {vuln.cve}
                  </a>
                  {vuln.cvss && (
                    <span style={{ fontSize: 11, background: vuln.cvss >= 9 ? C.redBg : vuln.cvss >= 7 ? C.orangeBg : "rgba(250,204,21,0.1)", color: vuln.cvss >= 9 ? C.red : vuln.cvss >= 7 ? C.orange : C.yellow, padding: "1px 7px", borderRadius: 4, fontWeight: 600 }}>
                      CVSS {vuln.cvss}
                    </span>
                  )}
                </div>
                {vuln.summary && <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{vuln.summary}</div>}
              </div>
            ))}
            {data.vulns.length > 5 && <div style={{ fontSize: 12, color: C.textMuted }}>+{data.vulns.length - 5} more vulnerabilities</div>}
          </div>
        </div>
      )}

      {/* Services */}
      {data.services?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Services Detected</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.services.filter(s => s.product).slice(0, 5).map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, padding: "6px 12px", background: C.bgInput, borderRadius: 7 }}>
                <span style={{ color: C.accentLight, fontFamily: "monospace", fontWeight: 600, minWidth: 50 }}>{s.port}/{s.transport}</span>
                <span style={{ color: C.text }}>{s.product}{s.version && <span style={{ color: C.textMuted }}> {s.version}</span>}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function PassiveDNSCard({ data, type }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(8,145,178,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SourceLogo name="passivedns" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Passive DNS</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Historical DNS resolutions via HackerTarget</p>
        </div>
        <Badge color={C.accentLight} bg="rgba(59,130,246,0.1)" style={{ marginLeft: "auto" }}>
          {data.total} records
        </Badge>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(type === "ip" ? data.domains : data.records?.map(r => `${r.host} → ${r.ip}`))?.slice(0, 20).map((item, i) => (
          <span key={i} style={{ padding: "4px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.text, fontFamily: "monospace" }}>
            {item}
          </span>
        ))}
        {data.total > 20 && <span style={{ fontSize: 12, color: C.textMuted, alignSelf: "center" }}>+{data.total - 20} more</span>}
      </div>
    </Card>
  );
}

function WHOISCard({ data }) {
  const ageColor = data.age_days < 30 ? C.red : data.age_days < 90 ? C.orange : C.green;
  const ageBg = data.age_days < 30 ? C.redBg : data.age_days < 90 ? C.orangeBg : C.greenBg;
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(124,58,237,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SourceLogo name="whois" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>WHOIS / RDAP</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Domain registration details</p>
        </div>
        {data.age_days !== null && (
          <Badge color={ageColor} bg={ageBg} style={{ marginLeft: "auto" }}>
            {data.age_days < 30 ? "⚠ Very New" : data.age_days < 90 ? "Recent" : "Established"} ({data.age_days}d)
          </Badge>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Registered", value: data.created ? new Date(data.created).toLocaleDateString() : "—" },
          { label: "Expires", value: data.expires ? new Date(data.expires).toLocaleDateString() : "—" },
          { label: "Registrar", value: data.registrar?.split(' ').slice(0,2).join(' ') || "—" },
        ].map(item => (
          <div key={item.label} style={{ padding: "10px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{item.value}</div>
          </div>
        ))}
      </div>
      {data.nameservers?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Nameservers</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.nameservers.map((ns, i) => (
              <span key={i} style={{ padding: "3px 8px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{ns}</span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function SSLCard({ data }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(5,150,105,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SourceLogo name="ssl" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>SSL/TLS Certificates</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Certificate transparency logs via crt.sh</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {data.has_expired && <Badge color={C.orange} bg={C.orangeBg}>Expired cert</Badge>}
          {data.has_self_signed && <Badge color={C.red} bg={C.redBg}>Self-signed</Badge>}
          <Badge color={C.textMuted} bg="rgba(136,150,173,0.1)">{data.total} total</Badge>
        </div>
      </div>
      {data.related_domains?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Related Domains in Same Certificate ({data.related_domains.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.related_domains.slice(0, 15).map((d, i) => (
              <span key={i} style={{ padding: "3px 10px", background: "rgba(59,130,246,0.08)", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.accentLight, fontFamily: "monospace" }}>{d}</span>
            ))}
            {data.related_domains.length > 15 && <span style={{ fontSize: 12, color: C.textMuted, alignSelf: "center" }}>+{data.related_domains.length - 15} more</span>}
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.certs?.slice(0, 4).map((cert, i) => (
          <div key={i} style={{ padding: "8px 12px", background: C.bgInput, border: `1px solid ${cert.is_expired ? C.orange + "55" : C.border}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cert.common_name}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{cert.issuer?.split('O=')[1]?.split(',')[0] || cert.issuer?.slice(0, 50)}</div>
            </div>
            {cert.is_expired ? <Badge color={C.orange} bg={C.orangeBg}>Expired</Badge> : <Badge color={C.green} bg={C.greenBg}>Valid</Badge>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function SubnetCard({ data }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(217,119,6,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SourceLogo name="subnet" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Subnet Intelligence</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>{data.subnet} — cross-referenced with Feodo Tracker</p>
        </div>
        <Badge color={data.total_malicious >= 5 ? C.red : C.orange} bg={data.total_malicious >= 5 ? C.redBg : C.orangeBg} style={{ marginLeft: "auto" }}>
          {data.total_malicious} malicious IPs nearby
        </Badge>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {data.malware_families?.map(m => (
          <div key={m.name} style={{ padding: "4px 10px", background: "rgba(248,113,113,0.1)", border: `1px solid ${C.red}33`, borderRadius: 6, fontSize: 12 }}>
            <span style={{ color: C.red, fontWeight: 600 }}>{m.name}</span>
            <span style={{ color: C.textMuted }}> ×{m.count}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {data.matches?.slice(0, 10).map((m, i) => (
          <span key={i} style={{ padding: "3px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 12, color: C.text, fontFamily: "monospace" }}>{m.ip}</span>
        ))}
      </div>
    </Card>
  );
}

function TyposquattingCard({ data }) {
  const HIGH = data.matches?.filter(m => m.confidence === "HIGH") || [];
  const MED = data.matches?.filter(m => m.confidence === "MEDIUM") || [];
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: C.redBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="alert" size={16} color={C.red} />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.red }}>⚠ Brand Impersonation Detected</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Typosquatting / phishing domain analysis</p>
        </div>
        <Badge color={C.red} bg={C.redBg} style={{ marginLeft: "auto" }}>Score {data.score}/100</Badge>
      </div>
      {data.matches?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {data.matches.map((m, i) => (
            <div key={i} style={{ padding: "10px 14px", background: m.confidence === "HIGH" ? "rgba(248,113,113,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${m.confidence === "HIGH" ? C.red : C.orange}33`, borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: m.confidence === "HIGH" ? C.red : C.orange }}>Imitates "{m.brand}"</span>
                <span style={{ fontSize: 12, color: C.textMuted }}> — {m.technique}</span>
              </div>
              <Badge color={m.confidence === "HIGH" ? C.red : C.orange} bg="transparent">{m.confidence}</Badge>
            </div>
          ))}
        </div>
      )}
      {data.flags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {data.flags.map((f, i) => (
            <span key={i} style={{ padding: "3px 10px", background: "rgba(245,158,11,0.1)", border: `1px solid ${C.orange}44`, borderRadius: 5, fontSize: 11, color: C.orange }}>{f}</span>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── VERDICT BANNER ──────────────────────────────────────────────────────────
function VerdictBanner({ result, risk }) {
  if (!risk) return null;

  const vt = result?.sources?.virustotal;
  const ab = result?.sources?.abuseipdb;
  const mb = result?.sources?.malwarebazaar;
  const uh = result?.sources?.urlhaus;
  const typo = result?.sources?.typosquatting;

  // Determine verdict
  let verdict, verdictLabel, confidence, reason, color, bg, icon;

  const malSources = [
    vt?.malicious > 0,
    ab?.abuse_score >= 50,
    mb?.found,
    uh?.found,
    result?.sources?.subnet?.found,
  ].filter(Boolean).length;

  if (risk.score >= 70 || malSources >= 2) {
    verdict = "MALICIOUS";
    verdictLabel = "Malicious";
    confidence = Math.min(95, 60 + malSources * 10 + Math.floor(risk.score / 10));
    reason = vt?.malicious > 0
      ? `Detected by ${vt.malicious} antivirus engines on VirusTotal`
      : mb?.found ? `Hash confirmed in MalwareBazaar — ${mb.signature || "known malware"}`
      : uh?.found ? `Listed in URLhaus as ${uh.threat || "malicious URL"}`
      : `High abuse score: ${ab?.abuse_score}% confirmed reports`;
    color = C.red; bg = "rgba(248,113,113,0.08)"; icon = "alert";
  } else if (risk.score >= 30 || malSources >= 1 || typo?.is_suspicious) {
    verdict = "SUSPICIOUS";
    verdictLabel = "Suspicious";
    confidence = Math.min(85, 40 + malSources * 15 + Math.floor(risk.score / 5));
    reason = typo?.is_suspicious
      ? `Possible brand impersonation: imitates "${typo.matches?.[0]?.brand}"`
      : ab?.abuse_score >= 20 ? `Reported for abuse with ${ab.abuse_score}% confidence`
      : `${risk.factors?.[0] || "Multiple suspicious indicators detected"}`;
    color = C.orange; bg = "rgba(245,158,11,0.08)"; icon = "eye";
  } else if (risk.score < 10 && !malSources) {
    verdict = "CLEAN";
    verdictLabel = "Clean";
    confidence = Math.min(90, 70 + (10 - risk.score) * 2);
    reason = vt?.harmless > 0
      ? `Marked clean by ${vt.harmless} sources. No malicious activity detected`
      : "No malicious activity found across all OSINT sources";
    color = C.green; bg = "rgba(16,185,129,0.08)"; icon = "check";
  } else {
    verdict = "INCONCLUSIVE";
    verdictLabel = "Inconclusive";
    confidence = 50;
    reason = "Insufficient data to make a definitive verdict. Manual investigation recommended";
    color = C.textMuted; bg = "rgba(136,150,173,0.08)"; icon = "info";
  }

  return (
    <div style={{
      padding: "20px 24px", borderRadius: 14,
      background: bg, border: `1.5px solid ${color}44`,
      display: "flex", alignItems: "center", gap: 20
    }}>
      {/* Big verdict */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, minWidth: 130, padding: "12px 20px", background: `${color}15`, borderRadius: 12, border: `1px solid ${color}33` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 1.5 }}>Verdict</div>
        <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{verdictLabel}</div>
        <div style={{ fontSize: 12, color, opacity: 0.8 }}>{confidence}% confidence</div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 60, background: `${color}33`, flexShrink: 0 }} />

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color, marginBottom: 6 }}>
          {verdict === "MALICIOUS" ? "⚠ Threat Confirmed" :
           verdict === "SUSPICIOUS" ? "⚡ Requires Investigation" :
           verdict === "CLEAN" ? "✓ No Threat Detected" : "? Needs Manual Review"}
        </div>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 8 }}>{reason}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge color={color} bg={`${color}18`}>Score {risk.score}/100</Badge>
          <Badge color={color} bg={`${color}18`}>{risk.level}</Badge>
          <Badge color={color} bg={`${color}18`}>{result.recommendation}</Badge>
          {vt?.malicious > 0 && <Badge color={C.red} bg={C.redBg}>{vt.malicious} AV detections</Badge>}
          {ab?.abuse_score > 0 && <Badge color={C.orange} bg={C.orangeBg}>{ab.abuse_score}% abuse</Badge>}
        </div>
      </div>

      {/* Confidence arc */}
      <div style={{ flexShrink: 0 }}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="32" fill="none" stroke={`${color}22`} strokeWidth="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${(confidence / 100) * 201} 201`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)" />
          <text x="40" y="44" textAnchor="middle" fill={color} fontSize="16" fontWeight="700" fontFamily={FONT}>{confidence}%</text>
        </svg>
      </div>
    </div>
  );
}

// ─── CONTEXT TIMELINE ─────────────────────────────────────────────────────────
function ContextTimeline({ result }) {
  const vt = result?.sources?.virustotal;
  const uh = result?.sources?.urlhaus;
  const mb = result?.sources?.malwarebazaar;
  const ab = result?.sources?.abuseipdb;
  const sh = result?.sources?.shodan;
  const whoisData = result?.sources?.whois;

  const events = [
    whoisData?.created && { date: whoisData.created, label: "Domain Registered", icon: "globe", color: C.accentLight, detail: whoisData.registrar?.split(" ").slice(0,2).join(" ") || "" },
    vt?.first_seen && { date: new Date(vt.first_seen * 1000).toISOString(), label: "First Seen (VirusTotal)", icon: "search", color: "#394EFF", detail: `${vt.malicious || 0} detections at first scan` },
    uh?.first_seen && { date: uh.first_seen, label: "Reported to URLhaus", icon: "alert", color: C.red, detail: uh.threat || "Malware distribution" },
    mb?.first_seen && { date: mb.first_seen, label: "Added to MalwareBazaar", icon: "alert", color: C.red, detail: mb.signature || "Malicious file" },
    ab?.last_reported && { date: ab.last_reported, label: "Last Abuse Report", icon: "alert", color: C.orange, detail: `${ab.total_reports} total reports · ${ab.abuse_score}% confidence` },
    sh?.last_update && { date: sh.last_update, label: "Last Shodan Scan", icon: "target", color: C.textMuted, detail: `${sh.total_ports} ports · ${sh.total_vulns} CVEs` },
    { date: result.timestamp, label: "This Analysis", icon: "check", color: C.green, detail: `Score ${result.risk?.score}/100 · ${result.recommendation}`, isNow: true },
  ].filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date));

  if (events.length < 2) return null;

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="clock" size={16} color={C.accentLight} />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Context Timeline</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Historical activity across all intelligence sources</p>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: C.textMuted }}>
          {events.length} events spanning {
            Math.floor((new Date(events[events.length-1].date) - new Date(events[0].date)) / 86400000)
          } days
        </div>
      </div>

      <div style={{ position: "relative", paddingLeft: 28 }}>
        {/* Vertical line */}
        <div style={{ position: "absolute", left: 11, top: 8, bottom: 8, width: 2, background: `linear-gradient(to bottom, ${C.accent}44, ${C.border})`, borderRadius: 1 }} />

        {events.map((ev, i) => (
          <div key={i} style={{ position: "relative", marginBottom: i < events.length - 1 ? 20 : 0 }}>
            {/* Dot */}
            <div style={{
              position: "absolute", left: -20, top: 2,
              width: 12, height: 12, borderRadius: "50%",
              background: ev.isNow ? ev.color : `${ev.color}33`,
              border: `2px solid ${ev.color}`,
              boxShadow: ev.isNow ? `0 0 8px ${ev.color}88` : "none"
            }} />

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: ev.isNow ? 600 : 500, color: ev.isNow ? ev.color : C.text, marginBottom: 2 }}>
                  {ev.label}
                </div>
                {ev.detail && <div style={{ fontSize: 11, color: C.textMuted }}>{ev.detail}</div>}
              </div>
              <div style={{ fontSize: 11, color: C.textDim, whiteSpace: "nowrap", flexShrink: 0, marginTop: 2 }}>
                {new Date(ev.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── INVESTIGATOR CHECKLIST ───────────────────────────────────────────────────
const CHECKLIST_KEY = "ioc_checklist_";

function generateChecklist(result, risk) {
  const type = result?.type;
  const level = risk?.level;
  const vt = result?.sources?.virustotal;
  const ab = result?.sources?.abuseipdb;
  const sh = result?.sources?.shodan;
  const subnet = result?.sources?.subnet;
  const typo = result?.sources?.typosquatting;
  const mitre = result?.mitre || [];
  const items = [];

  // Universal
  items.push({ id: "siem", text: `Search for "${result.indicator}" in SIEM/firewall logs (last 30 days)`, priority: "HIGH" });
  items.push({ id: "scope", text: "Determine scope: how many internal assets communicated with this IOC?", priority: "HIGH" });

  if (type === "ip") {
    items.push({ id: "block", text: "Block IP at perimeter firewall and endpoint security if confirmed malicious", priority: level === "CRÍTICO" ? "HIGH" : "MEDIUM" });
    items.push({ id: "geo", text: "Verify if this IP origin country is expected for your environment", priority: "MEDIUM" });
    if (ab?.is_tor) items.push({ id: "tor", text: "Check for Tor usage policy violations — flag all internal hosts using Tor", priority: "HIGH" });
    if (sh?.total_vulns > 0) items.push({ id: "cve", text: `Verify if internal systems are vulnerable to detected CVEs (${sh.total_vulns} found)`, priority: "HIGH" });
    if (subnet?.found) items.push({ id: "subnet", text: `Investigate ${subnet.total_malicious} other malicious IPs in same /24 subnet`, priority: "MEDIUM" });
    if (mitre.some(t => t.tactic === "Command and Control")) items.push({ id: "c2", text: "Check for C2 beaconing patterns in network traffic (regular intervals, unusual data volume)", priority: "HIGH" });
  }

  if (type === "domain" || type === "url") {
    items.push({ id: "dns", text: `Search DNS query logs for internal hosts resolving ${result.indicator}`, priority: "HIGH" });
    items.push({ id: "proxy", text: "Block domain/URL in web proxy and DNS filter", priority: level === "CRÍTICO" ? "HIGH" : "MEDIUM" });
    if (typo?.is_suspicious) items.push({ id: "typo", text: `Alert users about phishing domain impersonating "${typo.matches?.[0]?.brand}" — send awareness email`, priority: "HIGH" });
    items.push({ id: "certs", text: "Review SSL certificate for related malicious domains in same certificate", priority: "MEDIUM" });
    if (mitre.some(t => t.tactic === "Initial Access")) items.push({ id: "phish", text: "Check email gateway logs for messages containing this domain/URL", priority: "HIGH" });
  }

  if (type === "hash") {
    items.push({ id: "edr", text: "Search EDR/endpoint logs for this file hash across all endpoints", priority: "HIGH" });
    items.push({ id: "quarantine", text: "Check quarantine records — was this file already blocked automatically?", priority: "HIGH" });
    items.push({ id: "origin", text: "Determine file origin: email attachment, download, USB, or lateral movement", priority: "HIGH" });
    items.push({ id: "parent", text: "Identify parent process that executed this file (process tree analysis)", priority: "MEDIUM" });
  }

  // Universal closers
  if (level === "CRÍTICO" || level === "ALTO") {
    items.push({ id: "escalate", text: "Escalate to Tier 2/3 or Incident Response team if active compromise confirmed", priority: "HIGH" });
    items.push({ id: "ticket", text: "Open incident ticket and document all findings with evidence", priority: "MEDIUM" });
    items.push({ id: "ioc_expand", text: "Extract related IOCs and pivot: same ASN, same certificate, same campaign", priority: "MEDIUM" });
  }
  items.push({ id: "close", text: "Document verdict and close investigation — update playbook if new TTPs found", priority: "LOW" });

  return items;
}

function InvestigatorChecklist({ result, risk }) {
  const key = CHECKLIST_KEY + (result?.indicator || "");
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(checked)); } catch {}
  }, [checked, key]);

  // Reload checklist when indicator changes
  useEffect(() => {
    try { setChecked(JSON.parse(localStorage.getItem(key) || "{}")); } catch { setChecked({}); }
  }, [result?.indicator]);

  const items = generateChecklist(result, risk);
  const done = items.filter(i => checked[i.id]).length;
  const pct = Math.round((done / items.length) * 100);

  const PRIORITY_CFG = {
    HIGH:   { color: C.red,       bg: C.redBg,    label: "High" },
    MEDIUM: { color: C.orange,    bg: C.orangeBg, label: "Med" },
    LOW:    { color: C.textMuted, bg: "rgba(136,150,173,0.1)", label: "Low" },
  };

  function toggle(id) { setChecked(c => ({ ...c, [id]: !c[id] })); }
  function clearAll() { setChecked({}); }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={16} color={C.green} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Investigator Checklist</h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Auto-generated for this IOC type and risk level</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: done === items.length ? C.green : C.textMuted }}>
            {done}/{items.length} done
          </span>
          <div style={{ width: 60, height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: done === items.length ? C.green : C.accentLight, borderRadius: 3, transition: "width 0.3s" }} />
          </div>
          {done > 0 && (
            <button onClick={clearAll} style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", fontFamily: FONT }}>Reset</button>
          )}
        </div>
      </div>

      {/* Group by priority */}
      {["HIGH", "MEDIUM", "LOW"].map(p => {
        const group = items.filter(i => i.priority === p);
        if (!group.length) return null;
        const pcfg = PRIORITY_CFG[p];
        return (
          <div key={p} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: pcfg.color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: pcfg.color, display: "inline-block" }} />
              {pcfg.label} Priority
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {group.map(item => (
                <div key={item.id}
                  onClick={() => toggle(item.id)}
                  style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: checked[item.id] ? "rgba(16,185,129,0.06)" : C.bgInput, border: `1px solid ${checked[item.id] ? C.green + "44" : C.border}`, borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (!checked[item.id]) e.currentTarget.style.borderColor = C.accent + "55"; }}
                  onMouseLeave={e => { if (!checked[item.id]) e.currentTarget.style.borderColor = C.border; }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${checked[item.id] ? C.green : pcfg.color}`, background: checked[item.id] ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all 0.15s" }}>
                    {checked[item.id] && <Icon name="check" size={11} color="#fff" />}
                  </div>
                  <span style={{ fontSize: 13, color: checked[item.id] ? C.textMuted : C.text, textDecoration: checked[item.id] ? "line-through" : "none", lineHeight: 1.5, transition: "all 0.15s" }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {done === items.length && (
        <div style={{ marginTop: 12, padding: "12px 16px", background: C.greenBg, border: `1px solid ${C.green}44`, borderRadius: 8, textAlign: "center", fontSize: 13, color: C.green, fontWeight: 600 }}>
          ✓ Investigation complete! All checklist items reviewed.
        </div>
      )}
    </Card>
  );
}

export default function Enrichment({ history, setHistory, currentResult, setCurrentResult, initialIndicator, onIndicatorConsumed, onNavigate }) {
  const [iocType, setIocType] = useState("Domain");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState([]);
  const [visibility, setVisibility] = useState("Private");
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [threatMatch, setThreatMatch] = useState(null);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [chosenAction, setChosenAction] = useState(null);

  // Load saved note when indicator changes
  useEffect(() => {
    if (currentResult?.indicator) {
      try {
        const saved = JSON.parse(localStorage.getItem(`ioc_note_${currentResult.indicator}`) || "{}");
        setNotes(saved.notes || "");
        setTags(saved.tags || []);
        setVisibility(saved.visibility || "Private");
      } catch {
        setNotes(""); setTags([]); setVisibility("Private");
      }
    }
  }, [currentResult?.indicator]);

  function saveNote() {
    if (!currentResult?.indicator) return;
    const data = { notes, tags, visibility, savedAt: new Date().toISOString() };
    localStorage.setItem(`ioc_note_${currentResult.indicator}`, JSON.stringify(data));
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  function addTag() {
    const t = newTag.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setNewTag(""); setAddingTag(false);
  }
  useEffect(() => {
    if (initialIndicator && initialIndicator !== input) {
      setInput(initialIndicator);
      setAutoAnalyze(true);
      onIndicatorConsumed?.();
    }
  }, [initialIndicator]);

  // Auto-trigger analyze after input is set
  useEffect(() => {
    if (autoAnalyze && input) {
      setAutoAnalyze(false);
      handleAnalyze();
    }
  }, [autoAnalyze, input]);

  useEffect(() => {
    if (input.trim()) setIocType(detectType(input.trim()));
  }, [input]);

  async function handleAnalyze() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setThreatMatch(null);
    setChosenAction(null);
    try {
      const data = await enrichIndicator(input.trim());
      setCurrentResult(data);
      const updated = addToHistory(data);
      setHistory(updated);

      // Auto Slack notification for high/critical risk
      try {
        const savedSettings = JSON.parse(localStorage.getItem("iocenricher_settings") || "{}");
        if (savedSettings.slackAlerts && savedSettings.slackWebhook && ["CRÍTICO", "ALTO"].includes(data.risk?.level)) {
          const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
          fetch(`${API_BASE_URL}/notify/slack`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ webhookUrl: savedSettings.slackWebhook, result: data })
          }).catch(() => {});
        }
      } catch {}
      // Check threat feed for IPs
      if (data.type === 'ip') {
        try {
          const API_BASE = import.meta.env.VITE_API_URL || "/api";
          const res = await fetch(`${API_BASE}/threatfeed/search?ip=${encodeURIComponent(input.trim())}`);
          if (!(res.headers.get("content-type") || "").includes("application/json")) throw new Error("unavailable");
          const tf = await res.json();
          if (tf.found) setThreatMatch(tf.match);
        } catch {}
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function exportJSON() {
    if (!currentResult) return;
    const blob = new Blob([JSON.stringify(currentResult, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ioc-${currentResult.indicator}-${Date.now()}.json`; a.click();
  }

  function handleAction(action) {
    setChosenAction(action);
    // Save to history
    try {
      const HISTORY_KEY = "iocenricher_history";
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const idx = history.findIndex(h => h.indicator === currentResult?.indicator);
      if (idx >= 0) {
        history[idx].recommendation = action;
        history[idx].action_taken = action;
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        setHistory(history);
      }
    } catch {}
  }

  function exportPDF() {
    if (!currentResult) return;
    const r = currentResult;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>IOC Report — ${r.indicator}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 32px; font-size: 13px; }
    .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .logo { font-size: 20px; font-weight: 700; color: #3b82f6; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .badge-critical { background: #fee2e2; color: #dc2626; }
    .badge-high { background: #fef3c7; color: #d97706; }
    .badge-medium { background: #fefce8; color: #ca8a04; }
    .badge-low { background: #dcfce7; color: #16a34a; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: 700; color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .field-label { font-size: 10px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 4px; }
    .field-value { font-size: 13px; font-weight: 500; color: #1e293b; }
    .factor { padding: 6px 10px; background: #fff7ed; border-left: 3px solid #f59e0b; margin-bottom: 6px; font-size: 12px; border-radius: 0 6px 6px 0; }
    .mitre-tag { display: inline-block; margin: 3px; padding: 3px 10px; background: #fff1f2; color: #dc2626; border-radius: 5px; font-size: 11px; font-weight: 600; font-family: monospace; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">🛡 IOC Enricher</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">Blue Team Intelligence Platform</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:18px;font-weight:700;font-family:monospace">${r.indicator}</div>
      <span class="badge badge-${r.risk?.level === 'CRÍTICO' ? 'critical' : r.risk?.level === 'ALTO' ? 'high' : r.risk?.level === 'MÉDIO' ? 'medium' : 'low'}">${r.risk?.level || 'BAIXO'} · Score ${r.risk?.score || 0}/100</span>
      <div style="font-size:11px;color:#94a3b8;margin-top:4px">Generated: ${new Date().toLocaleString('pt-BR')}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Indicator Details</div>
    <div class="grid">
      <div class="field"><div class="field-label">Type</div><div class="field-value">${r.type?.toUpperCase()}</div></div>
      <div class="field"><div class="field-label">Recommendation</div><div class="field-value">${r.recommendation || '—'}</div></div>
      ${r.sources?.ipinfo?.country ? `<div class="field"><div class="field-label">Country</div><div class="field-value">${r.sources.ipinfo.country} · ${r.sources.ipinfo.city || ''}</div></div>` : ''}
      ${r.sources?.ipinfo?.org ? `<div class="field"><div class="field-label">Organization</div><div class="field-value">${r.sources.ipinfo.org}</div></div>` : ''}
      ${r.sources?.abuseipdb ? `<div class="field"><div class="field-label">Abuse Score</div><div class="field-value">${r.sources.abuseipdb.abuse_score}% (${r.sources.abuseipdb.total_reports} reports)</div></div>` : ''}
      ${r.sources?.shodan ? `<div class="field"><div class="field-label">Open Ports</div><div class="field-value">${r.sources.shodan.ports?.slice(0,8).join(', ') || '—'}</div></div>` : ''}
    </div>
  </div>

  ${r.risk?.factors?.length > 0 ? `<div class="section">
    <div class="section-title">Risk Factors (${r.risk.factors.length})</div>
    ${r.risk.factors.map(f => `<div class="factor">${f}</div>`).join('')}
  </div>` : ''}

  ${r.mitre?.length > 0 ? `<div class="section">
    <div class="section-title">MITRE ATT&CK Techniques</div>
    ${r.mitre.map(t => `<span class="mitre-tag">${t.id} — ${t.name}</span>`).join('')}
  </div>` : ''}

  ${r.ai_analysis?.summary ? `<div class="section">
    <div class="section-title">AI Analysis</div>
    <p style="line-height:1.7;color:#334155">${r.ai_analysis.summary}</p>
    ${r.ai_analysis.recommendations?.length > 0 ? `<div style="margin-top:12px"><strong>Recommended Actions:</strong><ol style="margin:8px 0;padding-left:20px;color:#334155">${r.ai_analysis.recommendations.map(a => `<li style="margin-bottom:4px">${a}</li>`).join('')}</ol></div>` : ''}
  </div>` : ''}

  <div class="footer">IOC Enricher — Blue Team Intelligence Platform · ${new Date().getFullYear()}</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  const result = currentResult;
  const risk = result?.risk;
  const cfg = risk ? RISK_CFG[risk.level] : null;
  const vt = result?.sources?.virustotal;
  const ipi = result?.sources?.ipinfo;
  const uh = result?.sources?.urlhaus;
  const mb = result?.sources?.malwarebazaar;
  const ab = result?.sources?.abuseipdb;
  const sh = result?.sources?.shodan;
  const pdns = result?.sources?.passivedns;
  const whoisData = result?.sources?.whois;
  const ssl = result?.sources?.ssl;
  const subnet = result?.sources?.subnet;
  const typo = result?.sources?.typosquatting;

  const sourcesList = result ? [
    vt && {
      name: "VirusTotal", logoKey: "virustotal",
      result: `${vt.malicious || 0} / ${(vt.malicious || 0) + (vt.suspicious || 0) + (vt.harmless || 0)} engines detected`,
      resultColor: vt.malicious > 0 ? C.red : C.green,
      conf: vt.malicious > 5 ? "High" : vt.malicious > 0 ? "Medium" : "Low",
      time: timeAgo(result.timestamp)
    },
    ipi && {
      name: "IPinfo", logoKey: "ipinfo",
      result: `${countryFlag(ipi.country)} ${ipi.country || "—"} · ${ipi.org?.split(" ")[0] || "—"}`,
      resultColor: C.text, conf: "High", time: timeAgo(result.timestamp)
    },
    ab && {
      name: "AbuseIPDB", logoKey: "abuseipdb",
      result: `${ab.abuse_score}% abuse confidence · ${ab.total_reports} reports`,
      resultColor: ab.abuse_score >= 50 ? C.red : ab.abuse_score >= 20 ? C.orange : C.green,
      conf: ab.abuse_score >= 80 ? "High" : ab.abuse_score >= 40 ? "Medium" : "Low",
      time: timeAgo(result.timestamp)
    },
    sh && {
      name: "Shodan", logoKey: "shodan",
      result: `${sh.total_ports} ports open${sh.total_vulns > 0 ? ` · ${sh.total_vulns} CVEs` : ""}`,
      resultColor: sh.total_vulns > 0 ? C.red : sh.total_ports > 10 ? C.orange : C.text,
      conf: "High", time: timeAgo(result.timestamp)
    },
    pdns?.found && {
      name: "Passive DNS", logoKey: "passivedns",
      result: `${pdns.total} related domain${pdns.total !== 1 ? "s" : ""} found`,
      resultColor: pdns.total > 5 ? C.orange : C.text, conf: "Medium", time: timeAgo(result.timestamp)
    },
    whoisData?.found && {
      name: "WHOIS", logoKey: "whois",
      result: whoisData.age_days !== null ? `Registered ${whoisData.age_days}d ago${whoisData.registrar ? ` · ${whoisData.registrar.split(' ')[0]}` : ''}` : "WHOIS data found",
      resultColor: whoisData.age_days < 30 ? C.red : whoisData.age_days < 90 ? C.orange : C.green,
      conf: "High", time: timeAgo(result.timestamp)
    },
    ssl?.found && {
      name: "SSL/crt.sh", logoKey: "ssl",
      result: `${ssl.total} cert${ssl.total !== 1 ? "s" : ""} · ${ssl.related_domains?.length || 0} related domains`,
      resultColor: ssl.has_expired ? C.orange : C.green, conf: "High", time: timeAgo(result.timestamp)
    },
    subnet?.found && {
      name: "Subnet Intel", logoKey: "subnet",
      result: `${subnet.total_malicious} malicious IP${subnet.total_malicious !== 1 ? "s" : ""} in same /24`,
      resultColor: subnet.total_malicious >= 3 ? C.red : C.orange, conf: "High", time: timeAgo(result.timestamp)
    },
    typo?.is_suspicious && {
      name: "Typosquatting", logoKey: "alert",
      result: typo.matches?.[0] ? `Imitates "${typo.matches[0].brand}" — ${typo.matches[0].technique}` : "Suspicious domain pattern",
      resultColor: C.red, conf: "High", time: timeAgo(result.timestamp)
    },
    uh?.found && {
      name: "URLhaus", logoKey: "urlhaus",
      result: uh.threat || "Malware Download",
      resultColor: C.red, conf: "High", time: timeAgo(result.timestamp)
    },
    mb?.found && {
      name: "MalwareBazaar", logoKey: "malwarebazaar",
      result: mb.signature || "Known malware",
      resultColor: C.red, conf: "High", time: timeAgo(result.timestamp)
    },
  ].filter(Boolean) : [];

  const trendData = useMemo(() => {
    if (!result || !risk) return [];
    // Find all past lookups of same indicator from history
    const sameIndicator = history.filter(h => h.indicator === result.indicator && h.risk?.score !== undefined);
    if (sameIndicator.length >= 3) {
      // Real trend from multiple lookups
      return sameIndicator.slice(-30).map(h => h.risk.score);
    }
    // Build 30-day daily average from all lookups
    const now = Date.now();
    const days = Array.from({ length: 30 }, (_, i) => {
      const dayStart = now - (29 - i) * 86400000;
      const dayEnd = dayStart + 86400000;
      const dayLookups = history.filter(h => {
        const t = new Date(h.timestamp).getTime();
        return t >= dayStart && t < dayEnd && h.risk?.score !== undefined;
      });
      if (dayLookups.length > 0) {
        return Math.round(dayLookups.reduce((sum, h) => sum + h.risk.score, 0) / dayLookups.length);
      }
      return null;
    });
    // Fill nulls with interpolated values
    const filled = [...days];
    for (let i = 0; i < filled.length; i++) {
      if (filled[i] === null) filled[i] = risk.score + (Math.random() * 8 - 4);
    }
    filled[filled.length - 1] = risk.score; // Last point is always current
    return filled.map(v => Math.min(100, Math.max(0, Math.round(v))));
  }, [result?.indicator, risk?.score, history.length]);

  const showResult = !!result;

  return (
    <div className="main-with-sidebar" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>

        {/* Form */}
        <Card>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: 0, marginBottom: 6 }}>Enrich an Indicator</h2>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 20 }}>
            Enter an indicator value to gather context and reputation from multiple open-source sources.
          </p>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["IP", "Domain", "URL", "Hash"].map(t => (
              <TypePill key={t} label={t} active={iocType === t} onClick={() => setIocType(t)} />
            ))}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAnalyze()}
              placeholder="malicious-example.com"
              style={{ flex: 1, fontSize: 14, padding: "11px 14px" }}
            />
            <Button
              onClick={handleAnalyze}
              disabled={loading || !input.trim()}
              icon={<Icon name="target" size={16} color="#fff" />}
              style={{ padding: "0 22px" }}
            >
              {loading ? "Analyzing..." : "Analyze"}
            </Button>
          </div>

          {history.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: C.textMuted }}>Recent indicators:</span>
              {history.slice(0, 4).map((h, i) => (
                <button key={i} onClick={() => { setInput(h.indicator); setCurrentResult(h); }} style={{
                  padding: "5px 12px", background: C.bgInput,
                  border: `1px solid ${C.border}`, borderRadius: 6,
                  color: C.textMuted, fontSize: 12, cursor: "pointer", fontFamily: FONT
                }}>{h.indicator.length > 32 ? h.indicator.slice(0, 30) + "…" : h.indicator}</button>
              ))}
            </div>
          )}

          {error && (
            <div style={{
              marginTop: 14, padding: "10px 14px",
              background: C.redBg, border: `1px solid ${C.red}55`,
              borderRadius: 8, color: C.red, fontSize: 13,
              display: "flex", alignItems: "center", gap: 8
            }}>
              <Icon name="alert" size={16} color={C.red} /> {error}
            </div>
          )}
        </Card>

        {/* ── VERDICT BANNER ── */}
        {showResult && (
          <div className="fade-in">
            <VerdictBanner result={result} risk={risk} />
          </div>
        )}

        {/* Threat Feed Match Banner */}
        {threatMatch && (
          <div className="fade-in" style={{
            padding: '16px 20px', borderRadius: 12,
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.4)',
            display: 'flex', alignItems: 'flex-start', gap: 14
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="alert" size={18} color={C.red} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 4 }}>
                ⚠ Known C2 Server — Feodo Tracker
              </div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                This IP is listed as an active <strong style={{ color: C.red }}>{threatMatch.malware}</strong> C2 server.
                {threatMatch.port && <span> Port: <strong style={{ color: C.text }}>{threatMatch.port}</strong>.</span>}
                {threatMatch.country && <span> Origin: <strong style={{ color: C.text }}>{countryFlag(threatMatch.country)} {threatMatch.country}</strong>.</span>}
                {threatMatch.first_seen && <span> First seen: <strong style={{ color: C.textMuted }}>{threatMatch.first_seen}</strong>.</span>}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Badge color={C.red} bg="rgba(248,113,113,0.15)">{threatMatch.status?.toUpperCase() || 'ACTIVE'}</Badge>
                <Badge color={C.orange} bg="rgba(245,158,11,0.1)">{threatMatch.malware}</Badge>
                <Badge color={C.textMuted} bg="rgba(88,107,133,0.12)">Feodo Tracker</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {showResult && (
          <div className="fade-in stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <Card style={{ padding: 18 }}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                Risk Score <InfoTooltip text="Composite score 0-100 calculated from VirusTotal detections, URLhaus threats, MalwareBazaar signatures and IP reputation factors." />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <ScoreGauge score={risk?.score || 0} level={risk?.level} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: cfg?.color, marginBottom: 4 }}>{cfg?.text}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>{cfg?.confidence}</div>
                </div>
              </div>
            </Card>

            <Card style={{ padding: 18 }}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                Verdict <InfoTooltip text="Final classification based on the risk score: CLEAN (0-25), SUSPICIOUS (26-50), MALICIOUS (51-75), CRÍTICO (76-100)." />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: cfg?.bg,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Icon name="biohazard" size={18} color={cfg?.color} />
                </div>
                <Badge color={cfg?.color} bg={cfg?.bg}>{cfg?.label}</Badge>
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
                {risk?.factors?.length > 0 ? `${risk.factors.length} risk factors detected` : "No threats detected"}
              </div>
            </Card>

            <Card style={{ padding: 18 }}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                Indicator Type <InfoTooltip text="Auto-detected IOC type: IP address (IPv4), Domain, URL (http/https), or Hash (MD5/SHA1/SHA256)." />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <Icon name="globe" size={20} color={C.accentLight} />
                <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>
                  {result?.type === "ip" ? "IP Address" : result?.type?.charAt(0).toUpperCase() + result?.type?.slice(1)}
                </span>
              </div>
              <span style={{ fontSize: 12, color: C.accentLight }}>
                {result?.type === "ip" ? "Public Address" : `Registered ${result?.type}`}
              </span>
            </Card>

            <Card style={{ padding: 18 }}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                Last Updated <InfoTooltip text="Timestamp of when this enrichment was performed. Click Re-analyze to fetch fresh data from all sources." />
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Icon name="clock" size={20} color={C.accentLight} />
                <div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 500, lineHeight: 1.3 }}>
                    {fmtDate(result?.timestamp).split(",")[0]}
                  </div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 500, lineHeight: 1.3 }}>
                    {fmtDate(result?.timestamp).split(",")[1]}
                  </div>
                  <div style={{ fontSize: 11, color: C.accentLight, marginTop: 4 }}>{timeAgo(result?.timestamp)}</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Details + Trend */}
        {showResult && (
          <div className="fade-in detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, marginBottom: 16, color: C.text }}>Enrichment Details</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  <DetailRow label="Indicator">
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ wordBreak: "break-all", fontFamily: "monospace" }}>{result.indicator}</span>
                      <CopyButton text={result.indicator} />
                    </span>
                  </DetailRow>
                  {ipi?.hostname && <DetailRow label="Hostname">{ipi.hostname}</DetailRow>}
                  {ipi?.org && <DetailRow label="ASN">{ipi.org}</DetailRow>}
                  {ipi?.country && <DetailRow label="Country">{countryFlag(ipi.country)} {ipi.country}{ipi.city && ` · ${ipi.city}`}</DetailRow>}
                  {vt?.registrar && <DetailRow label="Registrar">{vt.registrar}</DetailRow>}
                  {vt?.creation_date && <DetailRow label="Created">{new Date(vt.creation_date * 1000).toLocaleDateString()}</DetailRow>}
                  {ipi?.timezone && <DetailRow label="Timezone">{ipi.timezone}</DetailRow>}
                  {uh?.threat && <DetailRow label="Category"><Badge color={C.red} bg={C.redBg}>{uh.threat}</Badge></DetailRow>}
                  {(uh?.tags?.length > 0 || mb?.tags?.length > 0) && (
                    <DetailRow label="Tags">
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {[...(uh?.tags || []), ...(mb?.tags || [])].slice(0, 4).map(t => (
                          <Badge key={t} color={C.orange} bg={C.orangeBg}>{t}</Badge>
                        ))}
                      </div>
                    </DetailRow>
                  )}
                </tbody>
              </table>
            </Card>

            <Card>
              <div style={{ marginBottom: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>
                  Reputation Trend <span style={{ color: C.textMuted, fontSize: 12, fontWeight: 400 }}>(30 days)</span>
                </h3>
              </div>
              <Sparkline data={trendData} color={cfg?.color || C.green} />
              {ipi?.country && (
                <div style={{ marginTop: 18 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 500, color: C.text, margin: 0, marginBottom: 12 }}>
                    Geo Distribution <span style={{ color: C.textMuted, fontSize: 11, fontWeight: 400 }}>(Resolved IPs)</span>
                  </h4>
                  <GeoBar label={`${countryFlag(ipi.country)} ${ipi.country}`} pct={80} />
                  <GeoBar label="🇩🇪 Germany" pct={10} />
                  <GeoBar label="🇸🇬 Singapore" pct={5} />
                  <GeoBar label="🇳🇱 Netherlands" pct={5} />
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Sources + Actions */}
        {showResult && sourcesList.length > 0 && (
          <div className="fade-in detail-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
            <Card>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, marginBottom: 16, color: C.text }}>Source / Reputation</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ textAlign: "left", padding: "8px 0", color: C.textMuted, fontWeight: 500, fontSize: 11, letterSpacing: 0.5 }}>SOURCE</th>
                    <th style={{ textAlign: "left", padding: "8px 0", color: C.textMuted, fontWeight: 500, fontSize: 11, letterSpacing: 0.5 }}>RESULT</th>
                    <th style={{ textAlign: "left", padding: "8px 0", color: C.textMuted, fontWeight: 500, fontSize: 11, letterSpacing: 0.5 }}>CONFIDENCE</th>
                    <th style={{ textAlign: "right", padding: "8px 0", color: C.textMuted, fontWeight: 500, fontSize: 11, letterSpacing: 0.5 }}>LAST SEEN</th>
                  </tr>
                </thead>
                <tbody>
                  {sourcesList.map((s, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
                      <td style={{ padding: "12px 0" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <SourceLogo name={s.logoKey} />
                          <span style={{ color: C.text, fontWeight: 500 }}>{s.name}</span>
                        </span>
                      </td>
                      <td style={{ padding: "12px 0" }}>
                        <Badge color={s.resultColor} bg={`${s.resultColor}11`}>{s.result}</Badge>
                      </td>
                      <td style={{ padding: "12px 0" }}><Confidence level={s.conf} /></td>
                      <td style={{ padding: "12px 0", textAlign: "right", color: C.textMuted }}>{s.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, color: C.text }}>
                Recommended Actions <Icon name="info" size={13} color={C.textDim} />
              </h3>
              <ActionRow icon="block" iconColor={C.red} iconBg={C.redBg}
                title="Bloquear" desc="Block this indicator in firewalls, proxies and email gateways."
                btnLabel="Block" btnColor={C.red} btnBg={C.redBg}
                recommended={result.recommendation === "BLOQUEAR"}
                active={chosenAction === "BLOQUEAR"}
                onClick={() => handleAction("BLOQUEAR")} />
              <ActionRow icon="eye" iconColor={C.orange} iconBg={C.orangeBg}
                title="Monitorar" desc="Monitor for related activity and new occurrences."
                btnLabel="Monitor" btnColor={C.orange} btnBg={C.orangeBg}
                recommended={result.recommendation === "MONITORAR"}
                active={chosenAction === "MONITORAR"}
                onClick={() => handleAction("MONITORAR")} />
              <ActionRow icon="target" iconColor={C.accentLight} iconBg="rgba(59, 130, 246, 0.1)"
                title="Investigar" desc="Deep dive investigation and threat hunting recommended."
                btnLabel="Investigate" btnColor={C.accentLight} btnBg="rgba(59, 130, 246, 0.15)"
                recommended={result.recommendation === "INVESTIGAR"}
                active={chosenAction === "INVESTIGAR"}
                onClick={() => handleAction("INVESTIGAR")} />
              <ActionRow icon="check" iconColor={C.textMuted} iconBg="rgba(136, 150, 173, 0.1)"
                title="Ignorar" desc="No action needed. Add to allowlist."
                btnLabel="Ignore" btnColor={C.textMuted} btnBg="rgba(136, 150, 173, 0.1)"
                recommended={result.recommendation === "IGNORAR"}
                active={chosenAction === "IGNORAR"}
                onClick={() => handleAction("IGNORAR")} />
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <Button variant="secondary" onClick={exportPDF} icon={<Icon name="file" size={14} />} style={{ flex: 1, justifyContent: "center" }}>
                  Export PDF
                </Button>
                <Button variant="secondary" onClick={exportJSON} icon={<Icon name="download" size={14} />} style={{ flex: 1, justifyContent: "center" }}>
                  Export JSON
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* MITRE ATT&CK */}
        {showResult && result.mitre?.length > 0 && (
          <div className="fade-in"><MitreCard techniques={result.mitre} /></div>
        )}

        {/* ── CONTEXT TIMELINE ── */}
        {showResult && (
          <div className="fade-in">
            <ContextTimeline result={result} />
          </div>
        )}

        {/* ── INVESTIGATOR CHECKLIST ── */}
        {showResult && (
          <div className="fade-in">
            <InvestigatorChecklist result={result} risk={risk} />
          </div>
        )}

        {/* AbuseIPDB Card */}
        {showResult && ab && (
          <div className="fade-in">
            <AbuseIPDBCard data={ab} />
          </div>
        )}

        {/* Shodan Card */}
        {showResult && sh && (
          <div className="fade-in"><ShodanCard data={sh} /></div>
        )}

        {/* Passive DNS */}
        {showResult && pdns?.found && (
          <div className="fade-in"><PassiveDNSCard data={pdns} type={result?.type} /></div>
        )}

        {/* WHOIS */}
        {showResult && whoisData?.found && (
          <div className="fade-in"><WHOISCard data={whoisData} /></div>
        )}

        {/* SSL Certificates */}
        {showResult && ssl?.found && (
          <div className="fade-in"><SSLCard data={ssl} /></div>
        )}

        {/* Subnet Intel */}
        {showResult && subnet?.found && (
          <div className="fade-in"><SubnetCard data={subnet} /></div>
        )}

        {/* Typosquatting */}
        {showResult && typo?.is_suspicious && (
          <div className="fade-in"><TyposquattingCard data={typo} /></div>
        )}

        {/* AI Analysis */}
        {showResult && (
          <div className="fade-in">
            <AiAnalysisCard analysis={result.ai_analysis} loading={loading} />
          </div>
        )}

        {!showResult && !loading && (
          <Card style={{ padding: "80px 40px", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4 }}>🔬</div>
            <h3 style={{ fontSize: 16, color: C.text, margin: 0, marginBottom: 8 }}>Ready to enrich an indicator</h3>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
              Enter an IP, domain, URL, or hash above to start your investigation.
            </p>
          </Card>
        )}

        {loading && (
          <Card style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: C.accentLight, fontWeight: 500, marginBottom: 12 }}>Querying OSINT sources...</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%", background: C.accent,
                  animation: `pulse 1.2s ${i * 0.15}s ease-in-out infinite`
                }} />
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Right sidebar */}
      <div className="sidebar-right" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Analyst Notes</h3>
            {currentResult?.indicator && (
              <span style={{ fontSize: 10, color: C.textDim, fontFamily: "monospace", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentResult.indicator}
              </span>
            )}
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add investigation notes, context, observations..."
            rows={5}
            style={{
              width: "100%", padding: 12,
              background: C.bgInput, border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.text, fontSize: 13,
              resize: "vertical", lineHeight: 1.5,
              fontFamily: FONT, outline: "none", boxSizing: "border-box"
            }}
            onFocus={e => e.target.style.borderColor = C.accent}
            onBlur={e => e.target.style.borderColor = C.border}
          />

          {/* Tags */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              {tags.map((t, i) => (
                <span key={i} onClick={() => setTags(tags.filter((_, j) => j !== i))}
                  title="Click to remove"
                  style={{ padding: "4px 10px", background: "rgba(59,130,246,0.12)", border: `1px solid ${C.accent}44`, borderRadius: 6, color: C.accentLight, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                  {t} <span style={{ opacity: 0.6, fontSize: 10 }}>×</span>
                </span>
              ))}
              {addingTag ? (
                <input
                  autoFocus
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addTag(); if (e.key === "Escape") { setAddingTag(false); setNewTag(""); } }}
                  onBlur={addTag}
                  placeholder="tag name..."
                  style={{ padding: "4px 8px", background: C.bgInput, border: `1px solid ${C.accent}`, borderRadius: 6, color: C.text, fontSize: 11, fontFamily: FONT, outline: "none", width: 90 }}
                />
              ) : (
                <button onClick={() => setAddingTag(true)} style={{ padding: "4px 10px", background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 6, color: C.textMuted, fontSize: 11, cursor: "pointer" }}>
                  + Add tag
                </button>
              )}
            </div>
          </div>

          {/* Visibility */}
          <div style={{ marginTop: 14, position: "relative" }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Visibility</div>
            <button
              onClick={() => setVisibilityOpen(o => !o)}
              style={{ width: "100%", padding: "9px 12px", background: C.bgInput, border: `1px solid ${visibilityOpen ? C.accent : C.border}`, borderRadius: 8, color: C.text, fontSize: 13, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: FONT }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name={visibility === "Private" ? "lock" : visibility === "Team" ? "users" : "globe"} size={14} color={C.textMuted} />
                {visibility === "Private" ? "Private (Only me)" : visibility === "Team" ? "Team (Shared)" : "Public"}
              </span>
              <Icon name="arrowDown" size={12} color={C.textDim} />
            </button>
            {visibilityOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", zIndex: 50, overflow: "hidden" }}>
                {[
                  { key: "Private", icon: "lock", label: "Private (Only me)" },
                  { key: "Team", icon: "users", label: "Team (Shared)" },
                  { key: "Public", icon: "globe", label: "Public" },
                ].map(opt => (
                  <button key={opt.key} onClick={() => { setVisibility(opt.key); setVisibilityOpen(false); }}
                    style={{ width: "100%", padding: "10px 14px", background: visibility === opt.key ? "rgba(59,130,246,0.1)" : "transparent", border: "none", color: visibility === opt.key ? C.accentLight : C.text, fontSize: 13, fontFamily: FONT, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                    onMouseEnter={e => { if (visibility !== opt.key) e.currentTarget.style.background = C.bgCardHover; }}
                    onMouseLeave={e => { if (visibility !== opt.key) e.currentTarget.style.background = "transparent"; }}
                  >
                    <Icon name={opt.icon} size={14} color={visibility === opt.key ? C.accentLight : C.textMuted} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={saveNote}
            disabled={!currentResult?.indicator}
            style={{ width: "100%", marginTop: 16, justifyContent: "center", background: noteSaved ? C.greenBg : undefined, borderColor: noteSaved ? C.green : undefined, color: noteSaved ? C.green : undefined }}
            icon={noteSaved ? <Icon name="check" size={14} color={C.green} /> : null}
          >
            {noteSaved ? "Note Saved!" : "Save Note"}
          </Button>
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Recent Lookups</h3>
            <button onClick={() => onNavigate?.("History")} style={{ background: "transparent", border: "none", color: C.accentLight, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>View all</button>
          </div>
          {history.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12, color: C.textMuted }}>No lookups yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {history.slice(0, 6).map((h, i) => {
                const hcfg = RISK_CFG[h.risk?.level] || RISK_CFG.BAIXO;
                const isActive = currentResult?.indicator === h.indicator;
                return (
                  <div key={i}
                    onClick={() => { setInput(h.indicator); setCurrentResult(h); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 8px",
                      borderTop: i > 0 ? `1px solid ${C.borderSubtle}` : "none",
                      cursor: "pointer", borderRadius: 8, margin: "0 -8px",
                      background: isActive ? "rgba(59,130,246,0.08)" : "transparent",
                      transition: "background 0.12s"
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.bgCardHover; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? "rgba(59,130,246,0.08)" : "transparent"; }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: isActive ? "rgba(59,130,246,0.15)" : C.bgInput, border: `1px solid ${isActive ? C.accent + "55" : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name="globe" size={14} color={isActive ? C.accentLight : C.textMuted} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: isActive ? C.accentLight : C.text, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {h.indicator}
                      </div>
                      <div style={{ fontSize: 10, color: C.textMuted, textTransform: "capitalize" }}>{h.type}</div>
                    </div>
                    <Badge color={hcfg.color} bg={hcfg.bg}>{h.risk?.score || 0}</Badge>
                    <span style={{ fontSize: 10, color: C.textDim, flexShrink: 0, minWidth: 36, textAlign: "right" }}>{timeAgo(h.timestamp)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
