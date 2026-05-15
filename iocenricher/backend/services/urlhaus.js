const axios = require('axios');

const BASE = 'https://urlhaus-api.abuse.ch/v1';
const headers = () => ({ 
  'Auth-Key': process.env.URLHAUS_API_KEY,
  'Content-Type': 'application/x-www-form-urlencoded'
});

async function checkURL(url) {
  const { data } = await axios.post(`${BASE}/url/`, 
    new URLSearchParams({ url }), 
    { headers: headers() }
  );
  if (data.query_status !== 'ok') return { found: false };
  return {
    found: true,
    threat: data.threat,
    status: data.url_status,
    date_added: data.date_added,
    tags: data.tags || [],
    payloads: data.payloads?.slice(0, 3).map(p => ({
      filename: p.filename,
      file_type: p.file_type,
      sha256: p.response_sha256,
      signature: p.signature
    })) || [],
    reporter: data.reporter
  };
}

async function checkHostname(host) {
  const { data } = await axios.post(`${BASE}/host/`, 
    new URLSearchParams({ host }), 
    { headers: headers() }
  );
  if (data.query_status !== 'ok') return { found: false };
  return {
    found: true,
    blacklists: data.blacklists || {},
    url_count: data.url_count || 0,
    first_seen: data.firstseen,
    urls: (data.urls || []).slice(0, 5).map(u => ({
      url: u.url,
      threat: u.threat,
      status: u.url_status,
      tags: u.tags || []
    }))
  };
}

async function checkPayloadHash(hash) {
  const field = hash.length === 64 ? 'sha256_hash' : 'md5_hash';
  const { data } = await axios.post(`${BASE}/payload/`, 
    new URLSearchParams({ [field]: hash }), 
    { headers: headers() }
  );
  if (data.query_status !== 'ok') return { found: false };
  return {
    found: true,
    file_type: data.file_type,
    file_size: data.file_size,
    signature: data.signature,
    first_seen: data.firstseen,
    last_seen: data.lastseen,
    url_count: data.url_count,
    urlhaus_reference: data.urlhaus_reference
  };
}

module.exports = { checkURL, checkHostname, checkPayloadHash };
