const axios = require('axios');

async function enrichIP(ip) {
  const { data } = await axios.get(`https://ipinfo.io/${ip}`, {
    params: { token: process.env.IPINFO_API_KEY }
  });
  return {
    ip: data.ip,
    hostname: data.hostname || '—',
    city: data.city,
    region: data.region,
    country: data.country,
    location: data.loc,
    org: data.org,
    postal: data.postal,
    timezone: data.timezone,
    is_anycast: data.anycast || false,
    is_bogon: data.bogon || false
  };
}

module.exports = { enrichIP };
