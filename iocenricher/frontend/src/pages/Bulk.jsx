import { useMemo, useState } from "react";
import { C, FONT, RISK_CFG, fmtDate } from "../lib/theme";
import { enrichIndicator } from '../lib/api';
import { BULK_LIMIT, BULK_STORAGE_KEY, parseIndicators, loadBulkResults, analyzeBulkIndicator } from '../lib/bulk';
import Icon from "../components/Icon";
import { Card, Badge, Button, Input, PageHeader } from "../components/UI";
import { saveInvestigations } from '../lib/investigationStore';

const CHUNK_SIZE = 3;
const PER_PAGE = 15;

function riskColor(level) { return (RISK_CFG[level] || RISK_CFG.INCONCLUSIVO).color; }
function riskBg(level) { return (RISK_CFG[level] || RISK_CFG.INCONCLUSIVO).bg; }

function actionColor(action) {
  const map = { BLOQUEAR: C.red, INVESTIGAR: C.accentLight, MONITORAR: C.orange, IGNORAR: C.textMuted };
  return map[action] || C.textMuted;
}

function exportBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Summary Cards
function SummaryCards({ results }) {
  if (!results.length) return null;
  const highRisk = results.filter(r => ["CRÍTICO", "ALTO"].includes(r.risk?.level)).length;
  const clean = results.filter(r => r.risk?.classification === "BAIXO_RISCO_OBSERVADO" && r.query_status !== 'error').length;
  const failed = results.filter(r => r.error || r.query_status === 'error').length;

  const cards = [
    { label: "Total analisado", value: results.length, color: C.accentLight, bg: "rgba(59,130,246,0.1)", icon: "layers" },
    { label: "Risco alto", value: highRisk, color: C.red, bg: C.redBg, icon: "alert" },
    { label: "Baixo risco observado", value: clean, color: C.green, bg: C.greenBg, icon: "check" },
    { label: "Falhas", value: failed, color: C.textMuted, bg: "rgba(88,107,133,0.12)", icon: "x" },
  ];

  return (
    <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: "14px 18px", display: "flex", alignItems: "center", gap: 14
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: c.bg,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <Icon name={c.icon} size={16} color={c.color} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Row action buttons
function RowActions({ row, onSaved }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState('');

  async function copyIndicator() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Área de transferência indisponível');
      await navigator.clipboard.writeText(row.indicator);
      setActionError(''); setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { setActionError('Não foi possível copiar.'); }
  }

  function downloadRow() {
    exportBlob(JSON.stringify(row, null, 2), "application/json", `${row.indicator.replace(/[^a-z0-9._-]/gi, "_")}-${Date.now()}.json`);
  }

  async function saveToHistory() {
    try {
      const updated = await saveInvestigations([{ ...row, savedAt: new Date().toISOString() }]);
      setSaved(true);
      onSaved?.(updated);
      setTimeout(() => setSaved(false), 1600);
    } catch { setActionError('Não foi possível salvar no histórico.'); }
  }

  const iconBtn = (title, onClick, iconName, active, activeColor) => (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        background: active ? `${activeColor}22` : "transparent",
        border: `1px solid ${active ? activeColor : "transparent"}`,
        borderRadius: 6, width: 28, height: 28, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <Icon name={iconName} size={13} color={active ? activeColor : C.textMuted} />
    </button>
  );

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "flex-end" }}>
      {actionError && <span role="alert" style={{ color: C.red, fontSize: 10 }}>{actionError}</span>}
      {iconBtn(copied ? "Copiado" : "Copiar indicador", copyIndicator, copied ? "check" : "copy", copied, C.green)}
      {iconBtn("Baixar JSON", downloadRow, "download", false)}
      {iconBtn(saved ? "Salvo" : "Salvar no histórico", saveToHistory, saved ? "check" : "bookmark", saved, C.accentLight)}
    </div>
  );
}

