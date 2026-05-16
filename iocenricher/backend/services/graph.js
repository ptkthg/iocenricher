const axios = require('axios');
const { mapToMitre } = require('./mitre');

// Safe wrappers — never throw, return null on failure
async function safe(fn) {
  try { return await fn(); } catch { return null; }
}

// Check Feodo Tracker inline — avoids circular dependency with threatfeed.js
// Uses a short timeout to avoid serverless function timeout on Vercel
async function checkFeodo(ip) {
  return safe(async () => {
    const { data } = await axios.get(
      'https://feodotracker.abuse.ch/downloads/ipblocklist_aggressive.csv',
      { timeout: 4000 }
    );
    const lines = data.split('\n');
    for (const line of lines) {
      if (!line || line.startsWith('#')) continue;
      const [first_seen, dst_ip, dst_port, c2_status, malware_family, country] = line.split(',');
      if (dst_ip?.trim() === ip) {
        return {
          ip: dst_ip.trim(),
          port: dst_port?.trim(),
          status: c2_status?.trim(),
          malware: malware_family?.trim() || 'Unknown',
          country: country?.trim(),
          first_seen: first_seen?.trim(),
        };
      }
    }
    return null;
  });
}

function detectType(indicator) {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(indicator)) return 'ip';
  if (/^[a-fA-F0-9]{32,64}$/.test(indicator)) return 'hash';
  if (/^https?:\/\//i.test(indicator)) return 'url';
  return 'domain';
}

function uid(type, value) { return `${type}::${value}`; }

function addNode(nodes, id, label, type, meta = {}) {
  if (!nodes.find(n => n.id === id)) {
    nodes.push({
      id,
      label: label.length > 26 ? label.slice(0, 24) + '…' : label,
      fullLabel: label,
      type,
      ...meta
    });
  }
}

function addEdge(edges, source, target, label) {
  const id = `${source}--${target}`;
  if (!edges.find(e => e.id === id)) {
    edges.push({ id, source, target, label });
  }
}

