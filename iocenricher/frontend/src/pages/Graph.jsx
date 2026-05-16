import { useState, useRef, useEffect, useCallback } from "react";
import { C, FONT } from "../lib/theme";
import Icon from "../components/Icon";
import { Card, Button, Input, Badge } from "../components/UI";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

// ─── Node config by type ─────────────────────────────────────────────────────
const NODE_CFG = {
  ip:        { color: "#3b82f6", bg: "rgba(59,130,246,0.15)",  size: 22, label: "IP" },
  domain:    { color: "#a78bfa", bg: "rgba(167,139,250,0.15)", size: 20, label: "Domain" },
  hash:      { color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  size: 20, label: "Hash" },
  url:       { color: "#10b981", bg: "rgba(16,185,129,0.15)",  size: 20, label: "URL" },
  asn:       { color: "#60a5fa", bg: "rgba(96,165,250,0.15)",  size: 17, label: "ASN" },
  malware:   { color: "#f87171", bg: "rgba(248,113,113,0.15)", size: 19, label: "Malware" },
  mitre:     { color: "#fb923c", bg: "rgba(251,146,60,0.15)",  size: 16, label: "MITRE" },
  country:   { color: "#94a3b8", bg: "rgba(148,163,184,0.15)", size: 15, label: "Country" },
  threat:    { color: "#f87171", bg: "rgba(248,113,113,0.12)", size: 16, label: "Threat" },
  subnet:    { color: "#60a5fa", bg: "rgba(96,165,250,0.1)",   size: 14, label: "Subnet" },
  tag:       { color: "#8896ad", bg: "rgba(136,150,173,0.12)", size: 13, label: "Tag" },
  detection: { color: "#f87171", bg: "rgba(248,113,113,0.12)", size: 16, label: "Detection" },
  registrar: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", size: 14, label: "Registrar" },
  port:      { color: "#facc15", bg: "rgba(250,204,21,0.1)",   size: 13, label: "Port" },
  file:      { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",   size: 14, label: "File" },
};

const RISK_COLORS = {
  "CRÍTICO": "#f87171",
  "ALTO":    "#f59e0b",
  "MÉDIO":   "#facc15",
  "BAIXO":   "#10b981",
};

function getNodeColor(node) {
  if (node.isMain && node.risk) return RISK_COLORS[node.risk] || NODE_CFG[node.type]?.color || "#8896ad";
  if (node.type === "malware" || node.type === "threat" || node.type === "detection") return "#f87171";
  return NODE_CFG[node.type]?.color || "#8896ad";
}

function getNodeSize(node) {
  if (node.isMain) return 28;
  return NODE_CFG[node.type]?.size || 14;
}

// ─── Force simulation ─────────────────────────────────────────────────────────
function useForceSimulation(nodes, edges, width, height) {
  const simRef = useRef({ nodes: [], edges: [], running: false, raf: null });
  const [positions, setPositions] = useState({});

  useEffect(() => {
    if (!nodes.length) return;

    // Init positions radially
    const cx = width / 2, cy = height / 2;
    const mainNode = nodes.find(n => n.isMain) || nodes[0];
    const others = nodes.filter(n => !n.isMain);
    const angleStep = (2 * Math.PI) / Math.max(others.length, 1);

    const simNodes = nodes.map((n, i) => {
      const isMain = n.isMain;
      const idx = others.indexOf(n);
      const angle = idx >= 0 ? idx * angleStep : 0;
      const radius = isMain ? 0 : (80 + getNodeSize(n) * 6);
      return {
        id: n.id,
        x: cx + (isMain ? 0 : Math.cos(angle) * radius * (1 + Math.floor(idx / 8) * 0.6)),
        y: cy + (isMain ? 0 : Math.sin(angle) * radius * (1 + Math.floor(idx / 8) * 0.6)),
        vx: 0, vy: 0,
        isMain,
        size: getNodeSize(n),
        pinned: false,
      };
    });

    const edgeMap = edges.map(e => ({
      source: e.source,
      target: e.target,
    }));

    simRef.current = { nodes: simNodes, edges: edgeMap, running: true, raf: null };

    let iter = 0;
    function tick() {
      const sim = simRef.current;
      if (!sim.running) return;
      const sn = sim.nodes;
      const alpha = Math.max(0.01, 0.6 * Math.pow(0.96, iter));
      iter++;

      // Repulsion
      for (let i = 0; i < sn.length; i++) {
        for (let j = i + 1; j < sn.length; j++) {
          const dx = sn[j].x - sn[i].x;
          const dy = sn[j].y - sn[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = (sn[i].size + sn[j].size) * 3.5;
          if (dist < minDist * 2.5) {
            const force = (alpha * 280) / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            if (!sn[i].pinned) { sn[i].vx -= fx; sn[i].vy -= fy; }
            if (!sn[j].pinned) { sn[j].vx += fx; sn[j].vy += fy; }
          }
        }
      }

      // Spring attraction along edges
      for (const e of sim.edges) {
        const a = sn.find(n => n.id === e.source);
        const b = sn.find(n => n.id === e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const restLen = (a.size + b.size) * 4.5;
        const force = (dist - restLen) * alpha * 0.12;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!a.pinned) { a.vx += fx; a.vy += fy; }
        if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
      }

      // Center gravity
      for (const n of sn) {
        if (n.pinned) continue;
        n.vx += (cx - n.x) * alpha * 0.012;
        n.vy += (cy - n.y) * alpha * 0.012;
      }

      // Integrate + damping
      const pos = {};
      for (const n of sn) {
        if (!n.pinned) {
          n.vx *= 0.72;
          n.vy *= 0.72;
          n.x += n.vx;
          n.y += n.vy;
          // Bounds
          n.x = Math.max(40, Math.min(width - 40, n.x));
          n.y = Math.max(40, Math.min(height - 40, n.y));
        }
        pos[n.id] = { x: n.x, y: n.y };
      }

      setPositions({ ...pos });
      if (iter < 280) {
        sim.raf = requestAnimationFrame(tick);
      }
    }

    tick();
    return () => {
      simRef.current.running = false;
      if (simRef.current.raf) cancelAnimationFrame(simRef.current.raf);
    };
  }, [nodes.length, width, height]);

  const pinNode = useCallback((id, x, y) => {
    const n = simRef.current.nodes.find(n => n.id === id);
    if (n) { n.x = x; n.y = y; n.pinned = true; n.vx = 0; n.vy = 0; }
    setPositions(p => ({ ...p, [id]: { x, y } }));
  }, []);

  const unpinNode = useCallback((id) => {
    const n = simRef.current.nodes.find(n => n.id === id);
    if (n) n.pinned = false;
  }, []);

  return { positions, pinNode, unpinNode };
}

// ─── Main Graph component ─────────────────────────────────────────────────────
export default function Graph() {
  const [indicator, setIndicator] = useState("");
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(null); // { nodeId, startX, startY }
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const svgRef = useRef(null);

  const W = 900, H = 600;
  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];

  const { positions, pinNode, unpinNode } = useForceSimulation(nodes, edges, W, H);

  async function handleInvestigate() {
    if (!indicator.trim() || loading) return;
    setLoading(true);
    setError(null);
    setGraphData(null);
    setSelected(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setAiSummary(null);
    try {
      const res = await fetch(`${API_BASE}/graph?indicator=${encodeURIComponent(indicator.trim())}`);
      if (!res.ok) throw new Error("Graph request failed");
      if (!(res.headers.get("content-type") || "").includes("application/json"))
        throw new Error("Backend indisponível");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGraphData(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateAiSummary() {
    if (!graphData || aiLoading) return;
    setAiLoading(true);
    setAiSummary(null);
    try {
      const res = await fetch(`${API_BASE}/graph/ai-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphData })
      });
      if (!res.ok) throw new Error('AI summary failed');
      if (!(res.headers.get("content-type") || "").includes("application/json"))
        throw new Error("Backend indisponível");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiSummary(data);
    } catch (e) {
      setAiSummary({ error: e.message });
    } finally {
      setAiLoading(false);
    }
  }

  // Mouse wheel zoom
  function handleWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.9;
    setZoom(z => Math.min(3, Math.max(0.3, z * factor)));
  }

  // SVG pan
  function handleSvgMouseDown(e) {
    if (e.target === svgRef.current || e.target.tagName === "svg") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }
  function handleSvgMouseMove(e) {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
    if (dragging) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      pinNode(dragging, x, y);
    }
  }
  function handleSvgMouseUp() {
    setIsPanning(false);
    if (dragging) unpinNode(dragging);
    setDragging(null);
  }

  function handleNodeMouseDown(e, nodeId) {
    e.stopPropagation();
    setDragging(nodeId);
    setSelected(nodeId);
  }

  const selectedNode = selected ? nodes.find(n => n.id === selected) : null;

  // Examples
  const examples = ["185.220.101.1", "8.8.8.8", "emotet.de"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Investigation Graph</h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0" }}>Visual relationship map between indicators, infrastructure, malware families and ATT&CK techniques.</p>
        </div>
      </div>

      {/* Search */}
      <Card style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Icon name="search" size={15} color={C.textDim} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <Input
              value={indicator}
              onChange={e => setIndicator(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleInvestigate()}
              placeholder="Enter IP, domain, hash or URL to investigate..."
              style={{ paddingLeft: 40, fontSize: 14, height: 44 }}
            />
          </div>
          <Button
            onClick={handleInvestigate}
            disabled={loading || !indicator.trim()}
            icon={loading
              ? <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
              : <Icon name="target" size={15} color="#fff" />}
            style={{ height: 44, padding: "0 24px", fontSize: 14 }}
          >
            {loading ? "Investigating..." : "Investigate"}
          </Button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>Try:</span>
          {examples.map(ex => (
            <button key={ex} onClick={() => { setIndicator(ex); }} style={{
              padding: "4px 12px", background: C.bgInput, border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.textMuted, fontSize: 12, cursor: "pointer", fontFamily: FONT
            }}>{ex}</button>
          ))}
        </div>
      </Card>

      {error && (
        <div style={{ padding: "12px 16px", background: C.redBg, border: `1px solid ${C.red}44`, borderRadius: 10, color: C.red, fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Graph + Sidebar */}
      {(graphData || loading) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
          {/* SVG Canvas */}
          <Card style={{ padding: 0, overflow: "hidden", position: "relative" }}>
            {/* Controls */}
            <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { icon: "plus", action: () => setZoom(z => Math.min(3, z * 1.2)) },
                { icon: "minus", action: () => setZoom(z => Math.max(0.3, z * 0.8)) },
                { icon: "refresh", action: () => { setZoom(1); setPan({ x: 0, y: 0 }); } },
              ].map(({ icon, action }) => (
                <button key={icon} onClick={action} style={{
                  width: 32, height: 32, borderRadius: 8, background: C.bgCard,
                  border: `1px solid ${C.border}`, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Icon name={icon} size={14} color={C.textMuted} />
                </button>
              ))}
            </div>

            {/* Node count badge */}
            {graphData && (
              <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10, display: "flex", gap: 6 }}>
                <Badge color={C.accentLight} bg="rgba(59,130,246,0.12)">{nodes.length} nodes</Badge>
                <Badge color={C.textMuted} bg="rgba(136,150,173,0.1)">{edges.length} edges</Badge>
              </div>
            )}

            <svg
              ref={svgRef}
              width="100%"
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              style={{ display: "block", background: C.bgCard, cursor: isPanning ? "grabbing" : dragging ? "grabbing" : "grab" }}
              onMouseDown={handleSvgMouseDown}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
              onMouseLeave={handleSvgMouseUp}
              onWheel={handleWheel}
            >
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill={C.textDim} />
                </marker>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {loading && (
                <text x={W / 2} y={H / 2} textAnchor="middle" fill={C.textMuted} fontSize="14" fontFamily={FONT}>
                  Building investigation graph...
                </text>
              )}

              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                {/* Edges */}
                {edges.map(edge => {
                  const sp = positions[edge.source];
                  const tp = positions[edge.target];
                  if (!sp || !tp) return null;
                  const dx = tp.x - sp.x, dy = tp.y - sp.y;
                  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                  const srcNode = nodes.find(n => n.id === edge.source);
                  const tgtNode = nodes.find(n => n.id === edge.target);
                  const srcR = getNodeSize(srcNode || {});
                  const tgtR = getNodeSize(tgtNode || {}) + 8;
                  const x1 = sp.x + (dx / dist) * srcR;
                  const y1 = sp.y + (dy / dist) * srcR;
                  const x2 = tp.x - (dx / dist) * tgtR;
                  const y2 = tp.y - (dy / dist) * tgtR;
                  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                  const isSelected = selected === edge.source || selected === edge.target;
                  return (
                    <g key={edge.id}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={isSelected ? C.accentLight : C.border}
                        strokeWidth={isSelected ? 1.5 : 1}
                        strokeDasharray={isSelected ? "none" : "4 3"}
                        markerEnd="url(#arrow)"
                        opacity={isSelected ? 1 : 0.6}
                      />
                      {isSelected && (
                        <text x={mx} y={my - 5} textAnchor="middle"
                          fill={C.textDim} fontSize="9" fontFamily={FONT}
                        >{edge.label}</text>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {nodes.map(node => {
                  const pos = positions[node.id];
                  if (!pos) return null;
                  const color = getNodeColor(node);
                  const size = getNodeSize(node);
                  const isSelected = selected === node.id;
                  return (
                    <g key={node.id}
                      transform={`translate(${pos.x},${pos.y})`}
                      style={{ cursor: "pointer" }}
                      onMouseDown={e => handleNodeMouseDown(e, node.id)}
                    >
                      {/* Glow ring for selected */}
                      {isSelected && (
                        <circle r={size + 7} fill="none" stroke={color} strokeWidth={2} opacity={0.4} filter="url(#glow)" />
                      )}
                      {/* Node pulse for main */}
                      {node.isMain && (
                        <circle r={size + 10} fill={color} opacity={0.08}>
                          <animate attributeName="r" values={`${size + 8};${size + 16};${size + 8}`} dur="2.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.1;0.03;0.1" dur="2.5s" repeatCount="indefinite" />
                        </circle>
                      )}
                      {/* Node circle */}
                      <circle
                        r={size}
                        fill={color}
                        fillOpacity={isSelected ? 0.25 : 0.15}
                        stroke={color}
                        strokeWidth={node.isMain ? 2.5 : isSelected ? 2 : 1.5}
                      />
                      {/* Icon letter */}
                      <text textAnchor="middle" dominantBaseline="middle"
                        fill={color} fontSize={size * 0.65} fontWeight="700" fontFamily="monospace"
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        {node.type === "mitre" ? node.label.replace("T", "") :
                          node.type === "ip" ? "IP" :
                          node.type === "domain" ? "D" :
                          node.type === "hash" ? "#" :
                          node.type === "url" ? "U" :
                          node.type === "asn" ? "AS" :
                          node.type === "malware" ? "M" :
                          node.type === "country" ? "C" :
                          node.type === "detection" ? "!" :
                          node.type === "port" ? "P" :
                          node.label.charAt(0).toUpperCase()}
                      </text>
                      {/* Label below */}
                      <text textAnchor="middle" y={size + 13}
                        fill={isSelected ? color : C.textMuted}
                        fontSize={node.isMain ? 11 : 9}
                        fontWeight={node.isMain ? "600" : "400"}
                        fontFamily={FONT}
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Legend */}
            <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 14, flexWrap: "wrap" }}>
              {Object.entries(NODE_CFG).filter(([k]) => ["ip","domain","hash","malware","mitre","asn","country"].includes(k)).map(([type, cfg]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.color, border: `1.5px solid ${cfg.color}`, opacity: 0.8 }} />
                  <span style={{ fontSize: 11, color: C.textMuted }}>{cfg.label}</span>
                </div>
              ))}
              <div style={{ marginLeft: "auto", fontSize: 11, color: C.textDim }}>
                Scroll to zoom · Drag to pan · Click node for details
              </div>
            </div>
          </Card>

          {/* Details sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {selectedNode ? (
              <NodeDetail node={selectedNode} edges={edges} nodes={nodes} />
            ) : (
              <Card style={{ padding: "24px 18px", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(59,130,246,0.08)", border: `1px solid ${C.accent}33`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <Icon name="target" size={22} color={C.accent} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>Click a node</div>
                <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>Select any node in the graph to see details, connections and metadata.</div>
              </Card>
            )}

            {/* Graph stats */}
            {graphData && (
              <Card>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Graph Summary</div>
                {[
                  ["Total nodes", nodes.length],
                  ["Connections", edges.length],
                  ["Malware nodes", nodes.filter(n => n.type === "malware").length],
                  ["MITRE techniques", nodes.filter(n => n.type === "mitre").length],
                  ["Infrastructure", nodes.filter(n => ["asn","subnet","country"].includes(n.type)).length],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.borderSubtle}`, fontSize: 13 }}>
                    <span style={{ color: C.textMuted }}>{label}</span>
                    <span style={{ color: C.text, fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {graphData && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: aiSummary ? 18 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(167,139,250,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="cpu" size={16} color={C.purple} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>AI Graph Analysis</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>Powered by Groq · Llama 3.3 70B</div>
              </div>
            </div>
            <Button
              onClick={generateAiSummary}
              disabled={aiLoading}
              variant="secondary"
              icon={aiLoading
                ? <span style={{ width: 13, height: 13, borderRadius: "50%", border: `2px solid ${C.purple}44`, borderTopColor: C.purple, animation: "spin 0.7s linear infinite" }} />
                : <Icon name="cpu" size={13} color={C.purple} />}
              style={{ fontSize: 12, padding: "7px 16px", borderColor: C.purple + "55", color: C.purple }}
            >
              {aiLoading ? "Analyzing graph..." : aiSummary ? "Regenerate" : "Generate AI Summary"}
            </Button>
          </div>

          {aiSummary && !aiSummary.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Headline + TLP + Confidence */}
              <div style={{ padding: "14px 16px", background: "rgba(167,139,250,0.06)", border: `1px solid rgba(167,139,250,0.2)`, borderRadius: 10, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{aiSummary.headline}</div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {aiSummary.tlp && (
                    <Badge color={{ RED: C.red, AMBER: C.orange, GREEN: C.green, WHITE: C.textMuted }[aiSummary.tlp] || C.textMuted}
                      bg="transparent">TLP:{aiSummary.tlp}</Badge>
                  )}
                  {aiSummary.confidence && (
                    <Badge color={{ HIGH: C.red, MEDIUM: C.orange, LOW: C.green }[aiSummary.confidence] || C.textMuted}
                      bg="transparent">{aiSummary.confidence} confidence</Badge>
                  )}
                </div>
              </div>

              {/* Overview */}
              {aiSummary.overview && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>Overview</div>
                  <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.8 }}>{aiSummary.overview}</p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Infrastructure */}
                {aiSummary.infrastructure && (
                  <div style={{ padding: "12px 14px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>Infrastructure</div>
                    <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.6 }}>{aiSummary.infrastructure}</p>
                  </div>
                )}
                {/* Threat Assessment */}
                {aiSummary.threat_assessment && (
                  <div style={{ padding: "12px 14px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>Threat Assessment</div>
                    <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.6 }}>{aiSummary.threat_assessment}</p>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {aiSummary.recommendations?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 }}>Recommended Actions</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {aiSummary.recommendations.map((r, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.purple, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                        <span style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {aiSummary?.error && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: C.orangeBg, border: `1px solid ${C.orange}44`, borderRadius: 8, fontSize: 12, color: C.orange }}>
              ⚠ {aiSummary.error}
            </div>
          )}
        </Card>
      )}

      {/* Empty state */}
      {!graphData && !loading && !error && (
        <Card style={{ padding: "70px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.3 }}>🕸</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 8 }}>Start an investigation</div>
          <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 400, margin: "0 auto", lineHeight: 1.7 }}>
            Enter any IP, domain, hash or URL above. The graph will map relationships between
            infrastructure, malware families, MITRE ATT&CK techniques and threat indicators.
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Node detail panel ────────────────────────────────────────────────────────
function NodeDetail({ node, edges, nodes }) {
  const color = getNodeColor(node);
  const cfg = NODE_CFG[node.type] || NODE_CFG.tag;

  const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id);
  const connectedNodes = connectedEdges.map(e => {
    const otherId = e.source === node.id ? e.target : e.source;
    const other = nodes.find(n => n.id === otherId);
    return { edge: e, node: other, direction: e.source === node.id ? "out" : "in" };
  }).filter(c => c.node);

  return (
    <Card>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}22`, border: `1.5px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "monospace" }}>
            {node.type === "ip" ? "IP" : node.type === "mitre" ? node.label.slice(0, 4) : node.fullLabel?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, wordBreak: "break-all", lineHeight: 1.4 }}>
            {node.fullLabel || node.label}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {node.isMain && <Badge color={C.accentLight} bg="rgba(59,130,246,0.12)">Main Indicator</Badge>}
        {node.risk && <Badge color={RISK_COLORS[node.risk]} bg={`${RISK_COLORS[node.risk]}18`}>{node.risk}</Badge>}
        {node.score !== undefined && <Badge color={color} bg={`${color}15`}>Score: {node.score}</Badge>}
        {node.status && <Badge color={node.status === "online" ? C.red : C.textMuted} bg={node.status === "online" ? C.redBg : "rgba(88,107,133,0.1)"}>{node.status}</Badge>}
      </div>

      {/* Extra metadata */}
      {node.technique && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Technique</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{node.technique}</div>
          {node.tactic && <div style={{ fontSize: 11, color: C.orange, marginTop: 3 }}>{node.tactic}</div>}
          {node.url && (
            <a href={node.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.accentLight, display: "block", marginTop: 4 }}>
              View on MITRE ATT&CK ↗
            </a>
          )}
        </div>
      )}

      {/* Connections */}
      {connectedNodes.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
            Connections ({connectedNodes.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {connectedNodes.slice(0, 8).map(({ edge, node: other, direction }, i) => {
              const otherColor = getNodeColor(other);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: C.bgInput, borderRadius: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: otherColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {other.label}
                    </div>
                    <div style={{ fontSize: 10, color: C.textDim }}>{edge.label}</div>
                  </div>
                  <span style={{ fontSize: 10, color: direction === "out" ? C.accentLight : C.textMuted, flexShrink: 0 }}>
                    {direction === "out" ? "→" : "←"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
