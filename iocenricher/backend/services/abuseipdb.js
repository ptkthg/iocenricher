const axios = require('axios');

async function enrichIP(ip) {
  const { data } = await axios.get('https://api.abuseipdb.com/api/v2/check', {
    headers: { Key: process.env.ABUSEIPDB_API_KEY, Accept: 'application/json' },
    params: { ipAddress: ip, maxAgeInDays: 90, verbose: true }
  });
  const d = data.data;
  return {
    abuse_score: d.abuseConfidenceScore,
    total_reports: d.totalReports,
    country: d.countryCode,
    isp: d.isp,
    domain: d.domain,
    is_tor: d.isTor,
    is_public: d.isPublic,
    usage_type: d.usageType,
    last_reported: d.lastReportedAt
  };
}

module.exports = { enrichIP };