async function buildGraph(indicator) {
  const type = detectType(indicator);
  const nodes = [];
  const edges = [];
  const sources = {};

  const mainId = uid(type, indicator);
  addNode(nodes, mainId, indicator, type, { isMain: true, score: 0, risk: 'BAIXO' });

  try {
    if (type === 'ip') {
      const vtMod = require('./virustotal');
      const ipiMod = require('./ipinfo');

      const [vt, ipi] = await Promise.all([
        safe(() => vtMod.enrichIP(indicator)),
        safe(() => ipiMod.enrichIP(indicator)),
      ]);

      if (vt) sources.virustotal = vt;
      if (ipi) sources.ipinfo = ipi;

      if (ipi?.org) {
        const id = uid('asn', ipi.org);
        addNode(nodes, id, ipi.org, 'asn');
        addEdge(edges, mainId, id, 'belongs to');
      }
      if (ipi?.country) {
        const id = uid('country', ipi.country);
        addNode(nodes, id, ipi.country, 'country');
        addEdge(edges, mainId, id, 'origin');
      }
      if (vt?.network) {
        const id = uid('subnet', vt.network);
        addNode(nodes, id, vt.network, 'subnet');
        addEdge(edges, mainId, id, 'part of');
      }
      if (vt?.malicious > 0) {
        const id = uid('detection', `${vt.malicious} engines`);
        addNode(nodes, id, `${vt.malicious} detections`, 'detection', { malicious: vt.malicious });
        addEdge(edges, mainId, id, 'detected by');
      }

      // Feodo Tracker — inline check, no circular dependency
      const feed = await checkFeodo(indicator);
      if (feed) {
        const malId = uid('malware', feed.malware);
        addNode(nodes, malId, feed.malware, 'malware', { status: feed.status });
        addEdge(edges, mainId, malId, 'C2 server for');
        if (feed.port) {
          const portId = uid('port', `Port ${feed.port}`);
          addNode(nodes, portId, `Port ${feed.port}`, 'port');
          addEdge(edges, mainId, portId, 'listens on');
        }
        if (feed.country) {
          const cId = uid('country', feed.country);
          addNode(nodes, cId, feed.country, 'country');
          addEdge(edges, mainId, cId, 'origin');
        }
      }
    }

    if (type === 'domain') {
      const vtMod = require('./virustotal');
      const uhMod = require('./urlhaus');

      const [vt, uh] = await Promise.all([
        safe(() => vtMod.enrichDomain(indicator)),
        safe(() => uhMod.checkHostname(indicator)),
      ]);

      if (vt) sources.virustotal = vt;
      if (uh) sources.urlhaus = uh;

      if (vt?.registrar) {
        const id = uid('registrar', vt.registrar);
        addNode(nodes, id, vt.registrar, 'registrar');
        addEdge(edges, mainId, id, 'registered with');
      }
      if (vt?.malicious > 0) {
        const id = uid('detection', `${vt.malicious} engines`);
        addNode(nodes, id, `${vt.malicious} detections`, 'detection', { malicious: vt.malicious });
        addEdge(edges, mainId, id, 'detected by');
      }
      if (uh?.found && uh.threat) {
        const id = uid('threat', uh.threat);
        addNode(nodes, id, uh.threat, 'threat');
        addEdge(edges, mainId, id, 'distributes');
      }
      if (uh?.tags?.length) {
        uh.tags.slice(0, 3).forEach(tag => {
          const id = uid('tag', tag);
          addNode(nodes, id, tag, 'tag');
          addEdge(edges, mainId, id, 'tagged as');
        });
      }
    }

    if (type === 'hash') {
      const vtMod = require('./virustotal');
      const mbMod = require('./malwarebazaar');

      const [vt, mb] = await Promise.all([
        safe(() => vtMod.enrichHash(indicator)),
        safe(() => mbMod.checkHash(indicator)),
      ]);

      if (vt) sources.virustotal = vt;
      if (mb) sources.malwarebazaar = mb;

      if (mb?.found) {
        if (mb.signature) {
          const id = uid('malware', mb.signature);
          addNode(nodes, id, mb.signature, 'malware');
          addEdge(edges, mainId, id, 'identified as');
        }
        mb.tags?.slice(0, 3).forEach(tag => {
          const id = uid('tag', tag);
          addNode(nodes, id, tag, 'tag');
          addEdge(edges, mainId, id, 'tagged as');
        });
      }
      if (vt?.name) {
        const id = uid('file', vt.name);
        addNode(nodes, id, vt.name, 'file');
        addEdge(edges, mainId, id, 'known as');
      }
      if (vt?.malicious > 0) {
        const id = uid('detection', `${vt.malicious} engines`);
        addNode(nodes, id, `${vt.malicious} detections`, 'detection');
        addEdge(edges, mainId, id, 'detected by');
      }
    }

    if (type === 'url') {
      const vtMod = require('./virustotal');
      const uhMod = require('./urlhaus');

      const [vt, uh] = await Promise.all([
        safe(() => vtMod.enrichURL(indicator)),
        safe(() => uhMod.checkURL(indicator)),
      ]);

      if (vt) sources.virustotal = vt;
      if (uh) sources.urlhaus = uh;

      try {
        const domain = new URL(indicator).hostname;
        const id = uid('domain', domain);
        addNode(nodes, id, domain, 'domain');
        addEdge(edges, mainId, id, 'hosted on');
      } catch {}

      if (uh?.found && uh.threat) {
        const id = uid('threat', uh.threat);
        addNode(nodes, id, uh.threat, 'threat');
        addEdge(edges, mainId, id, 'delivers');
      }
      if (vt?.malicious > 0) {
        const id = uid('detection', `${vt.malicious} engines`);
        addNode(nodes, id, `${vt.malicious} detections`, 'detection');
        addEdge(edges, mainId, id, 'detected by');
      }
    }

    // Risk + MITRE (always run)
    try {
      const { calculateRisk } = require('./risk');
      const { score, level } = calculateRisk(sources, type);
      const main = nodes.find(n => n.id === mainId);
      if (main) { main.score = score; main.risk = level; }

      const techniques = mapToMitre(sources, type);
      techniques.slice(0, 5).forEach(t => {
        const id = uid('mitre', t.id);
        addNode(nodes, id, t.id, 'mitre', { technique: t.name, tactic: t.tactic, url: t.url });
        addEdge(edges, mainId, id, t.tactic);
      });
    } catch {}

  } catch (err) {
    console.error('[Graph] Unexpected error:', err.message);
  }

  // Always return something valid
  return { nodes, edges, indicator, type };
}

module.exports = { buildGraph };
