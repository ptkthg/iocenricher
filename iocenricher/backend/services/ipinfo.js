const axios = require('axios');

async function enrichIP(ip) {
  let response;
  try {
    response = await axios.get(`https://ipinfo.io/${ip}`, {
      params: process.env.IPINFO_API_KEY ? { token: process.env.IPINFO_API_KEY } : undefined
    });
  } catch (error) {
    if (!process.env.IPINFO_API_KEY || ![401, 403].includes(error.response?.status)) throw error;
    response = await axios.get(`https://ipinfo.io/${ip}`);
  }
  const { data } = response;
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
