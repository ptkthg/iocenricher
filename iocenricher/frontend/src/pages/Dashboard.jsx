import { useMemo, useState, useEffect, useCallback } from "react";
import { C, FONT, RISK_CFG, timeAgo } from "../lib/theme";
import Icon from "../components/Icon";
import { Card, Badge, Button, PageHeader, StatBox } from "../components/UI";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

// ==================== AREA CHART ====================
function AreaChart({ data, color = C.accent, height = 220 }) {
  const w = 700;
  const h = height;
  const pad = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const max = Math.max(...data.map(d => d.value), 1);
  const min = 0;
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = pad.left + (i / Math.max(data.length - 1, 1)) * innerW;
    const y = pad.top + (1 - (d.value - min) / range) * innerH;
    return { x, y, label: d.label, value: d.value };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} ${pad.top + innerH} L ${points[0]?.x || 0} ${pad.top + innerH} Z`;

  // Smooth curve using quadratic
  const smoothPath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `${acc} Q ${cpX} ${prev.y}, ${cpX} ${(prev.y + p.y) / 2} T ${p.x} ${p.y}`;
  }, "");
  const smoothArea = `${smoothPath} L ${points[points.length - 1]?.x || 0} ${pad.top + innerH} L ${points[0]?.x || 0} ${pad.top + innerH} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: pad.top + (1 - t) * innerH,
    value: Math.round(min + range * t),
  }));

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.left} y1={t.y} x2={w - pad.right} y2={t.y} stroke={C.border} strokeWidth="0.5" strokeDasharray="3 3" />
          <text x={pad.left - 8} y={t.y + 3} fill={C.textDim} fontSize="10" textAnchor="end" fontFamily={FONT}>{t.value}</text>
        </g>
      ))}

      {points.map((p, i) => i % Math.ceil(points.length / 7) === 0 && (
        <text key={i} x={p.x} y={h - 8} fill={C.textDim} fontSize="10" textAnchor="middle" fontFamily={FONT}>{p.label}</text>
      ))}

      <path d={smoothArea} fill="url(#areaGrad)" />
      <path d={smoothPath} fill="none" stroke={color} strokeWidth="2" />

      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={C.bgCard} stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
}

// ==================== DONUT CHART ====================
function DonutChart({ segments, total, size = 180 }) {
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth="20" />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const offset = (acc / total) * circ;
        acc += seg.value;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="20"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 0.8s" }}
          />
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill={C.text} fontFamily={FONT}>{total}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill={C.textMuted} fontFamily={FONT}>Total</text>
    </svg>
  );
}

// ==================== HELPERS ====================
function getIOCIcon(type) {
  const map = { ip: "globe", domain: "globe", url: "link", hash: "hash" };
  return map[type] || "globe";
}

function buildTimeline(history, days = 7) {
  const now = new Date();
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    d.setHours(0, 0, 0, 0);
    return {
      timestamp: d.getTime(),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: 0,
    };
  });

  history.forEach(h => {
    const t = new Date(h.timestamp).setHours(0, 0, 0, 0);
    const bucket = buckets.find(b => b.timestamp === t);
    if (bucket) bucket.value++;
  });

  return buckets;
}

