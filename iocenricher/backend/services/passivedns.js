// HackerTarget Passive DNS — free, no API key required
const axios = require('axios');

async function reverseLookup(ip) {
  // Find all domains hosted on this IP
  const { data } = await axios.get(`https://api.hackertarget.com/reverseiplookup/?q=${ip}`, { timeout: 8000 });
  if (!data || data.includes('error') || data.includes('API count')) return { domains: [], found: false };
  const domains = data.trim().split('\n').filter(d => d && !d.includes('error')).slice(0, 20);
  return { domains, found: domains.length > 0, total: domains.length };
}

async function forwardLookup(domain) {
  // Find all IPs a domain has resolved to
  const { data } = await axios.get(`https://api.hackertarget.com/hostsearch/?q=${domain}`, { timeout: 8000 });
  if (!data || data.includes('error') || data.includes('API count')) return { records: [], found: false };
  const records = data.trim().split('\n')
    .filter(l => l && !l.includes('error'))
    .map(l => { const [host, ip] = l.split(','); return { host: host?.trim(), ip: ip?.trim() }; })
    .filter(r => r.host && r.ip)
    .slice(0, 20);
  return { records, found: records.length > 0, total: records.length };
}

module.exports = { reverseLookup, forwardLookup };