// Main component
export default function Bulk({ setHistory }) {
  const [rawInput, setRawInput] = useState("");
  const [results, setResults] = useState(() => loadBulkResults(localStorage));
  const [analyzing, setAnalyzing] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [filterAction, setFilterAction] = useState("All");
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [savedAll, setSavedAll] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');

  const parsedIndicators = useMemo(() => parseIndicators(rawInput), [rawInput]);
  const overLimit = parsedIndicators.length > BULK_LIMIT;
  const runList = parsedIndicators;
  const canAnalyze = runList.length > 0 && !overLimit && !analyzing;
  const counterColor = overLimit ? C.red : parsedIndicators.length >= BULK_LIMIT * 0.8 ? C.orange : C.accentLight;

  const filtered = useMemo(() => {
    let list = [...results];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => [r.indicator, r.type, r.risk?.level, r.recommendation].some(v => String(v || "").toLowerCase().includes(q)));
    }
    if (filterType !== "All") list = list.filter(r => r.type === filterType);
    if (filterLevel !== "All") list = list.filter(r => r.risk?.level === filterLevel);
    if (filterAction !== "All") list = list.filter(r => r.recommendation === filterAction);
    list.sort((a, b) => {
      let av, bv;
      if (sortBy === "score") { av = a.risk?.score ?? -1; bv = b.risk?.score ?? -1; }
      else if (sortBy === "level") { const o = { BAIXO: 1, MÉDIO: 2, ALTO: 3, CRÍTICO: 4 }; av = o[a.risk?.level] || 0; bv = o[b.risk?.level] || 0; }
      else if (sortBy === "timestamp") { av = new Date(a.timestamp).getTime(); bv = new Date(b.timestamp).getTime(); }
      else { av = String(a[sortBy] || "").toLowerCase(); bv = String(b[sortBy] || "").toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [results, search, filterType, filterLevel, filterAction, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const progressPct = total ? Math.round((completed / total) * 100) : 0;

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  }

  async function handleAnalyze() {
    if (!canAnalyze) return;
    setAnalyzing(true); setCompleted(0); setHighRiskCount(0); setTotal(runList.length); setSavedAll(false); setStorageWarning('');
    const collected = []; let done = 0; let high = 0;
    try {
      for (let i = 0; i < runList.length; i += CHUNK_SIZE) {
        const chunk = runList.slice(i, i + CHUNK_SIZE);
        const chunkResults = await Promise.all(chunk.map(indicator => analyzeBulkIndicator(indicator, enrichIndicator)));
        collected.push(...chunkResults);
        done += chunkResults.length;
        high += chunkResults.filter(r => ["CRÍTICO", "ALTO"].includes(r.risk?.level)).length;
        setCompleted(done); setHighRiskCount(high); setResults([...collected]);
      }
      try { localStorage.setItem(BULK_STORAGE_KEY, JSON.stringify(collected)); }
      catch { setStorageWarning('Os resultados estão visíveis, mas não foi possível preservá-los neste navegador. Exporte um backup antes de sair.'); }
      setPage(1);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSaveAll() {
    try {
      const updated = await saveInvestigations(filtered.map(r => ({ ...r, savedAt: new Date().toISOString() })));
      setHistory?.(updated);
      setStorageWarning('');
      setSavedAll(true);
      setTimeout(() => setSavedAll(false), 2000);
    } catch { setStorageWarning('Não foi possível salvar os resultados no histórico local. Exporte um backup antes de sair.'); }
  }

  function exportJSON() { exportBlob(JSON.stringify(filtered, null, 2), "application/json", `bulk-enrichment-${Date.now()}.json`); }

  function exportCSV() {
    const rows = [
      ["INDICATOR", "TYPE", "RISK SCORE", "RISK LEVEL", "ACTION", "TIMESTAMP"],
      ...filtered.map(r => [r.indicator, r.type, r.risk?.score ?? "", r.query_status === 'error' || r.error ? 'ERRO_DE_CONSULTA' : r.risk?.level || "INCONCLUSIVO", r.recommendation || "—", r.timestamp]),
    ];
    exportBlob(rows.map(row => row.map(csvEscape).join(",")).join("\n"), "text/csv", `bulk-enrichment-${Date.now()}.csv`);
  }

  return (
    <>
      <PageHeader
        title={"Análise em lote"}
        subtitle={"Consulte até dez indicadores por vez, filtre resultados e exporte as evidências."}
      />

      {/* Input Card */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <label htmlFor="bulk-indicators" style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>Indicadores</label>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Cole um IOC por linha. Linhas vazias e duplicadas são removidas.</div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
            borderRadius: 20, background: `${counterColor}18`, border: `1px solid ${counterColor}44`,
            fontSize: 12, fontWeight: 600, color: counterColor, fontFamily: "monospace", flexShrink: 0
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: counterColor, display: "inline-block" }} />
            {parsedIndicators.length} / {BULK_LIMIT}
          </div>
        </div>

        <textarea id="bulk-indicators"
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          placeholder={"8.8.8.8\n185.220.101.1\nexample.com\nhttps://example.com/path\n44d88612fea8a8f36de82e1278abb02f"}
          style={{
            width: "100%", height: 180, resize: "vertical", padding: 14,
            background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 10,
            color: C.text, outline: "none", fontSize: 13,
            fontFamily: "'SFMono-Regular', Consolas, monospace",
            lineHeight: 1.7, boxSizing: "border-box", transition: "border-color 0.2s"
          }}
          onFocus={e => e.target.style.borderColor = C.accent}
          onBlur={e => e.target.style.borderColor = C.border}
        />

        {overLimit && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: C.orangeBg, border: `1px solid ${C.orange}55`, borderRadius: 8, color: C.orange, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="alert" size={14} color={C.orange} />
            O limite é de {BULK_LIMIT} IOCs por lote. Remova os excedentes para iniciar a análise.
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
          <Button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            title={runList.length === 0 ? "Informe ao menos um indicador" : overLimit ? `Limite de ${BULK_LIMIT} indicadores` : undefined}
            icon={analyzing ? <Spinner /> : <Icon name="search" size={14} color="#fff" />}
          >
            {analyzing ? `Analisando ${completed}/${total}...` : `Analisar ${runList.length} indicador${runList.length !== 1 ? "es" : ""}`}
          </Button>
          <span style={{ fontSize: 12, color: C.textMuted }}>
            {parsedIndicators.length > 0
              ? `${parsedIndicators.length} indicador${parsedIndicators.length === 1 ? "" : "es"} único${parsedIndicators.length === 1 ? "" : "s"}`
              : "Cole os indicadores acima para começar"}
          </span>
        </div>

        {analyzing && (
          <div style={{ marginTop: 16, padding: "14px 16px", background: "rgba(59,130,246,0.06)", border: `1px solid ${C.accent}33`, borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
              <span style={{ color: C.textMuted }}>
                Analisando <strong style={{ color: C.text }}>{completed}</strong> de <strong style={{ color: C.text }}>{total}</strong>
                {highRiskCount > 0 && <span style={{ color: C.red, marginLeft: 8 }}>⚠ {highRiskCount} com risco alto</span>}
              </span>
              <span style={{ color: C.accentLight, fontWeight: 700 }}>{progressPct}%</span>
            </div>
            <div style={{ height: 6, background: C.border, borderRadius: 6, overflow: "hidden" }}>
              <div style={{
                width: `${progressPct}%`, height: "100%", borderRadius: 6,
                background: C.green,
                transition: "width 0.3s ease", boxShadow: `0 0 8px ${C.accent}88`
              }} />
            </div>
          </div>
        )}
        {storageWarning && <p role="alert" style={{ color: C.yellow, marginBottom: 0 }}>{storageWarning}</p>}
      </Card>

      {/* Summary cards (only after first analysis) */}
      <SummaryCards results={results} />

      {/* Results table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <FilterPill label="Tipo" value={filterType} options={["All", "ip", "domain", "url", "hash"]} onChange={v => { setFilterType(v); setPage(1); }} />
            <FilterPill label="Risco" value={filterLevel} options={["All", "CRÍTICO", "ALTO", "MÉDIO", "BAIXO", "INCONCLUSIVO"]} onChange={v => { setFilterLevel(v); setPage(1); }} />
            <FilterPill label="Ação" value={filterAction} options={["All", "BLOQUEAR", "INVESTIGAR", "MONITORAR", "IGNORAR"]} onChange={v => { setFilterAction(v); setPage(1); }} />
            {(search || filterType !== "All" || filterLevel !== "All" || filterAction !== "All") && (
              <button onClick={() => { setSearch(""); setFilterType("All"); setFilterLevel("All"); setFilterAction("All"); setPage(1); }}
                style={{ background: "transparent", border: "none", color: C.accentLight, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
                ✕ Limpar filtros
              </button>
            )}
          </div>
          <div style={{ position: "relative", width: 240 }}>
            <Icon name="search" size={14} color={C.textDim} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <Input aria-label="Pesquisar resultados" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Pesquisar resultados..." style={{ width: "100%", paddingLeft: 34, paddingTop: 8, paddingBottom: 8 }} />
          </div>
        </div>

        {results.length === 0 ? (
          <div style={{ padding: "80px 40px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(59,130,246,0.08)", border: `1px solid ${C.accent}33`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icon name="layers" size={28} color={C.accent} />
            </div>
            <div style={{ fontSize: 16, color: C.text, fontWeight: 600, marginBottom: 8 }}>Nenhum indicador analisado</div>
            <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 340, margin: "0 auto", lineHeight: 1.6 }}>
              Cole indicadores acima e selecione <strong style={{ color: C.accentLight }}>Analisar</strong> para preencher a tabela.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Nenhum resultado corresponde aos filtros.</div>
        ) : (
          <>
            <div className="table-scroll"><table aria-label="Resultados da análise em lote" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bgSidebar, borderBottom: `1px solid ${C.border}` }}>
                  <ColHeader label="INDICADOR" col="indicator" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} style={{ paddingLeft: 20 }} />
                  <ColHeader label="TIPO" col="type" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <ColHeader label="PONTUAÇÃO" col="score" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <ColHeader label="RISCO" col="level" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <ColHeader label="AÇÃO" col="recommendation" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <ColHeader label="DATA" col="timestamp" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <th style={{ ...thSt, textAlign: "right", paddingRight: 20 }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r, i) => (
                  <tr key={`${r.indicator}-${r.timestamp}-${i}`}
                    style={{ borderBottom: `1px solid ${C.borderSubtle}`, transition: "background 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bgCardHover}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ ...tdSt, paddingLeft: 20 }}>
                      <div style={{ color: C.text, fontWeight: 500 }}>{r.indicator}</div>
                      {r.mitre?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                          {r.mitre.slice(0, 3).map(t => (
                            <span key={t.id} style={{ fontSize: 10, fontWeight: 600, fontFamily: 'monospace', color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', padding: '1px 6px', borderRadius: 4 }}>
                              {t.id}
                            </span>
                          ))}
                          {r.mitre.length > 3 && <span style={{ fontSize: 10, color: C.textMuted }}>+{r.mitre.length - 3}</span>}
                        </div>
                      )}
                      {r.error && <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>⚠ {r.error}</div>}
                    </td>
                    <td style={tdSt}><Badge color={C.accentLight} bg="rgba(59,130,246,0.1)">{r.type}</Badge></td>
                    <td style={tdSt}><ScorePill score={r.risk?.score} level={r.risk?.level} /></td>
                    <td style={tdSt}><Badge color={riskColor(r.risk?.level)} bg={riskBg(r.risk?.level)}>{r.query_status === 'error' || r.error ? 'ERRO DE CONSULTA' : r.risk?.level || "INCONCLUSIVO"}</Badge></td>
                    <td style={tdSt}><span style={{ color: actionColor(r.recommendation), fontWeight: 600 }}>{r.recommendation || "—"}</span></td>
                    <td style={{ ...tdSt, color: C.textMuted, fontSize: 12 }}>{fmtDate(r.timestamp)}</td>
                    <td style={{ ...tdSt, paddingRight: 16 }}>
                      <RowActions row={r} onSaved={updated => setHistory?.(updated)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>

            {/* Pagination */}
            <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${C.border}`, flexWrap: "wrap", gap: 12 }}>
              <span style={{ fontSize: 12, color: C.textMuted }}>
                Exibindo {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length} resultados
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <PageBtn label="Página anterior" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</PageBtn>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  const n = i + 1;
                  return <PageBtn key={n} label={`Página ${n}`} active={page === n} onClick={() => setPage(n)}>{n}</PageBtn>;
                })}
                <PageBtn label="Próxima página" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</PageBtn>
              </div>
            </div>

            {/* Export + Save All row */}
            <div style={{
              padding: "14px 20px", borderTop: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(0,0,0,0.15)"
            }}>
              <Button variant="secondary" onClick={exportCSV} icon={<Icon name="download" size={13} />} style={{ fontSize: 12, padding: "7px 14px" }}>
                Exportar CSV
              </Button>
              <Button variant="secondary" onClick={exportJSON} icon={<Icon name="download" size={13} />} style={{ fontSize: 12, padding: "7px 14px" }}>
                Exportar JSON
              </Button>
              <div style={{ flex: 1 }} />
              <Button
                variant="secondary"
                onClick={handleSaveAll}
                icon={<Icon name={savedAll ? "check" : "bookmark"} size={13} color={savedAll ? C.green : C.accentLight} />}
                style={{
                  fontSize: 12, padding: "7px 14px",
                  borderColor: savedAll ? C.green : undefined,
                  background: savedAll ? C.greenBg : undefined,
                  color: savedAll ? C.green : C.accentLight
                }}
              >
                {savedAll ? "Salvo no histórico" : `Salvar no histórico (${filtered.length})`}
              </Button>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

const thSt = { textAlign: "left", padding: "10px 8px", color: C.textMuted, fontWeight: 500, fontSize: 11, letterSpacing: 0.5 };
const tdSt = { padding: "12px 8px", verticalAlign: "middle" };

function Spinner() {
  return <span style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />;
}

function ScorePill({ score, level }) {
  const cfg = RISK_CFG[level] || RISK_CFG.INCONCLUSIVO;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 40, height: 24, borderRadius: 6, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44`, fontSize: 12, fontWeight: 700 }}>
      {score ?? '—'}
    </span>
  );
}

function ColHeader({ label, col, sortBy, sortDir, onSort, style = {} }) {
  return (
    <th scope="col" aria-sort={sortBy === col ? sortDir === 'asc' ? 'ascending' : 'descending' : 'none'} style={{ ...thSt, ...style }}>
      <button type="button" onClick={() => onSort(col)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: 0, background: 'transparent', border: 0, color: 'inherit', fontSize: 'inherit', cursor: 'pointer' }}>
        {label}
        <Icon name={sortBy === col && sortDir === "asc" ? "arrowUp" : "arrowDown"} size={10} color={sortBy === col ? C.accentLight : C.textDim} />
      </button>
    </th>
  );
}

function FilterPill({ label, value, options, onChange }) {
  return (
    <select aria-label={`Filtrar por ${label.toLowerCase()}`} value={value} onChange={e => onChange(e.target.value)} style={{
      padding: "7px 28px 7px 12px",
      background: value !== "All" ? "rgba(59,130,246,0.12)" : C.bgInput,
      border: `1px solid ${value !== "All" ? C.accent : C.border}`,
      borderRadius: 8, color: value !== "All" ? C.accentLight : C.textMuted,
      fontSize: 12, fontFamily: FONT, cursor: "pointer", outline: "none", appearance: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238896ad' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
    }}>
      {options.map(o => <option key={o} value={o}>{o === "All" ? `${label}: todos` : o}</option>)}
    </select>
  );
}

function PageBtn({ children, label, onClick, disabled, active }) {
  return (
    <button aria-label={label} aria-current={active ? 'page' : undefined} onClick={onClick} disabled={disabled} style={{
      width: 32, height: 32, borderRadius: 6, border: `1px solid ${active ? C.accent : C.border}`,
      background: active ? "rgba(59,130,246,0.15)" : "transparent",
      color: active ? C.accentLight : disabled ? C.textDim : C.text,
      fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT
    }}>{children}</button>
  );
}
