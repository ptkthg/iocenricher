import { useState, useMemo } from "react";
import { C, FONT, RISK_CFG, timeAgo } from "../lib/theme";
import Icon from "../components/Icon";
import { Card, Badge, Button, Input, PageHeader } from "../components/UI";
import { clearHistory } from "../lib/api";

// ============ MINI DONUT ============
function MiniDonut({ segments, total, size = 120 }) {
  const r = size / 2 - 10;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth="14" />
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const offset = (acc / total) * circ;
        acc += seg.value;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth="14"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`} />
        );
      })}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="16" fontWeight="700" fill={C.text} fontFamily={FONT}>{total}</text>
    </svg>
  );
}

// ============ VERDICT BADGE ============
function VerdictBadge({ level }) {
  const cfg = RISK_CFG[level];
  if (!cfg) return <Badge color={C.green} bg={C.greenBg}>CLEAN</Badge>;
  return <Badge color={cfg.color} bg={cfg.bg}>{cfg.label}</Badge>;
}

// ============ ACTION BADGE ============
function ActionBadge({ action }) {
  const map = {
    BLOQUEAR: { color: C.red, bg: C.redBg, icon: "block", label: "Blocked" },
    INVESTIGAR: { color: C.accentLight, bg: "rgba(59,130,246,0.1)", icon: "target", label: "Investigated" },
    MONITORAR: { color: C.orange, bg: C.orangeBg, icon: "eye", label: "Monitored" },
    IGNORAR: { color: C.textMuted, bg: "rgba(136,150,173,0.1)", icon: "check", label: "Ignored" },
  };
  const cfg = map[action] || map.IGNORAR;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: cfg.color }}>
      <Icon name={cfg.icon} size={13} color={cfg.color} />
      {cfg.label}
    </span>
  );
}

// ============ IOC ICON ============
function IOCTypeIcon({ type }) {
  const map = { ip: "globe", domain: "globe", url: "link", hash: "hash" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 28, height: 28, borderRadius: 6,
      background: C.bgInput, border: `1px solid ${C.border}`, flexShrink: 0
    }}>
      <Icon name={map[type] || "globe"} size={14} color={C.accentLight} />
    </span>
  );
}

// ============ SCORE PILL ============
function ScorePill({ score, level }) {
  const cfg = RISK_CFG[level] || RISK_CFG.BAIXO;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 38, height: 24, borderRadius: 6,
      background: cfg.bg, color: cfg.color,
      fontSize: 12, fontWeight: 700, fontFamily: FONT,
      border: `1px solid ${cfg.color}44`
    }}>{score || 0}</span>
  );
}

// ============ MAIN ============
export default function History({ history, setHistory, onNavigate, onInvestigate }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [filterVerdict, setFilterVerdict] = useState("All");
  const [filterDate, setFilterDate] = useState("All");
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [saved, setSaved] = useState([]);
  const PER_PAGE = 15;

  // Derived stats
  const stats = useMemo(() => {
    const total = history.length;
    const unique = new Set(history.map(h => h.indicator)).size;
    const highRisk = history.filter(h => ["CRÍTICO", "ALTO"].includes(h.risk?.level)).length;
    const actionsTaken = history.filter(h => h.recommendation !== "IGNORAR").length;
    const byType = {};
    history.forEach(h => { byType[h.type || "unknown"] = (byType[h.type || "unknown"] || 0) + 1; });
    const byAction = {
      BLOQUEAR: history.filter(h => h.recommendation === "BLOQUEAR").length,
      INVESTIGAR: history.filter(h => h.recommendation === "INVESTIGAR").length,
      MONITORAR: history.filter(h => h.recommendation === "MONITORAR").length,
      IGNORAR: history.filter(h => h.recommendation === "IGNORAR").length,
    };
    return { total, unique, highRisk, actionsTaken, byType, byAction };
  }, [history]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...history];
    if (search) list = list.filter(h => h.indicator.toLowerCase().includes(search.toLowerCase()));
    if (filterType !== "All") list = list.filter(h => h.type?.toLowerCase() === filterType.toLowerCase());
    if (filterLevel !== "All") list = list.filter(h => h.risk?.level === filterLevel);
    if (filterVerdict !== "All") list = list.filter(h => h.recommendation === filterVerdict);
    if (filterDate !== "All") {
      const cutoff = { "24h": 86400000, "7d": 604800000, "30d": 2592000000 }[filterDate];
      if (cutoff) list = list.filter(h => Date.now() - new Date(h.timestamp).getTime() < cutoff);
    }

    list.sort((a, b) => {
      let va, vb;
      if (sortBy === "timestamp") { va = a._saved_at || new Date(a.timestamp).getTime(); vb = b._saved_at || new Date(b.timestamp).getTime(); }
      else if (sortBy === "score") { va = a.risk?.score || 0; vb = b.risk?.score || 0; }
      else if (sortBy === "indicator") { va = a.indicator; vb = b.indicator; }
      else { va = a[sortBy]; vb = b[sortBy]; }
      if (sortDir === "asc") return va > vb ? 1 : -1;
      return va < vb ? 1 : -1;
    });

    return list;
  }, [history, search, filterType, filterLevel, filterVerdict, filterDate, sortBy, sortDir]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
    setPage(1);
  }

  function toggleSave(h) {
    setSaved(s => s.find(x => x.indicator === h.indicator)
      ? s.filter(x => x.indicator !== h.indicator)
      : [...s, h]);
  }

  function isSaved(h) { return saved.some(x => x.indicator === h.indicator); }

  function handleClearHistory() {
    if (window.confirm("Clear all history? This cannot be undone.")) {
      clearHistory();
      setHistory([]);
    }
  }

  function exportCSV() {
    const headers = ["Indicator", "Type", "Score", "Level", "Recommendation", "Timestamp"];
    const rows = filtered.map(h => [
      h.indicator, h.type, h.risk?.score || 0, h.risk?.level || "—", h.recommendation || "—",
      new Date(h.timestamp).toLocaleString()
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ioc-history-${Date.now()}.csv`; a.click();
  }

  const typeSegments = [
    { label: "Domain", value: stats.byType.domain || 0, color: C.accent },
    { label: "IP", value: stats.byType.ip || 0, color: C.orange },
    { label: "URL", value: stats.byType.url || 0, color: C.purple },
    { label: "Hash", value: stats.byType.hash || 0, color: C.green },
  ];

  const SortIcon = ({ col }) => (
    <Icon name={sortBy === col ? (sortDir === "asc" ? "arrowUp" : "arrowDown") : "arrowDown"}
      size={11} color={sortBy === col ? C.accentLight : C.textDim} />
  );

  return (
    <>
      <PageHeader
        title="History"
        subtitle="Browse and review past lookups, investigations and actions taken."
        actions={
          <>
            <Button variant="secondary" onClick={handleClearHistory} icon={<Icon name="trash" size={14} />}>
              Clear All
            </Button>
            <Button variant="secondary" onClick={exportCSV} icon={<Icon name="download" size={14} />}>
              Export History
            </Button>
          </>
        }
      />

      <div className="main-with-sidebar" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        {/* Main */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Filters */}
          <Card style={{ padding: "14px 20px" }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <FilterPill label="Type" value={filterType}
                options={["All", "IP", "Domain", "URL", "Hash"]}
                onChange={v => { setFilterType(v); setPage(1); }} />
              <FilterPill label="Risk Level" value={filterLevel}
                options={["All", "CRÍTICO", "ALTO", "MÉDIO", "BAIXO"]}
                onChange={v => { setFilterLevel(v); setPage(1); }} />
              <FilterPill label="Action" value={filterVerdict}
                options={["All", "BLOQUEAR", "INVESTIGAR", "MONITORAR", "IGNORAR"]}
                onChange={v => { setFilterVerdict(v); setPage(1); }} />
              <FilterPill label="Period" value={filterDate}
                options={["All", "24h", "7d", "30d"]}
                onChange={v => { setFilterDate(v); setPage(1); }} />

              <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
                <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                  <Icon name="search" size={14} color={C.textDim} />
                </div>
                <Input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder={"Search in history..."}
                  style={{ width: "100%", paddingLeft: 36, paddingTop: 8, paddingBottom: 8 }}
                />
              </div>

              {(search || filterType !== "All" || filterLevel !== "All" || filterVerdict !== "All" || filterDate !== "All") && (
                <button onClick={() => { setSearch(""); setFilterType("All"); setFilterLevel("All"); setFilterVerdict("All"); setFilterDate("All"); setPage(1); }}
                  style={{ background: "transparent", border: "none", color: C.accentLight, fontSize: 12, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap" }}>
                  ✕ Clear filters
                </button>
              )}
            </div>
          </Card>

          {/* Table */}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {history.length === 0 ? (
              <div style={{ padding: "60px 40px", textAlign: "center" }}>
                <Icon name="history" size={40} color={C.textDim} />
                <div style={{ marginTop: 12, fontSize: 14, color: C.textMuted }}>No lookups yet</div>
                <div style={{ marginTop: 6, fontSize: 12, color: C.textDim }}>Run an enrichment to see your history here</div>
                <div style={{ marginTop: 20 }}>
                  <Button onClick={() => onNavigate?.("Enrichment")} icon={<Icon name="search" size={14} color="#fff" />}>
                    Go to Enrichment
                  </Button>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: 13, color: C.textMuted }}>No results match your filters</div>
              </div>
            ) : (
              <>
                <div className="table-scroll"><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bgSidebar }}>
                      <ColHeader label="INDICATOR" col="indicator" sortBy={sortBy} onSort={toggleSort} style={{ paddingLeft: 20 }} />
                      <ColHeader label="TYPE" col="type" sortBy={sortBy} onSort={toggleSort} />
                      <ColHeader label="RISK SCORE" col="score" sortBy={sortBy} onSort={toggleSort} style={{ textAlign: "center" }} />
                      <th style={thSt}>VERDICT</th>
                      <th style={thSt}>SOURCES</th>
                      <th style={thSt}>ACTION TAKEN</th>
                      <ColHeader label="LAST UPDATED" col="timestamp" sortBy={sortBy} onSort={toggleSort} style={{ textAlign: "right", paddingRight: 20 }} />
                      <th style={{ ...thSt, width: 80 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((h, i) => (
                      <tr key={i}
                        style={{ borderBottom: `1px solid ${C.borderSubtle}`, transition: "background 0.1s", cursor: "pointer" }}
                        onClick={() => onInvestigate?.(h.indicator)}
                        onMouseEnter={e => e.currentTarget.style.background = C.bgCardHover}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        title={`Re-analyze ${h.indicator}`}
                      >
                        <td style={{ ...tdSt, paddingLeft: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <IOCTypeIcon type={h.type} />
                            <span style={{ color: C.text, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {h.indicator}
                            </span>
                          </div>
                        </td>
                        <td style={{ ...tdSt, color: C.textMuted, textTransform: "capitalize" }}>{h.type || "—"}</td>
                        <td style={{ ...tdSt, textAlign: "center" }}>
                          <ScorePill score={h.risk?.score} level={h.risk?.level} />
                        </td>
                        <td style={tdSt}><VerdictBadge level={h.risk?.level} /></td>
                        <td style={{ ...tdSt, color: C.textMuted }}>
                          {Object.values(h.sources || {}).filter(Boolean).length}
                        </td>
                        <td style={tdSt}><ActionBadge action={h.recommendation} /></td>
                        <td style={{ ...tdSt, textAlign: "right", paddingRight: 20, color: C.textMuted }}>
                          {timeAgo(h._saved_at || h.timestamp)}
                        </td>
                        <td style={{ ...tdSt, paddingRight: 16 }}>
                          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                            <IconBtn icon="external" title="Re-analyze" onClick={e => { e.stopPropagation(); onInvestigate?.(h.indicator); }} />
                            <IconBtn icon="download" title="Export" onClick={e => {
                              e.stopPropagation();
                              const blob = new Blob([JSON.stringify(h, null, 2)], { type: "application/json" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url; a.download = `ioc-${h.indicator}.json`; a.click();
                            }} />
                            <IconBtn icon={isSaved(h) ? "bookmarkSaved" : "bookmark"}
                              title="Save"
                              color={isSaved(h) ? C.accentLight : C.textDim}
                              onClick={e => { e.stopPropagation(); toggleSave(h); }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>

                {/* Pagination */}
                <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: C.textMuted }}>
                    Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} results
                  </span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <PageBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <Icon name="chevLeft" size={14} />
                    </PageBtn>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <PageBtn key={p} onClick={() => setPage(p)} active={page === p}>{p}</PageBtn>
                      );
                    })}
                    {totalPages > 5 && <span style={{ color: C.textMuted, fontSize: 12 }}>...</span>}
                    <PageBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      <Icon name="chevRight" size={14} />
                    </PageBtn>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Overview */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>History Overview</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <OverviewStat label={"Total Lookups"} value={stats.total} />
              <OverviewStat label={"Unique Indicators"} value={stats.unique} />
              <OverviewStat label="High Risk" value={stats.highRisk} color={C.red} />
              <OverviewStat label="Actions Taken" value={stats.actionsTaken} color={C.green} />
            </div>
          </Card>

          {/* Indicator Types */}
          <Card>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, marginBottom: 16, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
              Indicator Types <Icon name="info" size={13} color={C.textDim} />
            </h3>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <MiniDonut segments={typeSegments} total={stats.total || 1} size={140} />
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                {typeSegments.map(seg => (
                  <div key={seg.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color }} />
                      <span style={{ color: C.textMuted }}>{seg.label}</span>
                    </span>
                    <span style={{ color: C.text }}>{seg.value} <span style={{ color: C.textMuted }}>({stats.total ? ((seg.value / stats.total) * 100).toFixed(0) : 0}%)</span></span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Actions Overview */}
          <Card>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, marginBottom: 16, color: C.text }}>Actions Overview</h3>
            {[
              { label: "Blocked", key: "BLOQUEAR", color: C.red },
              { label: "Monitored", key: "MONITORAR", color: C.orange },
              { label: "Investigated", key: "INVESTIGAR", color: C.accentLight },
              { label: "Ignored", key: "IGNORAR", color: C.textMuted },
            ].map(({ label, key, color }) => {
              const val = stats.byAction[key] || 0;
              const pct = stats.total ? (val / stats.total) * 100 : 0;
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.text, width: 90, flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, color: C.textMuted, minWidth: 50, textAlign: "right" }}>
                    {val} ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </Card>

          {/* Saved Investigations */}
          {saved.length > 0 && (
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Saved Investigations</h3>
                <button style={{ background: "transparent", border: "none", color: C.accentLight, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>View all</button>
              </div>
              {saved.slice(0, 4).map((h, i) => {
                const cfg = RISK_CFG[h.risk?.level] || RISK_CFG.BAIXO;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i > 0 ? `1px solid ${C.borderSubtle}` : "none" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: cfg.bg, border: `1px solid ${cfg.color}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="bookmark" size={13} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.indicator}</div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>Saved {timeAgo(h._saved_at || h.timestamp)}</div>
                    </div>
                    <ScorePill score={h.risk?.score} level={h.risk?.level} />
                  </div>
                );
              })}
              <button onClick={() => setSaved([])} style={{ width: "100%", marginTop: 12, padding: "8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMuted, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
                See all bookmarks
              </button>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

// ============ MICRO COMPONENTS ============
const thSt = { textAlign: "left", padding: "10px 8px", color: C.textMuted, fontWeight: 500, fontSize: 11, letterSpacing: 0.5 };
const tdSt = { padding: "12px 8px", fontSize: 13 };

function ColHeader({ label, col, sortBy, onSort, style = {} }) {
  return (
    <th onClick={() => onSort(col)} style={{ ...thSt, cursor: "pointer", userSelect: "none", ...style }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label}
        <Icon name={sortBy === col ? "arrowDown" : "arrowDown"} size={10} color={sortBy === col ? C.accentLight : C.textDim} />
      </span>
    </th>
  );
}

function FilterPill({ label, value, options, onChange }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        padding: "7px 28px 7px 12px",
        background: value !== "All" ? "rgba(59,130,246,0.12)" : C.bgInput,
        border: `1px solid ${value !== "All" ? C.accent : C.border}`,
        borderRadius: 8, color: value !== "All" ? C.accentLight : C.textMuted,
        fontSize: 12, fontFamily: FONT, cursor: "pointer", outline: "none",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238896ad' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}>
        {options.map(o => <option key={o} value={o}>{o === "All" ? `${label}: All` : o}</option>)}
      </select>
    </div>
  );
}

function PageBtn({ children, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 32, height: 32, borderRadius: 6, border: `1px solid ${active ? C.accent : C.border}`,
      background: active ? "rgba(59,130,246,0.15)" : "transparent",
      color: active ? C.accentLight : disabled ? C.textDim : C.text,
      fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT
    }}>{children}</button>
  );
}

function IconBtn({ icon, title, onClick, color = C.textDim }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 26, height: 26, borderRadius: 6, border: `1px solid transparent`,
      background: "transparent", color, cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.15s"
    }}
      onMouseEnter={e => { e.currentTarget.style.background = C.bgCardHover; e.currentTarget.style.borderColor = C.border; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
      <Icon name={icon} size={14} color={color} />
    </button>
  );
}

function OverviewStat({ label, value, color }) {
  return (
    <div style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || C.text, fontFamily: FONT }}>{value}</div>
    </div>
  );
}
