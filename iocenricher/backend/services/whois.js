// WHOIS via RDAP — free, no API key, IANA standard
const axios = require('axios');

async function lookupDomain(domain) {
  try {
    const { data } = await axios.get(`https://rdap.org/domain/${domain}`, { timeout: 8000 });
    const events = data.events || [];
    const getDate = type => events.find(e => e.eventAction === type)?.eventDate || null;
    const ns = (data.nameservers || []).map(n => n.ldhName).filter(Boolean);
    const registrar = data.entities?.find(e => e.roles?.includes('registrar'))?.vcardArray?.[1]?.find(f => f[0] === 'fn')?.[3] || null;
    const status = data.status || [];
    const created = getDate('registration');
    const expires = getDate('expiration');
    const updated = getDate('last changed');
    const agedays = created ? Math.floor((Date.now() - new Date(created).getTime()) / 86400000) : null;
    return { domain, created, expires, updated, age_days: agedays, registrar, nameservers: ns, status, found: true };
  } catch {
    // Fallback: try whois.iana.org
    return { domain, found: false };
  }
}

async function lookupIP(ip) {
  try {
    const { data } = await axios.get(`https://rdap.org/ip/${ip}`, { timeout: 8000 });
    return {
      ip,
      network: data.handle || null,
      name: data.name || null,
      country: data.country || null,
      start_address: data.startAddress || null,
      end_address: data.endAddress || null,
      found: true
    };
  } catch {
    return { ip, found: false };
  }
}

module.exports = { lookupDomain, lookupIP };
