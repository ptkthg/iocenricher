import { useState, useMemo, useRef, useEffect } from "react";
import { C, FONT, timeAgo } from "../lib/theme";
import Icon from "../components/Icon";
import { Card, Badge, Button, PageHeader, StatBox } from "../components/UI";

// ============ REAL DATA HELPERS ============
function csvEscape(v) { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildReportsFromHistory(history, generated) {
  const real = [];
  if (history.length > 0) {
    const highRisk = history.filter(h => ["CRÍTICO", "ALTO"].includes(h.risk?.level));
    const ips = history.filter(h => h.type === "ip");
    const hashes = history.filter(h => h.type === "hash");
    const domains = history.filter(h => h.type === "domain" || h.type === "url");

    if (history.length > 0) real.push({ id: "all", name: "Full Enrichment History", scope: "All Indicators", format: "CSV", createdAt: new Date(), status: "Ready", size: `${history.length} records`, count: history.length, data: history });
    if (highRisk.length > 0) real.push({ id: "highrisk", name: "High-Risk IOCs Summary", scope: "CRÍTICO + ALTO", format: "JSON", createdAt: new Date(Date.now() - 5 * 60000), status: "Ready", size: `${highRisk.length} records`, count: highRisk.length, data: highRisk });
    if (ips.length > 0) real.push({ id: "ips", name: "IP Address Report", scope: "IPs Only", format: "CSV", createdAt: new Date(Date.now() - 30 * 60000), status: "Ready", size: `${ips.length} records`, count: ips.length, data: ips });
    if (hashes.length > 0) real.push({ id: "hashes", name: "Malware Hash Analysis", scope: "Hashes Only", format: "JSON", createdAt: new Date(Date.now() - 2 * 3600000), status: "Ready", size: `${hashes.length} records`, count: hashes.length, data: hashes });
    if (domains.length > 0) real.push({ id: "domains", name: "Domain & URL Report", scope: "Domains + URLs", format: "CSV", createdAt: new Date(Date.now() - 4 * 3600000), status: "Ready", size: `${domains.length} records`, count: domains.length, data: domains });
  }
  return [...generated, ...real];
}

function downloadReport(report) {
  const data = report.data || [];
  if (report.format === "CSV") {
    const rows = [
      ["INDICATOR", "TYPE", "RISK SCORE", "RISK LEVEL", "ACTION", "TIMESTAMP"],
      ...data.map(h => [h.indicator, h.type, h.risk?.score ?? 0, h.risk?.level || "—", h.recommendation || "—", h.timestamp || "—"]),
    ];
    downloadBlob(rows.map(r => r.map(csvEscape).join(",")).join("\n"), "text/csv", `${report.name.replace(/\s+/g, "-")}-${Date.now()}.csv`);
  } else {
    downloadBlob(JSON.stringify(data, null, 2), "application/json", `${report.name.replace(/\s+/g, "-")}-${Date.now()}.json`);
  }
}

const TEMPLATES = [
  { name: "IOC Summary", desc: "Overview of indicators by type and risk", icon: "file" },
  { name: "Executive Overview", desc: "High-level summary for leadership", icon: "barChart" },
  { name: "Threat Intel Snapshot", desc: "Top threats, TTPs and campaigns", icon: "zap" },
  { name: "Source Health", desc: "Data source availability and performance", icon: "server" },
];

const SCHEDULED = [
  { name: "Weekly IOC Summary", scope: "All Indicators", freq: "Weekly", freqColor: C.accent, next: "Next run: Monday 09:00" },
  { name: "Daily High-Risk Digest", scope: "High Risk Only", freq: "Daily", freqColor: C.green, next: "Next run: Tomorrow 07:00" },
  { name: "Monthly Report", scope: "All Sources", freq: "Monthly", freqColor: C.orange, next: "Next run: Jun 1, 09:00" },
];

// ============ COMPONENTS ============
function FormatBadge({ format }) {
  const map = {
    PDF: { color: C.red, icon: "file" },
    CSV: { color: C.green, icon: "fileText" },
    JSON: { color: C.accentLight, icon: "file" },
  };
  const cfg = map[format] || map.JSON;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: `${cfg.color}22`, border: `1px solid ${cfg.color}44`, color: cfg.color, fontSize: 11, fontWeight: 500, fontFamily: FONT }}>
      <Icon name={cfg.icon} size={11} color={cfg.color} />
      {format}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    Completed: { color: C.green, dot: C.green },
    Generated: { color: C.accentLight, dot: C.accentLight },
    Failed: { color: C.red, dot: C.red },
    Running: { color: C.orange, dot: C.orange },
  };
  const cfg = map[status] || map.Completed;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: cfg.color }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot }} />
      {status}
    </span>
  );
}

