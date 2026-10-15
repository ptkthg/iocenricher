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
const { normalizeIndicator, IndicatorError } = require('../services/indicator');
const { acquireSlot, cachedQuery } = require('../services/query-control');

function configured(key, fn) {
  if (!process.env[key]) return Promise.reject(Object.assign(new Error('API key not set'), { code: 'MISSING_KEY' }));
  return fn();
}

function sourceStatus(settled) {
  if (settled.status === 'fulfilled') return settled.value?.found === false ? 'no_match' : 'ok';
  const error = settled.reason;
  if (error.code === 'MISSING_KEY') return 'not_configured';
  if (error.code === 'SOURCE_AUTH') return 'auth_error';
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
  let parsed;
  try { parsed = normalizeIndicator(req.body?.indicator); }
  catch (error) { return res.status(error instanceof IndicatorError ? 400 : 500).json({ error: error instanceof IndicatorError ? error.message : 'Falha ao validar IOC.' }); }
  const { indicator, type } = parsed;
  const release = acquireSlot();
  if (!release) { res.set('Retry-After', '5'); return res.status(503).json({ error: 'Muitas análises simultâneas. Tente novamente em alguns segundos.' }); }
  const query = (source, fn) => cachedQuery(source, indicator, fn);
  const results = {
    indicator, type, sources: {}, source_status: {},
    risk: null, recommendation: null, ai_analysis: null,
    timestamp: new Date().toISOString()
  };

  try {
    if (type === 'ip') {
      const [vt, ipi, abuse, shodan, pdns, whoisData, subnet] = await Promise.allSettled([
        query('virustotal', () => configured('VIRUSTOTAL_API_KEY', () => vtIP(indicator))),
        query('ipinfo', () => ipinfoIP(indicator)),
        query('abuseipdb', () => configured('ABUSEIPDB_API_KEY', () => abuseIP(indicator))),
        query('shodan', () => configured('SHODAN_API_KEY', () => shodanIP(indicator))),
        query('passivedns', () => reverseLookup(indicator)),
        query('whois', () => lookupIP(indicator)),
        query('subnet', () => analyzeSubnet(indicator)),
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
        query('virustotal', () => configured('VIRUSTOTAL_API_KEY', () => enrichHash(indicator))),
        query('malwarebazaar', () => checkHash(indicator)),
        query('urlhaus', () => configured('URLHAUS_API_KEY', () => checkPayloadHash(indicator)))
      ]);
      recordSource(results, 'virustotal', vt);
      recordSource(results, 'malwarebazaar', mb);
      recordSource(results, 'urlhaus', uh);
    }

    if (type === 'domain') {
      const [vt, uh, pdns, whoisData, ssl, typo] = await Promise.allSettled([
        query('virustotal', () => configured('VIRUSTOTAL_API_KEY', () => enrichDomain(indicator))),
        query('urlhaus', () => configured('URLHAUS_API_KEY', () => checkHostname(indicator))),
        query('passivedns', () => forwardLookup(indicator)),
        query('whois', () => lookupDomain(indicator)),
        query('ssl', () => getCertificates(indicator)),
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
        query('virustotal', () => configured('VIRUSTOTAL_API_KEY', () => enrichURL(indicator))),
        query('urlhaus', () => configured('URLHAUS_API_KEY', () => checkURL(indicator))),
        ...(domain ? [query('whois', () => lookupDomain(domain)), query('ssl', () => getCertificates(domain)), Promise.resolve(analyzeDomain(domain))] : []),
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

    const { score, level, classification, recommendation, factors, confidence, coverage } = calculateRisk(results.sources, type, results.source_status);
    results.risk = { score, level, classification, factors, confidence, coverage };
    results.query_status = coverage.successful ? (coverage.failed.length ? 'partial' : 'complete') : 'error';
    results.recommendation = recommendation;
    results.mitre = mapToMitre(results.sources, type);

    try {
      if (!coverage.successful) throw Object.assign(new Error('Sem evidências externas para IA'), { code: 'SKIPPED' });
      const ai = await analyzeIOC(results);
      results.ai_analysis = ai;
      results.source_status.groq = 'ok';
    } catch (e) {
      if (e.code !== 'SKIPPED') {
        const providerError = e.response?.data?.error;
        const providerType = typeof providerError?.type === 'string' ? providerError.type.slice(0, 60) : 'unknown';
        const providerCode = typeof providerError?.code === 'string' ? providerError.code.slice(0, 60) : 'unknown';
        const message = typeof providerError?.message === 'string' ? providerError.message.toLowerCase() : '';
        const category = /decommissioned|deprecated/.test(message) ? 'model_deprecated'
          : /model/.test(message) ? 'model_request'
          : /temperature/.test(message) ? 'temperature_request'
          : /token/.test(message) ? 'token_request'
          : /json|format/.test(message) ? 'format_request'
          : /permission|billing/.test(message) ? 'account_restriction' : 'other';
        console.warn('Análise IA indisponível:', e.response?.status || e.code || 'upstream', providerType, providerCode, category);
      }
      results.ai_analysis = null;
      results.source_status.groq = e.code === 'SKIPPED' ? 'skipped'
        : !process.env.GROQ_API_KEY ? 'not_configured'
        : e.response?.data?.error?.code === 'model_not_found' ? 'model_unavailable' : 'unavailable';
    }

    res.json(results);
  } catch (err) {
    console.error('Erro no enriquecimento:', err.message);
    res.status(500).json({ error: 'Erro interno ao consultar fontes OSINT.' });
  } finally { release(); }
});

module.exports = router;
