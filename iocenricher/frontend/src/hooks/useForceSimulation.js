import { useState, useRef, useEffect, useCallback } from 'react';

export default function useForceSimulation(nodes, edges, width, height, getNodeSize) {
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
  }, [nodes, edges, width, height, getNodeSize]);

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