function MiniDonut({ segments, total, size = 100 }) {
  const r = size / 2 - 8;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth="12" />
      {segments.filter(s => s.value > 0).map((s, i) => {
        const dash = (s.value / (total || 1)) * circ;
        const offset = (acc / (total || 1)) * circ;
        acc += s.value;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="12"
            strokeDasharray={`${dash} ${circ}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`} />
        );
      })}
    </svg>
  );
}

function ReportPreview({ report, history }) {
  if (!report) return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <Icon name="file" size={32} color={C.textDim} />
      <div style={{ marginTop: 10, fontSize: 12, color: C.textMuted }}>Select a report to preview</div>
    </div>
  );

  const stats = {
    total: history.length,
    highRisk: history.filter(h => ["CRÍTICO", "ALTO"].includes(h.risk?.level)).length,
    medium: history.filter(h => h.risk?.level === "MÉDIO").length,
    low: history.filter(h => h.risk?.level === "BAIXO").length,
  };

  return (
    <div>
      <div style={{ padding: "14px 16px", background: C.bgInput, borderRadius: 8, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{report.name}</div>
        <div style={{ fontSize: 11, color: C.textMuted }}>Generated on {report.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })} by {report.createdBy}</div>
      </div>

      <div style={{ padding: "10px 14px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 10 }}>Executive Summary</div>
        <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
          This report provides an overview of {history.length} enriched indicators, with risk classification and key trends for the selected period.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { label: "Total IOCs", value: stats.total, color: C.text },
          { label: "High Risk", value: stats.highRisk, color: C.red },
          { label: "Medium Risk", value: stats.medium, color: C.yellow },
          { label: "Low Risk", value: stats.low, color: C.green },
        ].map(s => (
          <div key={s.label} style={{ padding: "10px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 6, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={() => report.data && downloadReport(report)} style={{ flex: 1, justifyContent: "center", fontSize: 12 }} icon={<Icon name="download" size={13} color="#fff" />}>
          Download {report.format}
        </Button>
        <Button variant="secondary" onClick={() => report.data && downloadReport(report)} icon={<Icon name="external" size={13} />} style={{ padding: "8px 12px" }}>
          Export
        </Button>
      </div>
    </div>
  );
}

// ============ MAIN ============
export default function Reports({ history = [] }) {
  const [filterFormat, setFilterFormat] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedReport, setSelectedReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);

  const reports = useMemo(() => buildReportsFromHistory(history, generatedReports), [history, generatedReports]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  const mostActiveDay = useMemo(() => {
    if (history.length === 0) return "—";
    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const counts = {};
    history.forEach(h => {
      const d = DAYS[new Date(h.timestamp || Date.now()).getDay()];
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [history]);

  const avgRecordsLabel = useMemo(() => {
    if (reports.length === 0) return "—";
    const avg = Math.round(reports.reduce((a, r) => a + (r.count || 0), 0) / reports.length);
    return avg > 0 ? `~${avg} records` : "—";
  }, [reports]);

  const filtered = reports.filter(r => {
    if (filterFormat !== "All" && r.format !== filterFormat) return false;
    if (filterStatus !== "All" && r.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    generated: reports.length,
    scheduled: SCHEDULED.length,
    topFormat: reports.length > 0 ? (["CSV","JSON","PDF"].sort((a,b) => reports.filter(r=>r.format===b).length - reports.filter(r=>r.format===a).length)[0]) : "—",
    totalRecords: history.length,
  };

  function handleGenerate() {
    if (history.length === 0) return;
    setGenerating(true);
    setTimeout(() => {
      const newReport = {
        id: `gen-${Date.now()}`,
        name: `Full Report — ${new Date().toLocaleDateString("pt-BR")}`,
        scope: "All Indicators",
        format: "CSV",
        createdAt: new Date(),
        status: "Ready",
        size: `${history.length} records`,
        count: history.length,
        data: history,
      };
      setGeneratedReports(prev => [newReport, ...prev]);
      setSelectedReport(newReport);
      setGenerating(false);
    }, 1500);
  }

  function handleGenerateFromTemplate(template) {
    if (history.length === 0) { showToast("No history data to generate a report from."); return; }
    setGenerating(true);
    setTimeout(() => {
      const cfgMap = {
        "IOC Summary": { scope: "All Indicators", data: history, format: "CSV" },
        "Executive Overview": { scope: "High Risk IOCs", data: history.filter(h => ["CRÍTICO", "ALTO"].includes(h.risk?.level)), format: "JSON" },
        "Threat Intel Snapshot": { scope: "Top 10 Threats", data: history.filter(h => ["CRÍTICO", "ALTO"].includes(h.risk?.level)).slice(0, 10), format: "JSON" },
        "Source Health": { scope: "Source Status", data: [], format: "JSON" },
      };
      const cfg = cfgMap[template.name] || cfgMap["IOC Summary"];
      const newReport = {
        id: `tpl-${Date.now()}`,
        name: `${template.name} — ${new Date().toLocaleDateString("pt-BR")}`,
        scope: cfg.scope,
        format: cfg.format,
        createdAt: new Date(),
        status: "Ready",
        size: `${cfg.data.length} records`,
        count: cfg.data.length,
        data: cfg.data,
        createdBy: "Template",
      };
      setGeneratedReports(prev => [newReport, ...prev]);
      setSelectedReport(newReport);
      setGenerating(false);
    }, 1200);
  }

  function exportAll() {
    downloadBlob(JSON.stringify(history, null, 2), "application/json", `ioc-full-export-${Date.now()}.json`);
  }

  const donutData = [
    { label: "PDF", value: reports.filter(r => r.format === "PDF").length, color: C.red },
    { label: "CSV", value: reports.filter(r => r.format === "CSV").length, color: C.green },
    { label: "JSON", value: reports.filter(r => r.format === "JSON").length, color: C.accentLight },
  ];

  return (
    <>
      {toastMsg && (
        <div style={{ position: "fixed", bottom: 28, right: 28, padding: "12px 18px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.35)", color: C.text, fontSize: 13, zIndex: 200, maxWidth: 380, lineHeight: 1.5 }}>
          {toastMsg}
        </div>
      )}
      <PageHeader
        title="Reports"
        subtitle="Generate, schedule and export intelligence reports to support investigations and operational decisions."
        actions={
          <>
            <Button onClick={handleGenerate} disabled={generating}
              icon={<Icon name={generating ? "refresh" : "plus"} size={14} color="#fff" />}>
              {generating ? "Generating..." : "Generate Report"}
            </Button>
            <Button variant="secondary" onClick={() => showToast("Scheduling requires a backend setup — use Export for client-only mode.")} icon={<Icon name="calendar" size={14} />}>
              New Scheduled Report
            </Button>
            <Button variant="secondary" onClick={exportAll} icon={<Icon name="download" size={14} />}>
              Export
            </Button>
          </>
        }
      />

      {/* STAT CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <StatBox label="Reports Generated (This Month)" value={stats.generated}
          icon={<Icon name="fileText" size={20} color={C.accentLight} />}
          iconColor={C.accentLight} footer="intelligence reports" />
        <StatBox label="Scheduled Reports" value={stats.scheduled}
          icon={<Icon name="calendar" size={20} color={C.purple} />}
          iconColor={C.purple} iconBg={C.purpleBg} footer="Active schedules" />
        <StatBox label="Most Exported Format" value={stats.topFormat}
          icon={<Icon name="file" size={20} color={C.red} />}
          iconColor={C.red} iconBg={C.redBg} footer="62% of exports" />
        <StatBox label="Total IOC Records" value={stats.totalRecords.toLocaleString()}
          icon={<Icon name="layers" size={20} color={C.green} />}
          iconColor={C.green} iconBg={C.greenBg} footer="from history" />
      </div>

      {/* MAIN + SIDEBAR */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, marginBottom: 20 }}>
        {/* Reports Table */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Filters */}
          <Card style={{ padding: "12px 20px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="calendar" size={14} color={C.textMuted} />
                <select style={selSt} value="May 2026" onChange={() => {}}>
                  <option>May 2026</option>
                  <option>Apr 2026</option>
                  <option>All time</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>Format</span>
                <select style={selSt} value={filterFormat} onChange={e => setFilterFormat(e.target.value)}>
                  <option>All</option>
                  <option>PDF</option>
                  <option>CSV</option>
                  <option>JSON</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>Status</span>
                <select style={selSt} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option>All</option>
                  <option>Completed</option>
                  <option>Generated</option>
                  <option>Failed</option>
                </select>
              </div>
              {(filterFormat !== "All" || filterStatus !== "All") && (
                <button onClick={() => { setFilterFormat("All"); setFilterStatus("All"); }}
                  style={{ background: "transparent", border: "none", color: C.accentLight, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
                  ✕ Clear filters
                </button>
              )}
            </div>
          </Card>

          {/* Table */}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bgSidebar, borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ ...thSt, paddingLeft: 20 }}>REPORT NAME</th>
                  <th style={thSt}>SCOPE</th>
                  <th style={thSt}>FORMAT</th>
                  <th style={thSt}>CREATED BY</th>
                  <th style={thSt}>DATE</th>
                  <th style={thSt}>STATUS</th>
                  <th style={{ ...thSt, textAlign: "right", paddingRight: 20 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} onClick={() => setSelectedReport(r)}
                    style={{ borderBottom: `1px solid ${C.borderSubtle}`, cursor: "pointer", background: selectedReport?.id === r.id ? C.bgCardHover : "transparent", transition: "background 0.1s" }}
                    onMouseEnter={e => { if (selectedReport?.id !== r.id) e.currentTarget.style.background = C.bgCardHover; }}
                    onMouseLeave={e => { if (selectedReport?.id !== r.id) e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ ...tdSt, paddingLeft: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: C.bgInput, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon name="fileText" size={14} color={C.accentLight} />
                        </div>
                        <div>
                          <div style={{ color: C.text, fontWeight: 500, marginBottom: 2 }}>{r.name}</div>
                          {r.size !== "—" && <div style={{ fontSize: 10, color: C.textDim }}>{r.size}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={tdSt}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.textMuted }}>
                        <Icon name={r.scopeType} size={12} color={C.textDim} />
                        {r.scope}
                      </span>
                    </td>
                    <td style={tdSt}><FormatBadge format={r.format} /></td>
                    <td style={{ ...tdSt, color: C.textMuted }}>{r.createdBy || "System"}</td>
                    <td style={{ ...tdSt, color: C.textMuted }}>{timeAgo(r.createdAt)}</td>
                    <td style={tdSt}><StatusBadge status={r.status} /></td>
                    <td style={{ ...tdSt, textAlign: "right", paddingRight: 20 }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        {r.data && (
                          <IBtn icon="download" title="Download" onClick={e => { e.stopPropagation(); downloadReport(r); }} />
                        )}
                        <MoreMenu report={r} onDelete={() => {}} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textMuted }}>
              {filtered.length}–{filtered.length} of {filtered.length} reports
            </div>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Report Preview */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Report Preview</h3>
              {selectedReport && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <FormatBadge format={selectedReport.format} />
                  <button style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textDim, padding: 2 }}
                    onClick={() => setSelectedReport(null)}>
                    <Icon name="x" size={14} />
                  </button>
                </div>
              )}
            </div>
            <ReportPreview report={selectedReport} history={history} />
          </Card>

          {/* Format distribution */}
          <Card>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, marginBottom: 16, color: C.text }}>Format Distribution</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <MiniDonut segments={donutData} total={reports.length} size={100} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {donutData.map(d => (
                  <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                    <span style={{ color: C.textMuted }}>{d.label}</span>
                    <span style={{ color: C.text, fontWeight: 500 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {/* Scheduled */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Scheduled Reports</h3>
            <span style={{ fontSize: 11, color: C.textDim }}>{SCHEDULED.length} active</span>
          </div>
          {SCHEDULED.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < SCHEDULED.length - 1 ? `1px solid ${C.borderSubtle}` : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="calendar" size={15} color={C.accentLight} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 2 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{s.scope}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <Badge color={s.freqColor} bg={`${s.freqColor}22`}>{s.freq}</Badge>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>{s.next}</div>
              </div>
            </div>
          ))}
          <Button variant="secondary" onClick={() => showToast("Scheduling requires a backend setup — use the Export button to download reports.")} style={{ width: "100%", justifyContent: "center", marginTop: 14, fontSize: 12 }}
            icon={<Icon name="calendar" size={13} />}>
            Manage scheduled reports
          </Button>
        </Card>

        {/* Templates */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>Report Templates</h3>
            <span style={{ fontSize: 11, color: C.textDim }}>{TEMPLATES.length} templates</span>
          </div>
          {TEMPLATES.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < TEMPLATES.length - 1 ? `1px solid ${C.borderSubtle}` : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.bgInput, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={t.icon} size={15} color={C.textMuted} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{t.desc}</div>
              </div>
              <Button variant="secondary" onClick={() => handleGenerateFromTemplate(t)} disabled={generating} style={{ padding: "6px 12px", fontSize: 11, flexShrink: 0 }}>
                Use template
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => showToast("Custom templates coming soon.")} style={{ width: "100%", justifyContent: "center", marginTop: 14, fontSize: 12 }}
            icon={<Icon name="fileText" size={13} />}>
            Manage templates
          </Button>
        </Card>

        {/* Quick Stats */}
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, marginBottom: 16, color: C.text }}>Quick Stats</h3>
          {[
            { label: "Reports this week", value: Math.min(reports.length, 7), icon: "fileText", color: C.accentLight },
            { label: "Avg. report size", value: avgRecordsLabel, icon: "database", color: C.purple },
            { label: "Most active day", value: mostActiveDay, icon: "calendar", color: C.green },
            { label: "Failed reports", value: reports.filter(r => r.status === "Failed").length, icon: "alert", color: C.red },
          ].map((s, i, arr) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.borderSubtle}` : "none" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: `${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={s.icon} size={14} color={s.color} />
                </div>
                <span style={{ color: C.textMuted }}>{s.label}</span>
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.value}</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

// ============ MICRO COMPONENTS ============
const thSt = { textAlign: "left", padding: "10px 8px", color: C.textMuted, fontWeight: 500, fontSize: 11, letterSpacing: 0.5 };
const tdSt = { padding: "12px 8px", fontSize: 13, verticalAlign: "middle" };
const selSt = {
  padding: "7px 28px 7px 10px", background: C.bgInput,
  border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.text, fontSize: 12, fontFamily: FONT,
  outline: "none", cursor: "pointer", appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238896ad' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
};

function MoreMenu({ report, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const items = [
    { icon: "download", label: `Download ${report.format}`, action: () => report.data && downloadReport(report), disabled: !report.data },
    { icon: "copy", label: "Copy indicator list", action: () => { if (report.data) navigator.clipboard?.writeText(report.data.map(h => h.indicator).join("\n")); } },
    { icon: "trash", label: "Remove", action: () => onDelete?.(), color: C.red },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <IBtn icon="more" title="More options" onClick={e => { e.stopPropagation(); setOpen(o => !o); }} />
      {open && (
        <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", width: 190, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.3)", zIndex: 50, overflow: "hidden" }}>
          {items.map(item => (
            <button key={item.label} disabled={item.disabled} onClick={() => { item.action(); setOpen(false); }} style={{ width: "100%", padding: "9px 14px", background: "transparent", border: "none", display: "flex", alignItems: "center", gap: 10, cursor: item.disabled ? "not-allowed" : "pointer", color: item.color || (item.disabled ? C.textDim : C.text), fontSize: 12, fontFamily: FONT, textAlign: "left", opacity: item.disabled ? 0.4 : 1 }}
              onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = C.bgCardHover; }}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <Icon name={item.icon} size={13} color={item.color || (item.disabled ? C.textDim : C.textMuted)} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IBtn({ icon, title, onClick }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 28, height: 28, borderRadius: 6, border: "1px solid transparent",
      background: "transparent", cursor: "pointer", color: C.textDim,
      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s"
    }}
      onMouseEnter={e => { e.currentTarget.style.background = C.bgCardHover; e.currentTarget.style.borderColor = C.border; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
      <Icon name={icon} size={14} color={C.textDim} />
    </button>
  );
}
