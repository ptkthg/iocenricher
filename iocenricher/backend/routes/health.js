const express = require('express');
const router = express.Router();
const axios = require('axios');

async function checkSource(name, fn) {
  const start = Date.now();
  try {
    await fn();
    return { name, status: 'online', latency: Date.now() - start };
  } catch (e) {
    const status = e.code === 'MISSING_KEY' ? 'not_configured'
      : e.code === 'SOURCE_AUTH' || [401, 403].includes(e.response?.status) ? 'auth_error'
      : e.response?.status === 429 ? 'rate_limited' : 'offline';
    return { name, status, latency: Date.now() - start };
  }
}

let cached;
let pending;
async function sourceChecks() {
  if (cached && Date.now() < cached.expires) return cached.value;
  if (pending) return pending;
  pending = Promise.all([
    checkSource('virustotal', () => {
      if (!process.env.VIRUSTOTAL_API_KEY) throw Object.assign(new Error('API key not set'), { code: 'MISSING_KEY' });
      return axios.get('https://www.virustotal.com/api/v3/ip_addresses/8.8.8.8', { headers: { 'x-apikey': process.env.VIRUSTOTAL_API_KEY }, timeout: 5000 });
    }),
    checkSource('ipinfo', async () => {
      try { return await axios.get('https://ipinfo.io/8.8.8.8', { params: process.env.IPINFO_API_KEY ? { token: process.env.IPINFO_API_KEY } : undefined, timeout: 5000 }); }
      catch (error) { if (!process.env.IPINFO_API_KEY || ![401, 403].includes(error.response?.status)) throw error; return axios.get('https://ipinfo.io/8.8.8.8', { timeout: 5000 }); }
    }),
    checkSource('urlhaus', async () => {
      if (!process.env.URLHAUS_API_KEY) throw Object.assign(new Error('API key not set'), { code: 'MISSING_KEY' });
      await axios.post('https://urlhaus-api.abuse.ch/v1/host/', new URLSearchParams({ host: '8.8.8.8' }), { headers: { 'Auth-Key': process.env.URLHAUS_API_KEY }, timeout: 5000 });
    }),
    checkSource('malwarebazaar', async () => {
      if (!process.env.MALWAREBAZAAR_API_KEY) throw Object.assign(new Error('API key not set'), { code: 'MISSING_KEY' });
      const { data } = await axios.post('https://mb-api.abuse.ch/api/v1/', new URLSearchParams({ query: 'get_info', hash: '0'.repeat(64) }), { headers: { 'Auth-Key': process.env.MALWAREBAZAAR_API_KEY }, timeout: 5000 });
      if (!['ok', 'hash_not_found'].includes(data?.query_status)) {
        throw Object.assign(new Error('MalwareBazaar health failed'), { code: ['no_api_key', 'user_blacklisted'].includes(data?.query_status) ? 'SOURCE_AUTH' : 'SOURCE_RESPONSE' });
      }
    }),
    checkSource('abuseipdb', async () => {
      if (!process.env.ABUSEIPDB_API_KEY) throw Object.assign(new Error('API key not set'), { code: 'MISSING_KEY' });
      await axios.get('https://api.abuseipdb.com/api/v2/check', { headers: { Key: process.env.ABUSEIPDB_API_KEY, Accept: 'application/json' }, params: { ipAddress: '8.8.8.8', maxAgeInDays: 90 }, timeout: 5000 });
    }),
    checkSource('shodan', async () => {
      if (!process.env.SHODAN_API_KEY) throw Object.assign(new Error('API key not set'), { code: 'MISSING_KEY' });
      await axios.get(`https://api.shodan.io/shodan/host/8.8.8.8`, { params: { key: process.env.SHODAN_API_KEY }, timeout: 5000 });
    }),
    checkSource('groq', async () => {
      if (!process.env.GROQ_API_KEY) throw Object.assign(new Error('API key not set'), { code: 'MISSING_KEY' });
      await axios.get('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, timeout: 5000 });
    }),
  ]).then(sources => {
    const value = { sources, checked_at: new Date().toISOString() };
    cached = { value, expires: Date.now() + 60_000 };
    return value;
  }).finally(() => { pending = null; });
  return pending;
}

router.get('/health/sources', async (req, res) => {
  res.json(await sourceChecks());
});

module.exports = router;
module.exports.checkSource = checkSource;
