// SSL/TLS Certificate data via crt.sh — free, no API key
const axios = require('axios');

async function getCertificates(domain) {
  let data;
  try {
    ({ data } = await axios.get(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`, {
      timeout: 10000,
      headers: { 'Accept': 'application/json' }
    }));
  } catch {
    return { certs: [], found: false };
  }
  if (!Array.isArray(data)) return { certs: [], found: false };

  // Deduplicate by common_name + issuer
  const seen = new Set();
  const certs = data
    .filter(c => {
      const key = `${c.common_name}|${c.issuer_ca_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 15)
    .map(c => ({
      id: c.id,
      common_name: c.common_name,
      name_value: c.name_value,
      issuer: c.issuer_name,
      not_before: c.not_before,
      not_after: c.not_after,
      is_expired: new Date(c.not_after) < new Date(),
    }));

  // Extract unique related domains from name_value fields
  const relatedDomains = [...new Set(
    data.flatMap(c => (c.name_value || '').split('\n').map(d => d.trim().replace(/^\*\./, '')))
      .filter(d => d && d !== domain && d.includes('.') && !d.includes('*'))
  )].slice(0, 20);

  return {
    certs,
    related_domains: relatedDomains,
    total: data.length,
    found: certs.length > 0,
    has_self_signed: certs.some(c => c.issuer?.includes(domain)),
    has_expired: certs.some(c => c.is_expired),
  };
}

module.exports = { getCertificates };
