const express = require('express');
const router = express.Router();
const { enrichIP: ipinfoIP } = require('../services/ipinfo');
const { enrichIP: abuseIP } = require('../services/abuseipdb');
const { enrichIP: shodanIP } = require('../services/shodan');
const { enrichHash, enrichDomain, enrichIP: vtIP, enrichURL } = require('../services/virustotal');
const { checkHash } = require('../services/malwarebazaar');
const { checkURL, checkHostname, checkPayloadHash } = require('../services/urlhaus');
const { analyzeIOC } = require('../services/openai');
const { calculateRisk } = require('../services/risk');
const { mapToMitre } = require('../services/mitre');
const { reverseLookup, forwardLookup } = require('../services/passivedns');
const { lookupDomain, lookupIP } = require('../services/whois');
const { getCertificates } = require('../services/sslcert');
const { analyzeSubnet } = require('../services/subnetintel');
const { analyzeDomain } = require('../services/typosquatting');

function detectType(indicator) {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const hashRegex = /^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/;
  const urlRegex = /^https?:\/\/.+/i;
  if (ipRegex.test(indicator)) return 'ip';
  if (hashRegex.test(indicator)) return 'hash';
  if (urlRegex.test(indicator)) return 'url';
  return 'domain';
}

async function safe(fn) {
  try { return await fn(); } catch { return null; }
}

function configured(key, fn) {
  if (!process.env[key]) return Promise.reject(Object.assign(new Error('API key not set'), { code: 'MISSING_KEY' }));
  return fn();
}

function sourceStatus(settled) {
  if (settled.status === 'fulfilled') return settled.value?.found === false ? 'no_match' : 'ok';
  const error = settled.reason;
  if (error.code === 'MISSING_KEY') return 'not_configured';
  if (error.response?.status === 401 || error.response?.status === 403) return 'auth_error';
  if (error.response?.status === 404) return 'no_match';
  if (error.response?.status === 429) return 'rate_limited';
  return 'unavailable';
}

function recordSource(results, name, settled, onlyFound = false) {
  results.source_status[name] = sourceStatus(settled);
  if (settled.status === 'fulfilled' && (!onlyFound || settled.value?.found)) {
    results.sources[name] = settled.value;
  }
}

router.post('/enrich', async (req, res) => {
  const { indicator } = req.body;
  if (!indicator || typeof indicator !== 'string')
    return res.status(400).json({ error: 'Indicador inválido ou ausente.' });

  const type = detectType(indicator.trim());
  const results = {
    indicator: indicator.trim(), type, sources: {}, source_status: {},
    risk: null, recommendation: null, ai_analysis: null,
    timestamp: new Date().toISOString()
  };

  try {
    if (type === 'ip') {
      const [vt, ipi, abuse, shodan, pdns, whoisData, subnet] = await Promise.allSettled([
        configured('VIRUSTOTAL_API_KEY', () => vtIP(indicator)),
        ipinfoIP(indicator),
        configured('ABUSEIPDB_API_KEY', () => abuseIP(indicator)),
        configured('SHODAN_API_KEY', () => shodanIP(indicator)),
        reverseLookup(indicator),
        lookupIP(indicator),
        analyzeSubnet(indicator),
      ]);
      recordSource(results, 'virustotal', vt);
      recordSource(results, 'ipinfo', ipi);
      recordSource(results, 'abuseipdb', abuse);
      recordSource(results, 'shodan', shodan);
      recordSource(results, 'passivedns', pdns, true);
      recordSource(results, 'whois', whoisData, true);
      recordSource(results, 'subnet', subnet, true);
    }

    if (type === 'hash') {
      const [vt, mb, uh] = await Promise.allSettled([
        configured('VIRUSTOTAL_API_KEY', () => enrichHash(indicator)), checkHash(indicator), configured('URLHAUS_API_KEY', () => checkPayloadHash(indicator))
      ]);
      recordSource(results, 'virustotal', vt);
      recordSource(results, 'malwarebazaar', mb);
      recordSource(results, 'urlhaus', uh);
    }

    if (type === 'domain') {
      const [vt, uh, pdns, whoisData, ssl, typo] = await Promise.allSettled([
        configured('VIRUSTOTAL_API_KEY', () => enrichDomain(indicator)),
        configured('URLHAUS_API_KEY', () => checkHostname(indicator)),
        forwardLookup(indicator),
        lookupDomain(indicator),
        getCertificates(indicator),
        Promise.resolve(analyzeDomain(indicator)),
      ]);
      recordSource(results, 'virustotal', vt);
      recordSource(results, 'urlhaus', uh);
      recordSource(results, 'passivedns', pdns, true);
      recordSource(results, 'whois', whoisData, true);
      recordSource(results, 'ssl', ssl, true);
      recordSource(results, 'typosquatting', typo);
    }

    if (type === 'url') {
      let domain = null;
      try { domain = new URL(indicator).hostname; } catch {}
      const tasks = [
        configured('VIRUSTOTAL_API_KEY', () => enrichURL(indicator)),
        configured('URLHAUS_API_KEY', () => checkURL(indicator)),
        ...(domain ? [lookupDomain(domain), getCertificates(domain), Promise.resolve(analyzeDomain(domain))] : []),
      ];
      const results2 = await Promise.allSettled(tasks);
      recordSource(results, 'virustotal', results2[0]);
      recordSource(results, 'urlhaus', results2[1]);
      if (domain) {
        recordSource(results, 'whois', results2[2], true);
        recordSource(results, 'ssl', results2[3], true);
        recordSource(results, 'typosquatting', results2[4]);
      }
    }

    const { score, level, recommendation, factors } = calculateRisk(results.sources, type);
    results.risk = { score, level, factors };
    results.recommendation = recommendation;
    results.mitre = mapToMitre(results.sources, type);

    try {
      const ai = await analyzeIOC(results);
      results.ai_analysis = ai;
      results.source_status.groq = 'ok';
    } catch (e) {
      console.warn('Análise IA falhou:', e.message);
      results.ai_analysis = null;
      results.source_status.groq = !process.env.GROQ_API_KEY ? 'not_configured' : 'unavailable';
    }

    res.json(results);
  } catch (err) {
    console.error('Erro no enriquecimento:', err.message);
    res.status(500).json({ error: 'Erro interno ao consultar fontes OSINT.' });
  }
});

module.exports = router;
