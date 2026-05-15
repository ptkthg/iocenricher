const axios = require('axios');

async function enrichIP(ip) {
  if (!process.env.SHODAN_API_KEY) throw new Error('SHODAN_API_KEY not configured');

  const { data } = await axios.get(`https://api.shodan.io/shodan/host/${ip}`, {
    params: { key: process.env.SHODAN_API_KEY },
    timeout: 10000
  });

  // Extract unique ports and services
  const ports = data.ports || [];
  const services = (data.data || []).map(s => ({
    port: s.port,
    transport: s.transport || 'tcp',
    product: s.product || null,
    version: s.version || null,
    banner: s.data ? s.data.slice(0, 120) : null,
    cpe: s.cpe ? (Array.isArray(s.cpe) ? s.cpe : [s.cpe]) : [],
  }));

  // CVEs
  const vulns = data.vulns ? Object.entries(data.vulns).map(([cve, info]) => ({
    cve,
    cvss: info.cvss || null,
    summary: info.summary ? info.summary.slice(0, 180) : null,
    references: info.references?.slice(0, 2) || [],
  })) : [];

  return {
    ip: data.ip_str,
    org: data.org || null,
    isp: data.isp || null,
    country: data.country_name || data.country_code || null,
    city: data.city || null,
    os: data.os || null,
    hostname: data.hostnames?.[0] || null,
    asn: data.asn || null,
    last_update: data.last_update || null,
    ports,
    services,
    vulns,
    tags: data.tags || [],
    total_ports: ports.length,
    total_vulns: vulns.length,
  };
}

module.exports = { enrichIP };
