const cache = new Map();
const pending = new Map();
const TTL = { virustotal: 15 * 60_000, ipinfo: 60 * 60_000, abuseipdb: 15 * 60_000, shodan: 30 * 60_000, urlhaus: 15 * 60_000, malwarebazaar: 30 * 60_000, passivedns: 15 * 60_000, whois: 60 * 60_000, ssl: 60 * 60_000, subnet: 15 * 60_000 };
let active = 0;

function acquireSlot() {
  if (active >= 4) return null;
  active++;
  let released = false;
  return () => { if (!released) { active--; released = true; } };
}

async function cachedQuery(source, indicator, fn) {
  const key = `${source}:${indicator}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  if (hit) cache.delete(key);
  if (pending.has(key)) return pending.get(key);
  const work = Promise.resolve().then(fn).then(value => {
    if (cache.size >= 500) cache.delete(cache.keys().next().value);
    cache.set(key, { value, expires: Date.now() + (TTL[source] || 5 * 60_000) });
    return value;
  }).finally(() => pending.delete(key));
  pending.set(key, work);
  return work;
}

module.exports = { acquireSlot, cachedQuery };