// ==================== MAIN ====================
export default function Dashboard({ history, onNavigate, onInvestigate }) {
  const [days, setDays] = useState(7);
  const [sourceHealth, setSourceHealth] = useState([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthChecked, setHealthChecked] = useState(null);

  // Filter history by selected time range
  const rangedHistory = useMemo(() => {
    if (!days) return history;
    const cutoff = Date.now() - days * 86400000;
    return history.filter(h => new Date(h.timestamp).getTime() >= cutoff);
  }, [history, days]);

  const fetchSourceHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/health/sources`);
      if (!(res.headers.get("content-type") || "").includes("application/json")) throw new Error("unavailable");
      const data = await res.json();
      const merged = [
        { key: "virustotal", name: "VirusTotal", icon: "virustotal" },
        { key: "ipinfo", name: "IPinfo", icon: "ipinfo" },
        { key: "urlhaus", name: "URLhaus", icon: "urlhaus" },
        { key: "malwarebazaar", name: "MalwareBazaar", icon: "malwarebazaar" },
        { key: "abuseipdb", name: "AbuseIPDB", icon: "abuseipdb" },
        { key: "shodan", name: "Shodan", icon: "shodan" },
        { key: "groq", name: "Groq (AI)", icon: "groq" },
      ].map(s => {
        const live = data.sources?.find(x => x.name === s.key);
        return {
          ...s,
          status: live?.status === "online" ? "Online" : live?.status === "auth_error" ? "Auth Error" : live ? "Offline" : "Unknown",
          statusColor: live?.status === "online" ? C.green : live?.status === "auth_error" ? C.orange : live ? C.red : C.textDim,
          latency: live?.latency,
          error: live?.error,
          lookups: history.filter(h => h.sources?.[s.key]).length,
        };
      });
      setSourceHealth(merged);
      setHealthChecked(new Date());
    } catch {
      // Keep previous state on failure
    }
    setHealthLoading(false);
  }, [history]);

  useEffect(() => { fetchSourceHealth(); }, []);

  function exportDashboard() {
    const rows = [
      ["Metric", "Value"],
      ["Time Range", days ? `Last ${days} days` : "All time"],
      ["Total Lookups", stats.total],
      ["High-Risk Indicators", stats.highRisk],
      ["Malicious Rate", `${stats.maliciousRate.toFixed(1)}%`],
      ["Critical", stats.byLevel.CRÍTICO],
      ["High", stats.byLevel.ALTO],
      ["Medium", stats.byLevel.MÉDIO],
      ["Low", stats.byLevel.BAIXO],
      ["To Block", stats.byAction.BLOQUEAR],
      ["To Investigate", stats.byAction.INVESTIGAR],
      ["To Monitor", stats.byAction.MONITORAR],
      ["Ignored", stats.byAction.IGNORAR],
      ["IPs analyzed", stats.byType.ip || 0],
      ["Domains analyzed", stats.byType.domain || 0],
      ["URLs analyzed", stats.byType.url || 0],
      ["Hashes analyzed", stats.byType.hash || 0],
      ["Generated at", new Date().toISOString()],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-summary-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const stats = useMemo(() => {
    const h = rangedHistory;
    const total = h.length;
    const highRisk = h.filter(x => ["CRÍTICO", "ALTO"].includes(x.risk?.level)).length;
    const malicious = h.filter(x => x.risk?.level === "CRÍTICO").length;
    const maliciousRate = total > 0 ? (malicious / total) * 100 : 0;

    const byLevel = {
      CRÍTICO: h.filter(x => x.risk?.level === "CRÍTICO").length,
      ALTO: h.filter(x => x.risk?.level === "ALTO").length,
      MÉDIO: h.filter(x => x.risk?.level === "MÉDIO").length,
      BAIXO: h.filter(x => x.risk?.level === "BAIXO").length,
    };

    const byAction = {
      BLOQUEAR: h.filter(x => x.recommendation === "BLOQUEAR").length,
      INVESTIGAR: h.filter(x => x.recommendation === "INVESTIGAR").length,
      MONITORAR: h.filter(x => x.recommendation === "MONITORAR").length,
      IGNORAR: h.filter(x => x.recommendation === "IGNORAR").length,
    };

    const byType = {};
    h.forEach(x => { byType[x.type] = (byType[x.type] || 0) + 1; });

    const tagCounts = {};
    h.forEach(x => {
      const tags = [...(x.sources?.urlhaus?.tags || []), ...(x.sources?.malwarebazaar?.tags || [])];
      tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    });
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

    return { total, highRisk, malicious, maliciousRate, byLevel, byAction, byType, topTags };
  }, [rangedHistory]);

  const timeline = useMemo(() => buildTimeline(rangedHistory, days || 30), [rangedHistory, days]);
  const recentHigh = useMemo(
    () => rangedHistory.filter(h => ["CRÍTICO", "ALTO"].includes(h.risk?.level)).slice(0, 5),
    [rangedHistory]
  );

  const donutSegments = [
    { label: "Critical", value: stats.byLevel.CRÍTICO, color: C.red, pct: stats.total ? (stats.byLevel.CRÍTICO / stats.total * 100).toFixed(1) : 0 },
    { label: "High", value: stats.byLevel.ALTO, color: C.orange, pct: stats.total ? (stats.byLevel.ALTO / stats.total * 100).toFixed(1) : 0 },
    { label: "Medium", value: stats.byLevel.MÉDIO, color: C.yellow, pct: stats.total ? (stats.byLevel.MÉDIO / stats.total * 100).toFixed(1) : 0 },
    { label: "Low", value: stats.byLevel.BAIXO, color: C.green, pct: stats.total ? (stats.byLevel.BAIXO / stats.total * 100).toFixed(1) : 0 },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Operational visibility into indicator triage and source health."
        actions={
          <>
            <div style={{ display: "flex", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              {[{ label: "7d", value: 7 }, { label: "30d", value: 30 }, { label: "All", value: 0 }].map(opt => (
                <button key={opt.value} onClick={() => setDays(opt.value)} style={{
                  padding: "7px 14px", background: days === opt.value ? "rgba(59,130,246,0.15)" : "transparent",
                  border: "none", borderRight: `1px solid ${C.border}`, color: days === opt.value ? C.accentLight : C.textMuted,
                  fontSize: 12, fontFamily: FONT, cursor: "pointer", fontWeight: days === opt.value ? 600 : 400,
                  transition: "all 0.15s",
                }}>{opt.label}</button>
              ))}
            </div>
            <Button variant="secondary" onClick={exportDashboard} icon={<Icon name="download" size={14} />}>
              Export CSV
            </Button>
          </>
        }
      />

      {/* WELCOME BANNER (only when empty) */}
      {stats.total === 0 && (
        <div style={{
          marginBottom: 24, padding: "24px 28px", borderRadius: 16,
          background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(167,139,250,0.06) 100%)",
          border: `1px solid ${C.borderAccent}`,
          display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, overflow: "hidden", flexShrink: 0, boxShadow: `0 4px 16px rgba(59,130,246,0.3)` }}>
            <img src="/logo.png" alt="IOC Enricher" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>Welcome to IOC Enricher</div>
            <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
              Start by analyzing an indicator. Your enrichment history and statistics will populate this dashboard automatically.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <Button onClick={() => onNavigate?.("Enrichment")} icon={<Icon name="search" size={14} color="#fff" />}>
              Analyze an IOC
            </Button>
            <Button variant="secondary" onClick={() => onNavigate?.("Bulk Enrichment")} icon={<Icon name="layers" size={14} />}>
              Bulk Enrichment
            </Button>
          </div>
        </div>
      )}

      {/* TOP STATS */}
      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <StatBox
          label="Total Lookups (7d)"
          value={stats.total.toLocaleString()}
          change={stats.total > 0 ? "0%" : null}
          changeType="up"
          footer={`vs. previous 7 days`}
          icon={<Icon name="search" size={20} color={C.accentLight} />}
          iconColor={C.accentLight}
          iconBg="rgba(59, 130, 246, 0.15)"
        />
        <StatBox
          label="High-risk Indicators"
          value={stats.highRisk.toLocaleString()}
          change={stats.highRisk > 0 ? `${((stats.highRisk / Math.max(stats.total, 1)) * 100).toFixed(1)}%` : null}
          changeType="up"
          footer="of total lookups"
          icon={<Icon name="shield" size={20} color={C.red} />}
          iconColor={C.red}
          iconBg={C.redBg}
        />
        <StatBox
          label="Malicious Verdict Rate"
          value={`${stats.maliciousRate.toFixed(1)}%`}
          change={stats.malicious > 0 ? `${stats.malicious} indicators` : null}
          changeType="up"
          footer="flagged as malicious"
          icon={<Icon name="alert" size={20} color={C.orange} />}
          iconColor={C.orange}
          iconBg={C.orangeBg}
        />
        <StatBox
          label="Sources Online"
          value="4 / 4"
          footer="100% availability"
          icon={<Icon name="server" size={20} color={C.green} />}
          iconColor={C.green}
          iconBg={C.greenBg}
        />
      </div>

      {/* CHARTS ROW */}
      <div className="three-col" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Timeline Chart */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Lookups Over Time</h3>
            <Badge color={C.accentLight} bg="rgba(59, 130, 246, 0.15)">Last 7 days</Badge>
          </div>
          {stats.total > 0 ? (
            <AreaChart data={timeline} color={C.accent} />
          ) : (
            <EmptyChart message="No lookups yet" subMessage="Run an enrichment to see activity here" />
          )}
        </Card>

        {/* Donut Chart */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Risk Distribution</h3>
            <Icon name="info" size={13} color={C.textDim} />
          </div>
          {stats.total > 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
              <DonutChart segments={donutSegments} total={stats.total} />
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                {donutSegments.map(seg => (
                  <div key={seg.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color }} />
                      <span style={{ color: C.textMuted }}>{seg.label}</span>
                    </span>
                    <span style={{ color: C.text }}>{seg.pct}% <span style={{ color: C.textMuted }}>({seg.value})</span></span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart message="No data yet" />
          )}
        </Card>

        {/* Triage Summary */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Triage Summary</h3>
            <Icon name="info" size={13} color={C.textDim} />
          </div>
          <TriageItem icon="alert" iconColor={C.red} label="To Block" value={stats.byAction.BLOQUEAR} />
          <TriageItem icon="target" iconColor={C.accentLight} label="To Investigate" value={stats.byAction.INVESTIGAR} />
          <TriageItem icon="eye" iconColor={C.orange} label="To Monitor" value={stats.byAction.MONITORAR} />
          <TriageItem icon="check" iconColor={C.textMuted} label="Ignored" value={stats.byAction.IGNORAR} last />
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 16 }}>Last 7 days</div>
        </Card>
      </div>

      {/* MIDDLE ROW */}
      <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* High-risk recent */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Recent High-risk Indicators</h3>
            <button onClick={() => onNavigate?.("History")} style={{ background: "transparent", border: "none", color: C.accentLight, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>View all →</button>
          </div>

          {recentHigh.length === 0 ? (
            <EmptyChart message="No high-risk indicators yet" subMessage="When you enrich a malicious IOC, it will appear here" />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th style={thStyle}>INDICATOR</th>
                  <th style={thStyle}>TYPE</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>SCORE</th>
                  <th style={thStyle}>VERDICT</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>WHEN</th>
                </tr>
              </thead>
              <tbody>
                {recentHigh.map((h, i) => {
                  const cfg = RISK_CFG[h.risk?.level];
                  return (
                    <tr key={i}
                      onClick={() => onInvestigate?.(h.indicator)}
                      style={{ borderBottom: `1px solid ${C.borderSubtle}`, cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bgCardHover}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      title={`Analyze ${h.indicator}`}
                    >
                      <td style={tdStyle}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Icon name={getIOCIcon(h.type)} size={14} color={C.textMuted} />
                          <span style={{ color: C.text, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.indicator}</span>
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: C.textMuted, textTransform: "capitalize" }}>{h.type}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <Badge color={cfg?.color} bg={cfg?.bg}>{h.risk?.score || 0}</Badge>
                      </td>
                      <td style={tdStyle}>
                        <Badge color={cfg?.color} bg={cfg?.bg}>{cfg?.label}</Badge>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: C.textMuted }}>{timeAgo(h.timestamp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        {/* Top Categories */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Top Categories</h3>
            <Icon name="info" size={13} color={C.textDim} />
          </div>
          {stats.topTags.length === 0 ? (
            <EmptyChart message="No tagged threats yet" />
          ) : (
            <div>
              {stats.topTags.map(([tag, count], i) => {
                const max = stats.topTags[0][1];
                const pct = (count / max) * 100;
                return (
                  <div key={tag} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text }}>
                        <Icon name="flag" size={14} color={C.accentLight} />
                        {tag}
                      </span>
                      <span style={{ fontSize: 12, color: C.textMuted }}>
                        {count} <span style={{ color: C.textDim }}>({((count / stats.total) * 100).toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: C.accent, borderRadius: 3, transition: "width 0.8s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* SOURCE HEALTH */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Source Health</h3>
            {healthChecked && (
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
                Last checked: {healthChecked.toLocaleTimeString()}
              </div>
            )}
          </div>
          <Button variant="secondary"
            disabled={healthLoading}
            onClick={fetchSourceHealth}
            icon={<Icon name="refresh" size={14} color={healthLoading ? C.textDim : C.textMuted}
              style={{ animation: healthLoading ? "spin 1s linear infinite" : "none" }} />}>
            {healthLoading ? "Checking..." : "Refresh All"}
          </Button>
        </div>

        {sourceHealth.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: C.textMuted, fontSize: 13 }}>
            {healthLoading ? "Checking source availability..." : "Click Refresh All to check source status."}
          </div>
        ) : (
          <div className="table-scroll"><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <th style={thStyle}>SOURCE</th>
                <th style={thStyle}>STATUS</th>
                <th style={thStyle}>LOOKUPS</th>
                <th style={{ ...thStyle, textAlign: "right" }}>LATENCY</th>
              </tr>
            </thead>
            <tbody>
              {sourceHealth.map((s, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
                  <td style={tdStyle}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, overflow: "hidden", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <img src={`/icons/${s.icon}.png`} alt={s.name} width="20" height="20" style={{ objectFit: "contain", display: "block" }} />
                      </div>
                      <div>
                        <span style={{ color: C.text, fontWeight: 500 }}>{s.name}</span>
                        {s.error && <div style={{ fontSize: 10, color: C.red }}>{s.error}</div>}
                      </div>
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.statusColor, flexShrink: 0 }} />
                      <span style={{ color: s.statusColor, fontWeight: 500 }}>{s.status}</span>
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: C.text }}>{s.lookups.toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: s.latency ? C.text : C.textDim }}>
                    {s.latency ? `${s.latency}ms` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </Card>
    </>
  );
}

// ==================== MICRO COMPONENTS ====================

const thStyle = {
  textAlign: "left",
  padding: "10px 0",
  color: C.textMuted,
  fontWeight: 500,
  fontSize: 11,
  letterSpacing: 0.5,
};

const tdStyle = {
  padding: "12px 8px 12px 0",
  fontSize: 13,
};

function TriageItem({ icon, iconColor, label, value, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 0",
      borderBottom: last ? "none" : `1px solid ${C.borderSubtle}`,
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${iconColor}22`,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <Icon name={icon} size={15} color={iconColor} />
        </div>
        <span style={{ fontSize: 13, color: C.text }}>{label}</span>
      </span>
      <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{value}</span>
    </div>
  );
}

function EmptyChart({ message, subMessage }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <div style={{ marginBottom: 8, opacity: 0.4 }}>
        <Icon name="barChart" size={36} color={C.textDim} />
      </div>
      <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>{message}</div>
      {subMessage && <div style={{ fontSize: 11, color: C.textDim }}>{subMessage}</div>}
    </div>
  );
}
