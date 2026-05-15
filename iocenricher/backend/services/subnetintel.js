// Subnet Intelligence — cross-reference /24 against Feodo Tracker cache
const { fetchFeed } = require('./threatfeed');

async function analyzeSubnet(ip) {
  try {
    const parts = ip.split('.');
    if (parts.length !== 4) return { found: false };
    const subnet24 = `${parts[0]}.${parts[1]}.${parts[2]}`;

    const feed = await fetchFeed();
    const subnetMatches = feed.filter(e => e.ip.startsWith(subnet24) && e.ip !== ip);

    if (subnetMatches.length === 0) return { subnet: `${subnet24}.0/24`, matches: [], found: false };

    const byMalware = {};
    subnetMatches.forEach(m => { byMalware[m.malware] = (byMalware[m.malware] || 0) + 1; });

    return {
      subnet: `${subnet24}.0/24`,
      matches: subnetMatches.slice(0, 10),
      total_malicious: subnetMatches.length,
      malware_families: Object.entries(byMalware).sort((a,b) => b[1]-a[1]).map(([name, count]) => ({ name, count })),
      found: subnetMatches.length > 0,
    };
  } catch {
    return { found: false };
  }
}

module.exports = { analyzeSubnet };
