const express = require('express');
const router = express.Router();
const axios = require('axios');

async function checkSource(name, fn) {
  const start = Date.now();
  try {
    await fn();
    return { name, status: 'online', latency: Date.now() - start };
  } catch (e) {
    const msg = e.response?.status === 401 ? 'Invalid API key' : e.response?.status === 429 ? 'Rate limited' : e.code === 'ECONNABORTED' ? 'Timeout' : e.message?.slice(0, 60);
    return { name, status: e.response?.status === 401 ? 'auth_error' : 'offline', error: msg, latency: Date.now() - start };
  }
}

router.get('/health/sources', async (req, res) => {
  const checks = await Promise.all([
    checkSource('virustotal', () => axios.get('https://www.virustotal.com/api/v3/ip_addresses/8.8.8.8', { headers: { 'x-apikey': process.env.VIRUSTOTAL_API_KEY }, timeout: 5000 })),
    checkSource('ipinfo', () => axios.get('https://ipinfo.io/8.8.8.8', { params: { token: process.env.IPINFO_API_KEY }, timeout: 5000 })),
    checkSource('urlhaus', () => axios.post('https://urlhaus-api.abuse.ch/v1/host/', new URLSearchParams({ host: '8.8.8.8' }), { timeout: 5000 })),
    checkSource('malwarebazaar', () => axios.post('https://mb-api.abuse.ch/api/v1/', new URLSearchParams({ query: 'get_info', hash: 'abc123' }), { timeout: 5000 })),
    checkSource('abuseipdb', async () => {
      if (!process.env.ABUSEIPDB_API_KEY) throw Object.assign(new Error('API key not set'), { response: { status: 401 } });
      await axios.get('https://api.abuseipdb.com/api/v2/check', { headers: { Key: process.env.ABUSEIPDB_API_KEY, Accept: 'application/json' }, params: { ipAddress: '8.8.8.8', maxAgeInDays: 90 }, timeout: 5000 });
    }),
    checkSource('shodan', async () => {
      if (!process.env.SHODAN_API_KEY) throw Object.assign(new Error('API key not set'), { response: { status: 401 } });
      await axios.get(`https://api.shodan.io/shodan/host/8.8.8.8`, { params: { key: process.env.SHODAN_API_KEY }, timeout: 5000 });
    }),
    checkSource('groq', async () => {
      if (!process.env.GROQ_API_KEY) throw Object.assign(new Error('API key not set'), { response: { status: 401 } });
      await axios.get('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, timeout: 5000 });
    }),
  ]);
  res.json({ sources: checks, checked_at: new Date().toISOString() });
});

module.exports = router;
