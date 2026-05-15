const axios = require('axios');

const FEED_URL = 'https://feodotracker.abuse.ch/downloads/ipblocklist_aggressive.csv';
const CACHE_TTL_MS = 60 * 60 * 1000;

let cache = { data: [], lastFetched: 0 };

async function fetchFeed() {
  const now = Date.now();
  if (cache.data.length > 0 && now - cache.lastFetched < CACHE_TTL_MS) return cache.data;
  console.log('[ThreatFeed] Fetching Feodo Tracker feed...');
  const { data } = await axios.get(FEED_URL, { timeout: 15000 });
  const entries = [];
  for (const line of data.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [first_seen, dst_ip, dst_port, c2_status, malware_family, country] = line.split(',').map(s => s?.trim());
    if (!dst_ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(dst_ip)) continue;
    entries.push({ ip: dst_ip, port: dst_port, status: c2_status, malware: malware_family || 'Unknown', country, first_seen });
  }
  cache = { data: entries, lastFetched: now };
  console.log(`[ThreatFeed] Loaded ${entries.length} malicious IPs`);
  return entries;
}

async function searchIP(ip) {
  const feed = await fetchFeed();
  return feed.find(e => e.ip === ip.trim()) || null;
}

async function getStats() {
  const feed = await fetchFeed();
  const byMalware = {}, byCountry = {};
  for (const e of feed) {
    byMalware[e.malware] = (byMalware[e.malware] || 0) + 1;
    if (e.country) byCountry[e.country] = (byCountry[e.country] || 0) + 1;
  }
  return {
    total: feed.length,
    topMalware: Object.entries(byMalware).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
    topCountries: Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([country, count]) => ({ country, count })),
    lastUpdated: new Date(cache.lastFetched).toISOString()
  };
}

async function getList({ page = 1, perPage = 20, search = '', malware = '' } = {}) {
  const feed = await fetchFeed();
  let filtered = feed;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(e => e.ip.includes(q) || (e.malware || '').toLowerCase().includes(q) || (e.country || '').toLowerCase().includes(q));
  }
  if (malware && malware !== 'All') filtered = filtered.filter(e => e.malware === malware);
  const total = filtered.length;
  return { items: filtered.slice((page - 1) * perPage, page * perPage), total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

module.exports = { searchIP, getStats, getList, fetchFeed };
