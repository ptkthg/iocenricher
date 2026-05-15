const axios = require('axios');

async function scanURL(url) {
  try {
    const submit = await axios.post('https://urlscan.io/api/v1/scan/', 
      { url, visibility: 'public' },
      { headers: { 'API-Key': process.env.URLSCAN_API_KEY, 'Content-Type': 'application/json' } }
    );
    const uuid = submit.data.uuid;
    await new Promise(r => setTimeout(r, 10000));
    const { data } = await axios.get(`https://urlscan.io/api/v1/result/${uuid}/`);
    return {
      uuid,
      screenshot: `https://urlscan.io/screenshots/${uuid}.png`,
      verdicts: data.verdicts?.overall || {},
      malicious: data.verdicts?.overall?.malicious || false,
      score: data.verdicts?.overall?.score || 0,
      categories: data.verdicts?.overall?.categories || [],
      ips: data.lists?.ips?.slice(0, 5) || [],
      domains: data.lists?.domains?.slice(0, 5) || []
    };
  } catch {
    return { found: false };
  }
}

module.exports = { scanURL };
