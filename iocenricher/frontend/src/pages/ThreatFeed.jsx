import { useEffect, useState, useCallback } from "react";
import { C, FONT } from "../lib/theme";
import Icon from "../components/Icon";
import { Card, Badge, Button, Input, PageHeader } from "../components/UI";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const PER_PAGE = 20;

function countryFlag(code) {
  if (!code || code.length !== 2) return "🌐";
  try {
    return code.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
  } catch { return "🌐"; }
}

const MALWARE_COLORS = {
  Emotet:      { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  QakBot:      { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  TrickBot:    { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  Dridex:      { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  BazarLoader: { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  IcedID:      { color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
};
function malwareStyle(name) {
  return MALWARE_COLORS[name] || { color: "#f87171", bg: "rgba(248,113,113,0.1)" };
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

export default function ThreatFeed() {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [items, setItems] = useState([]);
  const [listError, setListError] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [malwareFilter, setMalwareFilter] = useState("All");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/threatfeed/stats`)
      .then(r => { if (!r.ok || !(r.headers.get("content-type") || "").includes("application/json")) throw new Error("stats failed"); return r.json(); })
      .then(d => {
        if (d && Number.isFinite(d.total) && d.total >= 0) { setStats(d); setLastUpdated(d.lastUpdated); }
        else setStatsError(true);
      })
      .catch(() => setStatsError(true))
      .finally(() => setLoadingStats(false));
  }, []);

  const fetchList = useCallback(() => {
    setLoadingList(true);
    setListError(false);
    const params = new URLSearchParams({
      page,
      perPage: PER_PAGE,
      search,
      malware: malwareFilter === "All" ? "" : malwareFilter
    });
    fetch(`${API_BASE}/threatfeed/list?${params}`)
      .then(r => { if (!r.ok || !(r.headers.get("content-type") || "").includes("application/json")) throw new Error("list failed"); return r.json(); })
      .then(d => {
        setItems(Array.isArray(d.items) ? d.items : []);
        setTotal(Number.isFinite(d.total) ? d.total : 0);
        setTotalPages(d.totalPages || 1);
      })
      .catch(() => { setItems([]); setTotal(0); setListError(true); })
      .finally(() => setLoadingList(false));
  }, [page, search, malwareFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  const malwareOptions = stats?.topMalware?.map(m => m.name) || [];
  const topMalware = stats?.topMalware || [];
  const topCountries = stats?.topCountries || [];

  return (
    <>
      <PageHeader
        title="Threat Feed"
        subtitle="Indicadores de servidores C2 publicados pelo Feodo Tracker (abuse.ch)."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {lastUpdated && (
              <span style={{ fontSize: 12, color: C.textMuted }}>
                Última atualização: {new Date(lastUpdated).toLocaleTimeString('pt-BR')}
              </span>
            )}
            <Button variant="secondary" onClick={fetchList} icon={<Icon name="refresh" size={13} />} style={{ fontSize: 12, padding: "7px 14px" }}>
              Atualizar
            </Button>
          </div>
        }
      />

      {/* Stats row */}
      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard icon="alert" label="IPs C2 registrados" value={loadingStats ? '...' : stats ? stats.total.toLocaleString('pt-BR') : '—'} color={C.red} bg={C.redBg} />
        <StatCard icon="layers" label="Famílias de malware" value={loadingStats ? '...' : stats ? topMalware.length : '—'} color={C.orange} bg={C.orangeBg} />
        <StatCard icon="globe" label="Países" value={loadingStats ? '...' : stats ? topCountries.length : '—'} color={C.accentLight} bg="rgba(59,130,246,0.1)" />
        <StatCard icon="check" label="Fonte" value="Feodo Tracker" color={C.green} bg={C.greenBg} />
      </div>

      {/* Top malware + countries — only if data loaded */}
      {!loadingStats && !statsError && topMalware.length > 0 && (
        <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0, marginBottom: 14 }}>Famílias de malware mais frequentes</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topMalware.map(m => {
                const style = malwareStyle(m.name);
                const pct = stats.total > 0 ? Math.round((m.count / stats.total) * 100) : 0;
                return (
                  <div key={m.name} style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: style.color, background: style.bg, padding: "2px 8px", borderRadius: 5, display: "inline-block", width: "fit-content" }}>
                      {m.name}
                    </span>
                    <div style={{ height: 7, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: style.color, borderRadius: 4, transition: "width 0.8s ease" }} />
                    </div>
                    <span style={{ fontSize: 12, color: C.textMuted, textAlign: "right" }}>{m.count.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0, marginBottom: 14 }}>Países de origem mais frequentes</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topCountries.map(c => {
                const pct = stats.total > 0 ? Math.round((c.count / stats.total) * 100) : 0;
                return (
                  <div key={c.country} style={{ display: "grid", gridTemplateColumns: "120px 1fr 60px", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, color: C.text }}>
                      {countryFlag(c.country)} {c.country}
                    </span>
                    <div style={{ height: 7, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: C.accent, borderRadius: 4, transition: "width 0.8s ease" }} />
                    </div>
                    <span style={{ fontSize: 12, color: C.textMuted, textAlign: "right" }}>{c.count.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Error state */}
      {statsError && (
        <div style={{ marginBottom: 20, padding: "14px 18px", background: C.orangeBg, border: `1px solid ${C.orange}55`, borderRadius: 10, fontSize: 13, color: C.orange, display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="alert" size={16} color={C.orange} />
          As estatísticas do feed estão indisponíveis. A listagem pode ser consultada separadamente.
        </div>
      )}

      {/* Table card */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {/* Search + filters — no <form> tag, use onKeyDown */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flex: 1, minWidth: 280 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Icon name="search" size={14} color={C.textDim} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <Input
                aria-label="Pesquisar IP, família de malware ou país"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Pesquisar IP, família de malware ou país..."
                style={{ width: "100%", paddingLeft: 34 }}
              />
            </div>
            <Button onClick={handleSearch} icon={<Icon name="search" size={14} color="#fff" />}>Buscar</Button>
          </div>

          <select
            aria-label="Filtrar família de malware"
            value={malwareFilter}
            onChange={e => { setMalwareFilter(e.target.value); setPage(1); }}
            style={{
              padding: "9px 28px 9px 12px",
              background: malwareFilter !== "All" ? "rgba(248,113,113,0.12)" : C.bgInput,
              border: `1px solid ${malwareFilter !== "All" ? C.red : C.border}`,
              borderRadius: 8, color: malwareFilter !== "All" ? C.red : C.textMuted,
              fontSize: 12, fontFamily: FONT, cursor: "pointer", outline: "none", appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238896ad' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
            }}
          >
            <option value="All">Todas as famílias</option>
            {malwareOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {(search || malwareFilter !== "All") && (
            <button onClick={() => { setSearch(""); setSearchInput(""); setMalwareFilter("All"); setPage(1); }}
              style={{ background: "transparent", border: "none", color: C.accentLight, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
              ✕ Limpar
            </button>
          )}

          <span style={{ fontSize: 12, color: C.textMuted, marginLeft: "auto" }}>
            {total.toLocaleString()} IPs
          </span>
        </div>

        {/* Table body */}
        {loadingList ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${C.border}`, borderTopColor: C.accent, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 13, color: C.textMuted }}>Carregando indicadores...</div>
          </div>
        ) : listError ? (
          <div role="alert" className="empty">Não foi possível carregar a listagem do feed. Tente atualizar.</div>
        ) : items.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <Icon name="search" size={32} color={C.textDim} />
            <div style={{ marginTop: 12, fontSize: 14, color: C.text, fontWeight: 600 }}>Nenhum resultado encontrado</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Tente outro IP ou família de malware.</div>
          </div>
        ) : (
          <>
            <div className="table-wrap"><table aria-label="Indicadores do Feodo Tracker" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bgSidebar, borderBottom: `1px solid ${C.border}` }}>
                  {["ENDEREÇO IP", "FAMÍLIA DE MALWARE", "PORTA", "PAÍS", "STATUS", "PRIMEIRA OBSERVAÇÃO"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", color: C.textMuted, fontWeight: 500, fontSize: 11, letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const ms = malwareStyle(item.malware);
                  const isMatch = search.match(/^\d{1,3}(\.\d{1,3}){3}$/) && item.ip === search;
                  return (
                    <tr key={`${item.ip}-${i}`}
                      style={{ borderBottom: `1px solid ${C.borderSubtle}`, background: isMatch ? "rgba(248,113,113,0.06)" : "transparent", transition: "background 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = isMatch ? "rgba(248,113,113,0.1)" : C.bgCardHover}
                      onMouseLeave={e => e.currentTarget.style.background = isMatch ? "rgba(248,113,113,0.06)" : "transparent"}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 600, color: isMatch ? C.red : C.text, fontSize: 13 }}>
                          {item.ip}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ms.color, background: ms.bg, padding: "3px 10px", borderRadius: 6 }}>
                          {item.malware}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: C.textMuted, fontFamily: "monospace" }}>{item.port || "—"}</td>
                      <td style={{ padding: "12px 16px", color: C.text }}>{item.country ? `${countryFlag(item.country)} ${item.country}` : "—"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <Badge
                          color={item.status === "online" ? C.red : C.textMuted}
                          bg={item.status === "online" ? C.redBg : "rgba(88,107,133,0.1)"}
                        >
                          {item.status || "desconhecido"}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 16px", color: C.textMuted, fontSize: 12 }}>{item.first_seen || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>

            <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: C.textMuted }}>
                Exibindo {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, total)} de {total.toLocaleString('pt-BR')} resultados
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <PgBtn disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Anterior</PgBtn>
                <span style={{ display: "flex", alignItems: "center", padding: "0 12px", fontSize: 12, color: C.textMuted }}>
                  Página {page} de {totalPages}
                </span>
                <PgBtn disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima ›</PgBtn>
              </div>
            </div>
          </>
        )}
      </Card>

      <div style={{ marginTop: 12, padding: "10px 16px", background: "rgba(59,130,246,0.05)", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="info" size={14} color={C.textDim} />
        Dados fornecidos pelo{" "}
        <a href="https://feodotracker.abuse.ch" target="_blank" rel="noopener noreferrer" style={{ color: C.accentLight }}>
          Feodo Tracker
        </a>{" "}
        da abuse.ch, também responsável pelo URLhaus e MalwareBazaar.
      </div>
    </>
  );
}

function PgBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "7px 14px", borderRadius: 6, border: `1px solid ${C.border}`,
      background: "transparent", color: disabled ? C.textDim : C.text,
      fontSize: 12, cursor: disabled ? "not-allowed" : "pointer", fontFamily: FONT
    }}>{children}</button>
  );
}
