const axios = require('axios');
const BASE = 'https://www.virustotal.com/api/v3';
const headers = () => ({ 'x-apikey': process.env.VIRUSTOTAL_API_KEY });

async function enrichIP(ip) {
  const { data } = await axios.get(`${BASE}/ip_addresses/${ip}`, { headers: headers() });
  const attr = data.data.attributes;
  return {
    malicious: attr.last_analysis_stats.malicious,
    suspicious: attr.last_analysis_stats.suspicious,
    harmless: attr.last_analysis_stats.harmless,
    country: attr.country,
    asn: attr.asn,
    as_owner: attr.as_owner,
    reputation: attr.reputation,
    network: attr.network
  };
}

async function enrichHash(hash) {
  const { data } = await axios.get(`${BASE}/files/${hash}`, { headers: headers() });
  const attr = data.data.attributes;
  return {
    malicious: attr.last_analysis_stats.malicious,
    suspicious: attr.last_analysis_stats.suspicious,
    harmless: attr.last_analysis_stats.harmless,
    name: attr.meaningful_name || attr.names?.[0] || 'unknown',
    type: attr.type_description,
    size: attr.size,
    first_seen: attr.first_submission_date,
    last_seen: attr.last_submission_date,
    tags: attr.tags || []
  };
}

async function enrichDomain(domain) {
  const { data } = await axios.get(`${BASE}/domains/${domain}`, { headers: headers() });
  const attr = data.data.attributes;
  return {
    malicious: attr.last_analysis_stats.malicious,
    suspicious: attr.last_analysis_stats.suspicious,
    harmless: attr.last_analysis_stats.harmless,
    reputation: attr.reputation,
    registrar: attr.registrar,
    creation_date: attr.creation_date,
    categories: attr.categories || {}
  };
}

async function enrichURL(url) {
  const encoded = Buffer.from(url).toString('base64').replace(/=/g, '');
  const { data } = await axios.get(`${BASE}/urls/${encoded}`, { headers: headers() });
  const attr = data.data.attributes;
  return {
    malicious: attr.last_analysis_stats.malicious,
    suspicious: attr.last_analysis_stats.suspicious,
    harmless: attr.last_analysis_stats.harmless,
    final_url: attr.final_url,
    title: attr.title,
    categories: attr.categories || {}
  };
}

module.exports = { enrichIP, enrichHash, enrichDomain, enrichURL };
